const Pixel = require("../models/pixel");
const User = require("../models/user");

function LeaderboardManager(app) {
    var manager = {
        needsUpdating: true,
        topUsers: null, pixelCounts: null,
        waitingForUpdate: [],
        isUpdating: true,
        lastUpdated: null,

        update: function() {
            var m = this;
            if(!this.needsUpdating) return;
            app.logger.log('排行榜', "开始生成排行榜数据……");
            this.isUpdating = true;
            this.needsUpdating = false;
            var dateBackLastWeek = new Date(new Date().getTime() - (7 * 24 * 60 * 60 * 1000));
            var pixelCounts = {};
            Pixel.find({lastModified: {$gt: dateBackLastWeek}}, {editorID: 1}).cursor().on("data", (pixel) => {
                if (!pixel.editorID) return;
                var uid = pixel.editorID.toString();
                if(!Object.keys(pixelCounts).includes(uid)) pixelCounts[uid] = 0;
                pixelCounts[uid]++;
            }).on("end", () => {
                m.pixelCounts = pixelCounts;
                // Get top users from pixel count, put them in sortable array, sort from greatest to least, then just extract user ID
                m.topUsers = Object.keys(pixelCounts).map((userID) => [userID, pixelCounts[userID]]).sort((a, b) => b[1] - a[1]).map((a) => a[0]);
                // Remove banned and deactivated users
                User.find({_id: { $in: m.topUsers }}, {_id: 1, banned: true, deactivated: true}).then(users => {
                    m.topUsers = users.filter((u) => !u.banned && !u.deactivated).sort((a, b) => m.pixelCounts[b._id] - m.pixelCounts[a._id]).map((u) => u.id);
                    m.isUpdating = false;
                    this.lastUpdated = new Date();
                    // Finish all waiting for leaderboard
                    m.waitingForUpdate.forEach((callback) => m.getInfo(callback));
                    m.waitingForUpdate = [];
                    app.logger.log('排行榜', "排行榜数据生成已完成。");
                }).catch((err) => {
                    app.logger.capture("无法更新排行榜，移除操作失败：" + err);
                    m.topUsers = null;
                    m.pixelCounts = null;
                    m.isUpdating = false;                    
                });
            }).on("error", (err) => {
                app.logger.capture("无法更新排行榜，" + err);
                m.topUsers = null;
                m.pixelCounts = null;
                m.isUpdating = false;
            });
        },

        getInfo: function(callback) {
            if(this.isUpdating) return this.waitingForUpdate.push(callback);
            if(!this.topUsers || !this.pixelCounts) return callback("没有加载排行榜数据", null);
            User.find({_id: { $in: this.topUsers }}).then((users) => {
                var info = { leaderboard: users.sort((a, b) => this.pixelCounts[b._id] - this.pixelCounts[a._id]).map((u) => u.toInfo(app)), lastUpdated: this.lastUpdated };
                callback(null, info);
            }).catch((err) => callback(err, null));
        },

        getUserRank: function(userID) {
            if(!this.topUsers) return null;
            var index = this.topUsers.indexOf(userID);
            return index >= 0 ? index + 1 : null;
        }
    };
    manager.update();
    setInterval(() => manager.update(), 1000 * 60 * 3); // Update the leaderboard every 3 minutes
    return manager;
}

LeaderboardManager.prototype = Object.create(LeaderboardManager.prototype);

module.exports = LeaderboardManager;
