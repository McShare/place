const DataModelManager = require("../util/DataModelManager");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");
const Pixel = require("./pixel");
const Access = require("./access");
const dataTables = require("mongoose-datatables");
const TOSManager = require("../util/TOSManager");

var UserSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    lastPlace: {
        type: Date,
        required: false
    },
    isOauth: {
        type: Boolean,
        required: false
    },
    passwordResetKey: {
        type: String,
        required: false
    },
    usernameSet: {
        type: Boolean,
        required: true,
        default: true
    },
    OAuthID: {
        type: String,
        required: false
    },
    OAuthName: {
        type: String,
        required: false
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    },
    moderator: {
        type: Boolean,
        required: true,
        default: false
    },
    tester: {
        type: Boolean,
        required: false,
        default: false
    },
    placeCount: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} 不是有效整数"
        },
        default: 0
    },
    banned: {
        type: Boolean,
        required: true,
        default: false
    },
    deactivated: {
        type: Boolean,
        required: true,
        default: false
    },
    userNotes: {
        type: String,
        required: false,
        default: ""
    },
    lastAcceptedTOSRevision: {
        type: String,
        required: false
    },
    totpSecret: {
        type: String,
        required: false
    },
    latestChangelogFetch: {
        type: String,
        required: false
    },
    changelogOptedOut: {
        type: Boolean,
        required: false,
        default: false
    },
    deletionDate: {
        type: Date,
        required: false
    }
});

UserSchema.pre("save", function(next) {
    let user = this;
    if (this.isModified("password") || this.isNew) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

UserSchema.methods.comparePassword = function(passwd, cb) {
    bcrypt.compare(passwd, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
}

UserSchema.methods.toInfo = function(app = null) {
    var info = {
        id: this.id,
        username: this.name,
        isOauth: this.isOauth || false,
        creationDate: this.creationDate,
        admin: this.admin,
        moderator: this.moderator,
        statistics: {
            totalPlaces: this.placeCount,
            lastPlace: this.lastPlace
        },
        banned: this.banned,
        deactivated: this.deactivated,
        markedForDeletion: this.isMarkedForDeletion(),
        badges: this.getBadges(app)
    };
    if (app) {
        info.statistics.placesThisWeek = app.leaderboardManager.pixelCounts[this.id];
        info.statistics.leaderboardRank = app.leaderboardManager.getUserRank(this.id);
        info.statistics.lastSeenActively = app.userActivityController.userActivityTimes[this.id];
    }
    if (typeof info.statistics.placesThisWeek === "undefined") info.statistics.placesThisWeek = null;
    if (typeof info.statistics.leaderboardRank === "undefined") info.statistics.leaderboardRank = null;
    return info;
}

UserSchema.methods.getInfo = function(app = null, getPixelInfo = true) {
    return new Promise((resolve, reject) => {
        var info = this.toInfo(app);
        if (getPixelInfo) {
            this.getLatestAvailablePixel().then((pixel) => {
                info.latestPixel = pixel;
                resolve(info);
            }).catch((err) => resolve(info));
        } else {
            return resolve(info);
        }
    });
}

UserSchema.methods.loginError = function() {
    if (this.banned === true) return {
        message: "由于违反规则，您被禁止使用此服务。",
        code: "banned"
    };
    return null;
}

UserSchema.methods.markForDeletion = function() {
    this.deactivated = true;
    var date = new Date();
    date.setDate(date.getDate() + 7);
    this.deletionDate = date;
    return this.save();
}

UserSchema.methods.isMarkedForDeletion = function() {
    return this.deletionDate != null
}

UserSchema.methods.setUserName = function(username, callback, usernameSet) {
    if (!UserSchema.statics.isValidUsername(username)) return callback({
        message: "无法使用该用户名。用户名的长度必须为 3-20 个字符，并且只能由字母、数字、下划线和破折号组成。",
        code: "username_taken",
        intCode: 400
    });
    this.name = username;
    this.usernameSet = true;
    this.save(function(err) {
        if (err) return callback({
            message: "该用户名已经存在。",
            code: "username_taken",
            intCode: 400
        });
        return callback();
    });
}

UserSchema.methods.recordAccess = function(req) {
    return Access.recordAccess(req, this.id);
}

UserSchema.methods.getUniqueIPsAndUserAgents = function() {
    return Access.getUniqueIPsAndUserAgentsForUser(this);
}

UserSchema.statics.findByUsername = function(username, callback = null) {
    return this.findOne({
        name: {
            $regex: new RegExp(["^", username.toLowerCase(), "$"].join(""), "i")
        }
    }, callback)
}

UserSchema.statics.getPasswordError = function(password) {
    return null; // temp fix signups, not good
    // return password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])$/) && password.length >= 8 ? null : "That password cannot be used. Passwords are required to contain at least one digit, one uppercase letter, one lowercase letter, and be at least 8 characters in length.";
}

UserSchema.statics.register = function(username, password, app, callback, OAuthID, OAuthName) {
    if (!OAuthID && !this.isValidUsername(username)) return callback(null, {
        message: "无法使用该用户名。用户名的长度必须为 3-20 个字符，并且只能由字母、数字、下划线和破折号组成。",
        code: "username_taken",
        intCode: 400
    });
    var passwordError = this.getPasswordError(password);
    if(passwordError) return callback(null, {
        message: passwordError,
        code: "password_validation",
        intCode: 400
    });

    var Schema = this;

    function continueWithRegistration() {
        // ghetto af boi
        let newUser = Schema({
            name: username,
            usernameSet: !OAuthID, // Opposite of OAuth will give us false which is what we need
            password: password,
            creationDate: Date(),
            admin: false,
            isOauth: !!OAuthID,
            OAuthID: OAuthID,
            OAuthName: OAuthName,
            latestChangelogFetch: app.changelogManager.getLatestChangelogVersion()
        });

        TOSManager.hasTOS().then((hasTOS) => {
            if (!hasTOS) newUser.lastAcceptedTOSRevision = null;
            else TOSManager.getCurrentTOSVersion().then((version) => {
                newUser.lastAcceptedTOSRevision = version;
            })
        });

        // Save the user
        newUser.save(function(err) {
            if (err) return callback(null, {
                message: "具有该用户名的帐户已存在.",
                code: "username_taken",
                intCode: 400
            });
            require("../util/ActionLogger").log(app, "signUp", newUser);
            return callback(newUser, null)
        });
    }

    if (!username) continueWithRegistration()
    else {
        this.findByUsername(username, (err, user) => {
            if (!user) continueWithRegistration();
            else callback(null, {
                message: "具有该用户名的帐户已存在。",
                code: "username_taken",
                intCode: 400
            });
        });
    }
}

UserSchema.statics.isValidUsername = function(username) {
    return /^[a-zA-Z0-9-_]{3,20}$/.test(username);
}

UserSchema.methods.addPixel = function(colour, x, y, app, callback) {
    var user = this;
    Pixel.addPixel(colour, x, y, this.id, app, (changed, error) => {
        if (changed === null) return callback(null, error);
        if (changed) {
            user.lastPlace = new Date();
            user.placeCount++;
            user.save((err) => {
                if (err) return callback(null, {
                    message: "尝试放置该像素时发生未知错误。"
                });
                return callback(changed, null);
            });
        } else callback(changed, null);
    });
}

UserSchema.methods.getPlaceSecondsRemaining = function(app) {
    if (this.admin) return 0;
    if (this.lastPlace) {
        let current = new Date().getTime();
        let place = this.lastPlace.getTime();
        // Seconds since last place
        let diffSeconds = (current - place) / 1000;
        // Seconds before can place again
        let remainSeconds = Math.min(app.config.placeTimeout, Math.max(0, app.config.placeTimeout - diffSeconds));
        return Math.ceil(remainSeconds);
    }
    return 0;
}

UserSchema.methods.canPlace = function(app) {
    return this.getPlaceSecondsRemaining(app) <= 0;
}

UserSchema.methods.findSimilarIPUsers = function() {
    return new Promise((resolve, reject) => {
        Access.findSimilarIPUserIDs(this).then((userIDs) => {
            this.model("User").find({
                _id: {
                    $in: userIDs
                }
            }).then(resolve).catch(reject);
        }).catch(reject);
    });
}

UserSchema.methods.getLatestAvailablePixel = function() {
    return new Promise((resolve, reject) => {
        Pixel.findOne({
            editorID: this.id
        }, {}, {
            sort: {
                lastModified: -1
            }
        }, function(err, pixel) {
            if (err || !pixel) return resolve(null);
            var info = pixel.toInfo();
            info.isLatest = pixel ? ~((pixel.lastModified - this.lastPlace) / 1000) <= 3 : false;
            resolve(info);
        });
    });
}

UserSchema.methods.canPerformActionsOnUser = function(user) {
    var canTouchUser = (this.moderator && !(user.moderator || user.admin)) || (this.admin && !user.admin);
    return this._id != user._id && canTouchUser;
}

UserSchema.methods.getUsernameInitials = function() {
    function getInitials(string) {
        var output = "";
        var mustBeUppercase = false;
        var lastCharacterUsed = false;
        for (var i = 0; i < string.length; i++) {
            // Limit to three characters
            if (output.length >= 3) break;
            // Check if this character is uppercase, and add to string if so
            if ((string[i].toUpperCase() == string[i] || !mustBeUppercase) && string[i].match(mustBeUppercase ? /[a-z]/i : /[a-z0-9]/i)) {
                // Don't allow subsequent matches
                if (!lastCharacterUsed) output += string[i].toUpperCase();
                lastCharacterUsed = true;
            } else {
                lastCharacterUsed = false;
            }
            mustBeUppercase = true;
            // Check if this character is a separator, and skip needing to be uppercase if so
            if ([",", " ", "_", "-"].indexOf(string[i]) > -1) mustBeUppercase = false;
        }
        return output;
    }
    return getInitials(this.name);
}

UserSchema.statics.getPubliclyAvailableUserInfo = function(userID, overrideDataAccess = false, app = null, getPixelInfo = true) {
    return new Promise((resolve, reject) => {
        var info = {};
        function returnInfo(error) {
            info.userError = error;
            resolve(info);
        }
        var continueWithUser = (user) => {
            if (!user) return returnInfo("delete");
            if (!overrideDataAccess && user.banned) return returnInfo("ban");
            else if (!overrideDataAccess && user.isMarkedForDeletion()) return returnInfo("deleted");
            else if (!overrideDataAccess && user.deactivated) return returnInfo("deactivated");
            user.getInfo(app, getPixelInfo).then((userInfo) => {
                info.user = userInfo;
                if(overrideDataAccess) {
                    info.user.isOauth = user.isOauth;
                    info.user.hasTOTP = user.twoFactorAuthEnabled();
                }
                resolve(info);
            }).catch((err) => returnInfo("delete"));
        }
        if(!userID) return continueWithUser(null);
        this.findById(userID).then(continueWithUser).catch((err) => {
            app.logger.capture("获取用户信息时出错：" + err, { user: { _id: userID } });
            returnInfo("delete");
        });
    });
}

UserSchema.methods.getMustAcceptTOS = function() {
    return new Promise((resolve, reject) => {
        TOSManager.hasTOS().then((hasTOS) => {
            if(!hasTOS) return resolve(false);
            if(!this.lastAcceptedTOSRevision) return resolve(true);
            TOSManager.getCurrentTOSVersion().then((version) => {
                resolve(this.lastAcceptedTOSRevision != version);
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });
}

UserSchema.methods.twoFactorAuthEnabled = function() {
    return this.totpSecret != null;
}

UserSchema.methods.updateTOSAcceptance = function() {
    return new Promise((resolve, reject) => {
        TOSManager.hasTOS().then((hasTOS) => {
            if(!hasTOS) {
                this.lastAcceptedTOSRevision = null;
                resolve();
            }
            TOSManager.getCurrentTOSVersion().then((version) => {
                this.lastAcceptedTOSRevision = version;
                resolve();
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });
}

UserSchema.statics.isTOSAgreementCurrentlyRequired = function() {
    return TOSManager.hasTOS();
}

UserSchema.methods.canPlaceCustomColours = function() {
    return this.admin || this.moderator;
}

UserSchema.methods.canPlaceColour = function(hex, app) {
    if(this.canPlaceCustomColours()) return true;
    return app.colours.includes(hex.toUpperCase());
}

UserSchema.methods.getFeatureAvailability = function() {
    return {
        canPlaceCustomColours: this.canPlaceCustomColours(),
        hasTemplatesExperiment: this.admin || this.tester || false
    };
}

UserSchema.methods.getBadges = function(app) {
    var badges = [];
    if(app) {
        var rank = app.leaderboardManager.getUserRank(this.id);
        if(rank) badges.push({ text: `排名 #${rank.toLocaleString()}`, style: rank <= 5 ? "danger" : "info", isRanking: true, lowPriority: true, isLowRanking: rank > 25 });
    }
    if(this.banned) badges.push({ text: "封禁", style: "danger", title: "该用户因违反规定而被封禁。" });
    else if(this.isMarkedForDeletion()) badges.push({ text: "删除", style: "danger", title: "此用户选择删除他们的帐户。" });
    else if(this.deactivated) badges.push({ text: "停用", style: "danger", title: "此用户选择停用他们的帐户。" });
    if(this.admin) badges.push({ text: "管理员", style: "warning", inlineBefore: true, title: "此用户是管理员。" });
    else if(this.moderator) badges.push({ text: "版主", shortText: "Mod", style: "warning", inlineBefore: true, title: "该用户是版主。" });
    return badges;
}

UserSchema.plugin(dataTables, {
    totalKey: "recordsFiltered",
});

UserSchema.methods.getUserData = function() {
    return new Promise((resolve, reject) => {
        var user = this.toInfo();
        Promise.all([
            Access.find({ userID: this.id }),
            Pixel.find({ editorID: this.id }),
            require("./action").find({ $or: [ { performingUserID: this.id }, { moderatingUserID: this.id } ] }),
            require("./warp").find({ userID: this.id }),
            require("./chatMessage").find({ userID: this.id })
        ]).then((result) => {
            var accesses = result[0].map((a) => a.toInfo(false));
            var pixels = result[1].map((p) => p.toInfo(false));
            var actions = result[2].map((a) => a.toInfo(false));
            var warps = result[3].map((w) => w.toInfo());
            var chatMessages = result[4].map((m) => m.toInfo(false));
            resolve({ user: user, accesses: accesses, pixels: pixels, actions: actions, warps: warps, chatMessages: chatMessages });
        });
    });
}

module.exports = DataModelManager.registerModel("User", UserSchema);
