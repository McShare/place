const Jimp = require("jimp");
const Pixel = require("../models/pixel");
const ActionLogger = require("../util/ActionLogger");
const fs = require("fs");
const path = require("path");

const regenerationInterval = 30; // in seconds

function PaintingManager(app) {
    const imageSize = app.config.boardSize;
    const cachedImagePath = path.resolve(app.dataFolder, "cached-board-image.png");
    const temporaryCachedImagePath = path.resolve(app.dataFolder, "cached-board-image.png.tmp");
    return {
        hasImage: false,
        imageHasChanged: false,
        image: null,
        outputImage: null,
        waitingForImages: [],
        lastPixelUpdate: null,
        firstGenerateAfterLoad: false,
        pixelsToPaint: [],
        pixelsToPreserve: null,
        isGenerating: false,

        createNewImage: function() {
            return new Jimp(imageSize, imageSize, 0xFFFFFFFF);
        },

        getStartingImage: async function() {
            try {
                const image = await Jimp.read(cachedImagePath);
                if (image.bitmap.width != imageSize || image.bitmap.height != imageSize) return { image: await this.createNewImage(), canServe: false, skipImmediateCache: false };
                return { image, canServe: true, skipImmediateCache: true };
            } catch (e) {
                return { image: await this.createNewImage(), canServe: false, skipImmediateCache: false };
            }
        },

        loadImageFromDatabase: function() {
            var hasServed = false;
            return new Promise((resolve, reject) => {
                var serveImage = async (image, skipImmediateCache = false) => {
                    this.hasImage = true;
                    this.image = image;
                    this.firstGenerateAfterLoad = true;
                    await this.generateOutputImage(skipImmediateCache);
                    if (!hasServed) resolve(image);
                    hasServed = true;
                }
                this.getStartingImage().then(async ({image, canServe, skipImmediateCache}) => {
                    if (canServe) {
                        app.logger.info("启动", `得到了最初可用的图像，传输中...`);
                        this.pixelsToPreserve = [];
                        await serveImage(image, skipImmediateCache);
                    }
                    Pixel.count({}).then((count) => {
                        var loaded = 0;
                        var progressUpdater = setInterval(() => {
                            app.logger.info("启动", `已加载 ${loaded.toLocaleString()}/${count.toLocaleString()} 个像素，完成度（${Math.round(loaded / count * 100)}%）`);
                        }, 2500);
                        Pixel.find({}).cursor().on("data", (pixel) => {
                            const x = pixel.xPos, y = pixel.yPos;
                            const hex = Jimp.cssColorToHex(pixel.getHexColour());
                            if (x >= 0 && y >= 0 && x < imageSize && y < imageSize) image.setPixelColor(hex, x, y);
                            loaded++;
                        }).on("end", () => {
                            clearInterval(progressUpdater);
                            app.logger.info("启动", `总计从数据库中加载了 ${count.toLocaleString()} 个像素。应用于图像中……`);
                            if (this.pixelsToPreserve) this.pixelsToPreserve.forEach((data) => image.setPixelColor(data.colour, data.x, data.y));
                            this.pixelsToPreserve = null;
                            app.logger.info("启动", `将像素应用于图像。图像传输中...`);
                            serveImage(image);
                        }).on("error", (err) => {
                            this.pixelsToPreserve = null;
                            clearInterval(progressUpdater);
                            reject(err)
                        });
                    });
                }).catch((err) => reject(err));
            });
        },

        getOutputImage: function() {
            return new Promise((resolve, reject) => {
                if (this.outputImage) return resolve({image: this.outputImage, hasChanged: this.imageHasChanged, generated: this.lastPixelUpdate});
                this.waitingForImages.push((err, buffer) => {
                    this.getOutputImage().then((data) => resolve(data)).catch((err) => reject(err));
                })
            })
        },

        generateOutputImage: function(skipImmediateCache = false) {
            var a = this;
            return new Promise((resolve, reject) => {
                if (a.isGenerating) return reject();
                a.isGenerating = true;
                this.waitingForImages.push((err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                })
                if(this.waitingForImages.length == 1) {
                    this.lastPixelUpdate = Math.floor(Date.now() / 1000);
                    this.pixelsToPaint.forEach((data) => {
                        // Paint on live image:
                        this.image.setPixelColor(data.colour, data.x, data.y);
                    });
                    this.pixelsToPaint = [];
                    this.image.getBufferAsync(Jimp.MIME_PNG).then((buffer) => {
                        a.outputImage = buffer;
                        if (!skipImmediateCache) {
                            fs.writeFile(temporaryCachedImagePath, buffer, (err) => {
                                if (err) return app.logger.error("绘制管理", "无法保存缓存画板图像，获取错误：", err);
                                if (fs.existsSync(cachedImagePath)) fs.unlinkSync(cachedImagePath);
                                fs.rename(temporaryCachedImagePath, cachedImagePath, (err) => { 
                                    if (err) return app.logger.error("绘制管理", "无法移动缓存画板图像到适当的位置，获取错误:", err)
                                    app.logger.info("绘制管理", "成功保存缓存的画板图像！");
                                })
                            });
                        }
                        a.waitingForImages.forEach((callback) => callback(null, buffer));
                        a.waitingForImages = [];
                    }).catch((err) => {
                        app.logger.error("无法生成输出图像：", err);
                        a.waitingForImages.forEach((callback) => callback(err, null));
                        a.waitingForImages = [];
                    }).then(() => {
                        a.isGenerating = false;
                        a.imageHasChanged = false;
                        if (a.firstGenerateAfterLoad) {
                            app.websocketServer.broadcast("server_ready");
                            a.firstGenerateAfterLoad = false;
                        }
                    });
                }
            })
        },

        getColourRGB: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        doPaint: function(colour, x, y, user) {
            var a = this;
            return new Promise((resolve, reject) => {
                if (!this.hasImage) return reject({message: "我们的服务器目前正在准备中。请稍候再试一次。", code: "not_ready"});
                if (app.temporaryUserInfo.isUserPlacing(user)) return reject({message: "你不能一次放置多个标题。", code: "attempted_overload"});
                app.temporaryUserInfo.setUserPlacing(user, true);
                // Add to DB:
                user.addPixel(colour, x, y, app, (changed, err) => {
                    app.temporaryUserInfo.setUserPlacing(user, false);
                    if (err) return reject(err);
                    const pixelData = { x: x, y: y, colour: Jimp.rgbaToInt(colour.r, colour.g, colour.b, 255) };
                    a.pixelsToPaint.push(pixelData);
                    if (a.pixelsToPreserve) a.pixelsToPreserve.push(pixelData);
                    a.imageHasChanged = true;
                    // Send notice to all clients:
                    var info = {x: x, y: y, colour: Pixel.getHexFromRGB(colour.r, colour.g, colour.b)};
                    app.pixelNotificationManager.pixelChanged(info);
                    ActionLogger.log(app, "place", user, null, info);
                    app.userActivityController.recordActivity(user);
                    app.leaderboardManager.needsUpdating = true;
                    resolve();
                });
            });
        },

        startTimer: function() {
            setInterval(() => {
                if (this.pixelsToPreserve) return app.logger.log("绘制管理", "不会开始画板图像更新，因为画板图像仍在整体加载中…");
                if (this.isGenerating) return app.logger.log("绘制管理", "不会开始更新画板图像，因为画板图像仍在生成中…");
                if (!this.imageHasChanged) return app.logger.log("绘制管理", "没有更新画板图像，自上次更新以来没有变动。");
                app.logger.log("绘制管理", "开始更新画板图像…");
                this.generateOutputImage();
            }, regenerationInterval * 1000);
        }
    };
}

PaintingManager.prototype = Object.create(PaintingManager.prototype);

module.exports = PaintingManager;
