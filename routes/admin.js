const express = require("express");
const User = require("../models/user");

function AdminRouter(app) {
    let router = express.Router()
    
    router.use(function(req, res, next) {
        // Don't allow anything if user has forced pw reset or OAuth not configured
        if(req.user && ((!req.user.usernameSet && req.user.OAuthName) || req.user.passwordResetKey)) res.redirect("/");
        next(); // Otherwise, carry on...
    });

    router.get("/", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/dashboard");
    });

    router.get("/actions", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/actions", {title: "最近操作", modOnly: false});
    });

    router.get("/log", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/actions", {title: "版主日志", modOnly: true});
    });

    router.get("/users", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/users");
    });

    router.get("/users/similar/:userID", app.modMiddleware, function(req, res) {
        function renderError(msg = "发生未知错误。") {
            req.responseFactory.sendRenderedResponse("admin/similar_users_error", { errorMsg: msg });
        }
        if(!req.params.userID || req.params.userID == "") return renderError("您没有指定要查找的用户ID。");
        User.findById(req.params.userID).then((user) => {
            if(!req.user.canPerformActionsOnUser(user)) return renderError("您不能对该用户执行操作。");
            req.responseFactory.sendRenderedResponse("admin/similar_users", { target: user });
        }).catch((err) => renderError("无法通过该ID找到用户。"));
    });

    router.get("/pixels", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/coming_soon");
    });

    router.get("/reports", app.modMiddleware, function(req, res) {
        req.responseFactory.sendRenderedResponse("admin/coming_soon");
    });

    return router;
}

AdminRouter.prototype = Object.create(AdminRouter.prototype);

module.exports = AdminRouter;
