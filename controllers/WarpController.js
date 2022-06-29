const Warp = require("../models/warp");

exports.getWarps = (req, res, next) => {
    Warp.find({userID: req.user.id}).then((warps) => {
        res.json({success: true, warps: warps.sort((a, b) => b.creationDate - a.creationDate).map((w) => w.toInfo())});
    }).catch((err) => {
        req.place.logger.error("无法为用户获取标记：" + err);
        res.json({success: false, error: {message: "尝试检索标记时发生未知错误。", code: "server_error"}});
    });
};

exports.postWarp = (req, res, next) => {
    if(!req.body.x || !req.body.y || !req.body.name) return res.status(400).json({success: false, error: {message: "您没有指定用于创建标记的坐标或名称。", code: "bad_request"}});
    Warp.createWarp(req.body.x, req.body.y, req.body.name, req.user.id, (warp, err) => {
        if(!warp) return res.status(400).json({success: false, error: err});
        res.json({success: true, warp: warp.toInfo()});
    });
};

exports.getWarp = (req, res, next) => {
    if(!req.params.id) return res.status(400).json({success: false, error: {message: "您没有指定要检索的标记。", code: "bad_request"}});
    Warp.findOne({userID: req.user.id, id: req.params.id}).then((warp) => {
        if(!warp) return res.status(404).json({success: false, error: {message: "不存在具有该 ID 的可访问标记。", code: "not_found"}});
        res.json({success: true, warp: warp.toInfo()});
    }).catch((err) => res.status(500).json({success: false}));
};

exports.deleteWarp = (req, res, next) => {
    if(!req.params.id) return res.status(400).json({success: false, error: {message: "您没有指定要删除的标记。", code: "bad_request"}});
    Warp.findOneAndRemove({userID: req.user.id, _id: req.params.id}).then((warp) => {
        if(!warp) return res.status(404).json({success: false, error: {message: "不存在具有该 ID 的可访问标记。", code: "not_found"}});
        res.json({success: true});
    }).catch((err) => res.status(500).json({success: false}));
};