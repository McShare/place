const User = require("../models/user");
const ActionLogger = require("../util/ActionLogger");

exports.postSelfServeForcedPassword = (req, res, next) => {
    function renderResponse(errorMsg) {
        return req.responseFactory.sendRenderedResponse("public/force-pw-reset", { error: { message: errorMsg || "出现未知错误" } });
    }
    if(!req.user.passwordResetKey) res.redirect("/");
    if(!req.body.password) return renderResponse("请输入您的新密码。");
    if(req.body.password != req.body.confirmPassword) return renderResponse("两个密码不匹配。");
    if(req.user.isOauth) return renderResponse("当您使用外部服务登录时，您不得更改密码。");
    var passwordError = User.getPasswordError(req.body.password);
    if(passwordError) return renderResponse(passwordError);
    req.user.password = req.body.password;
    req.user.passwordResetKey = null;
    req.user.save((err) => {
        if(err) return renderResponse("尝试重置密码时发生未知错误。");
        ActionLogger.log(req.place, "changePassword", req.user);
        res.redirect("/?signedin=1");
    });
};

exports.postSelfServePassword = (req, res, next) => {
    if (!req.body.old || !req.body.new) return res.status(403).json({success: false, error: {message: "需要您的旧密码和新密码。", code: "invalid_parameters"}});
    if(req.user.isOauth) return res.status(400).json({success: false, error: {message: "当您使用外部服务登录时，您不得更改密码。", code: "regular_account_only"}});
    req.user.comparePassword(req.body.old, (error, match) => {
        if(!match || error) return res.status(401).json({success: false, error: {message: "您输入的旧密码不正确。", code: "incorrect_password"}});
        var passwordError = User.getPasswordError(req.body.new);
        if(passwordError) return res.status(400).json({success: false, error: {message: passwordError, code: "password_validation"}});
        req.user.password = req.body.new;
        req.user.save().then(() => {
            ActionLogger.log(req.place, "changePassword", req.user);
            return res.json({success: true});
        }).catch((err) => {
            req.place.reportError("密码修改错误：" + err);
            return res.status(500).json({success: false});
        });
    });
};