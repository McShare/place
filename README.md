# Dynastic Place

一个开源的 [r/place](https://reddit.com/r/place) 替代品，由 [Dynastic](https://dynastic.co) 创作。

## 这个项目的状态
这个项目已不再积极维护，可能不是公共服务的最佳选择。我们欢迎贡献和新的维护者，但不幸的是，这不再是我们的优先事项。一般来说，它使用了一些来自前初级开发人员的错误技术，因此有些部分可能很难维护（然而，任何修复的帮助都是非常感谢的）。
看到人们使用这个项目真的很酷，无论是他们在[我们的copy, canvas.place](https://canvas.place)上的艺术创作，还是运行他们自己的特殊用途实例（例如，我们听说一些微软实习生使用它，这是非常酷的），我们为每个人投入的工作感到自豪。

---

## 入门指南

这些说明将帮助您在本地机器上启动并运行项目实例，以用于开发和测试。有关如何在生产环境中部署项目的说明，请参见部署。

### 依赖

* Node 8 or **更高版本**
* [MongoDB](https://www.mongodb.com) *（抱歉）*
* [Yarn包管理](https://www.yarnpkg.com)
* 互联网连接

### 安装

1. 复制 `config/config.example.js` 为 `config/config.js`。
2. 通过修改这些值，按照您认为合适的方式配置Place服务器。
   > **重要：** 您必须在Secret字段中设置一个强大的密码，以防止cookie欺骗攻击，这可能导致对您的网站的攻击!
3. 运行 `yarn install` 以安装依赖。
4. 在MongoDB实例上创建一个新数据库，并将其填写在 `config/config.js` 内。
5. 最终，运行 `node app.js` 以启动服务器。

### Production Deployment

**Ensure `/var/log/place` exists, and the app can write to it.**

Please only host your own copy if you are willing to abide by the clearly defined [license](https://github.com/dynastic/place/blob/master/LICENSE). **Failure to comply with the listed terms will result in legal action.**

部署时，建议使用守护进程保持服务器处于活动状态。 我们使用 `screen`，官方使用 `pm2`，但其实任何守护程序实用程序，如' forever '，应该都可以。

#### 使用 pm2

1. 获取 [pm2](http://pm2.keymetrics.io) 通过运行 `npm i -g pm2` 进行**全局安装**。
2. 安装了pm2之后，启动Place只需要简单的运行 `pm2 start app.js --name=Place`。

您可以使用 `pm2 show Place` 来管理你的pm2实例

您可以指示pm2保存当前运行的pm2实例，并在引导时使用 `pm2 startup` 启动它们。

#### Other notes

建议您使用反向代理而不是直接在端口 80 上运行 Place。为此，我们推荐使用 Nginx。下面是我们的nginx配置：

```nginx
server {
        listen 80;
        listen [::]:80;

        server_name canvas.place;

        include /etc/nginx/global/*;

        error_page 502 /502-error.html;

        location = /502-error.html {
                root   /var/www/place.dynastic.co;
                internal;
        }

        location / {
                proxy_pass http://127.0.0.1:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
        }

}
```

__To make yourself admin:__

1. 在Mongo服务器中运行 `mongo` （或者 `mongosh`）
2. 输入 `use place`
3. 粘贴下列指令
```
db.users.updateOne(
{name: '你的用户名'},
{$set: {admin: true}
})
```

## Contributing 

请提出 [拉取请求](/https://github.com/dynastic/place/pulls)。在提出拉取请求之前，请在 [Discord](https://discord.gg/CgC8FTg) 上与我们聊天 #contributors.

确保所有代码 lints 成功 -我们有需要这个的 CI。

### 路线图

查看我们当前未解决的问题，了解如何处理！

## 作者

* [Ayden Panhuyzen](https://ayden.dev) - 核心开发者
* [Jamie Bishop](https://twitter.com/jamiebishop123) - 核心开发者
* [Eric Rabil](https://twitter.com/ericrabil) - 核心开发者

另请参阅 [贡献者](https://www.github.com/dynastic/place/contributors) 的列表，他们慷慨地将时间和技能捐赠给该项目以使其成为现实。

## License

Dynastic Place 根据 [APGL-3.0 许可的修改版本](https://github.com/dynastic/place/blob/master/LICENSE) 获得许可。详情请参阅。

## 致谢

谢谢：
*Reddit，用于 [原始place](https://reddit.com/r/place)。
*我们的社区使它值得。
