const Action = require("../models/action");

// Below are the possible actions
var actions = {
    // Normal user actions
    signIn: {
        displayName: "登录",
        inlineDisplayName: "已登陆",
        category: "auth"
    },
    signUp: {
        displayName: "注册",
        inlineDisplayName: "已注册",
        category: "auth"
    },
    signOut: {
        displayName: "登出",
        inlineDisplayName: "已登出",
        category: "auth"
    },
    changePassword: {
        displayName: "更改密码",
        inlineDisplayName: "密码已更改",
        category: "account"
    },
    deactivate: {
        displayName: "禁用账户",
        inlineDisplayName: "账户已禁用",
        category: "account"
    },
    delete: {
        displayName: "Delete own account",
        inlineDisplayName: "Marked their account for deletion",
        category: "account"
    },
    place: {
        displayName: "绘制像素",
        inlineDisplayName: "绘制了一个像素",
        category: "gameplay",
        hideInfo: true,
        sentenceEndTextFormatting: " 在 <a href=\"/#x=${x}&y=${y}\">(${x.toLocaleString()}, ${y.toLocaleString()})</a>"
    },
    sendChatMessage: {
        displayName: "发送交流信息",
        inlineDisplayName: "发送了一条交流信息",
        category: "chat"
    },
    // Moderation actions
    ban: {
        displayName: "禁止用户",
        inlineDisplayName: "禁止了用户",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    unban: {
        displayName: "解禁用户",
        inlineDisplayName: "解禁了用户",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    activateOther: {
        displayName: "激活账户",
        inlineDisplayName: "激活了账户",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    deactivateOther: {
        displayName: "停用账户",
        inlineDisplayName: "停用了账户",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    updateNotes: {
        displayName: "Update user notes",
        inlineDisplayName: "Updated user notes for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    disableTOTP: {
        displayName: "Disable two-factor authentication",
        inlineDisplayName: "Disabled two-factor authentication for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    forcePWReset: {
        displayName: "Force a password reset",
        inlineDisplayName: "Forced a password reset for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    // Administrative actions
    deleteAccount: {
        displayName: "删除账户",
        inlineDisplayName: "已删除",
        category: "administrative",
        isPrivileged: true
    },
    giveModerator: {
        displayName: "给予版主",
        inlineDisplayName: "赋予了版主权限",
        category: "administrative",
        requiresModerator: true,
        isPrivileged: true
    },
    removeModerator: {
        displayName: "移除版主",
        inlineDisplayName: "移除了版主权限",
        category: "administrative",
        requiresModerator: true,
        isPrivileged: true
    },
    reloadConfig: {
        displayName: "重载网站配置",
        inlineDisplayName: "重载了网站的配置",
        category: "administrative",
        isPrivileged: true
    },
    refreshClients: {
        displayName: "刷新全部客户端",
        inlineDisplayName: "刷新了所有客户端",
        category: "administrative",
        isPrivileged: true
    },
    sendBroadcast: {
        displayName: "向所有用户广播消息",
        inlineDisplayName: "向所有用户广播了一条消息",
        category: "administrative",
        isPrivileged: true
    }
};

var actionLogger = {
    log: function(app, actionID, performingUser, moderatingUser = null, info = null) {
        Action({
            actionID: actionID,
            performingUserID: performingUser.id,
            moderatingUserID: moderatingUser ? moderatingUser.id : null,
            info: info,
            date: new Date()
        }).save().catch((err) => app.reportError("试图记录操作时发生错误：" + err));
    },

    infoForAction: function(actionID) {
        return actions[actionID];
    },

    getAllActionInfo: function() {
        return actions;
    },

    actionIDsToRetrieve: function(modOnly = false) {
        return Object.keys(actions).filter((a) => modOnly ? actions[a].isPrivileged : true);
    }
};

module.exports = actionLogger;
