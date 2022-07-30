const path = require("path");
const fs = require("fs");
const marked = require("./Markdown")

const changelogsPath = path.join(__dirname, "..", "changelogs");

class ChangelogManager {
    constructor(app) {
        this.app = app;
        this.changelogs = [];
        this._fetchChangelogs();
    }

    _fetchChangelogs() {
        if(this.app.config.enableChangelogs) {
            this.app.logger.info("变更日志", `开始加载变更日志……`);
            fs.readdir(changelogsPath, (err, files) => {
                var changelogs = [];
                if(err) return this.app.logger.error("变更日志", "无法加载变更日志：" + err);
                files.filter((name) => name.split(".").pop() == "json").forEach((name) => {
                    var fullPath = path.join(changelogsPath, name);
                    var changelogData = require(fullPath);
                    if(changelogData["date"] && changelogData["text"]) {
                        var version = {
                            version: Number.parseInt(name),
                            html: marked(changelogData["text"]),
                            date: changelogData["date"]
                        };
                        changelogs.push(version);
                    }
                });
                this.changelogs = changelogs.sort((a, b) => b.version - a.version);
                this.app.logger.info("变更日志", `已成功加载 ${changelogs.length} 个变更日志！`);
                setTimeout(() => this._fetchChangelogs(), 30000);
            });
        } else {
            this.changelogs = [];
            setTimeout(() => this._fetchChangelogs(), 30000);
        }
    }

    // Convenience Functions:

    getChangelogs() {
        return this.changelogs;
    }
    
    getChangelogCount() {
        return this.changelogs.length;
    }

    getLatestChangelog() {
        return this.getChangelogs()[0];
    }

    getLatestChangelogVersion() {
        return this.getChangelogVersions()[0];
    }

    getChangelogVersions() {
        return this.getChangelogs().map((c) => c.version);
    }
    
    getChangelog(version) {
        return this.getChangelogs().find((c) => c.version == version);
    }
    
    getChangelogsSince(version) {
        return this.getChangelogs().filter((c) => c.version > version);
    }
    
    getChangelogsBefore(version) {
        return this.getChangelogs().filter((c) => c.version < version);
    }

    getPaginationInfo(version, forceDisableNext = false) {
        if(!version) return {};
        var versions = this.getChangelogVersions();
        var previous = versions.filter((c) => c < version)[0];
        var next = forceDisableNext ? null : versions.filter((c) => c > version).slice(-1).pop();
        return {next: next, previous: previous}
    }
}

ChangelogManager.prototype = Object.create(ChangelogManager.prototype);

module.exports = ChangelogManager;