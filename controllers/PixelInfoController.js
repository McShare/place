const Pixel = require("../models/pixel")

exports.getAPIPixelInfo = (req, res, next) => {
    function fail(err) {
        req.place.reportError("像素数据检索错误：" + err);
        return res.status(500).json({ success: false, error: { message: "尝试查找有关该像素的信息时出错。" } })
    }
    if(!req.query.x || !req.query.y) return res.status(400).json( { success: false, error: { message: "您没有指定要查找的像素的坐标。", code: "bad_request" } });
    var overrideDataAccess = req.user && (req.user.moderator || req.user.admin);
    Pixel.find({xPos: req.query.x, yPos: req.query.y}).then((pixels) => {
        if (pixels.length <= 0) return res.json({ success: true, pixel: null });
        pixels[0].getInfo(overrideDataAccess, req.place).then((info) => {
            res.json({ success: true, pixel: info })
        }).catch((err) => fail(err));
    }).catch((err) => fail(err));
};