# Dynastic Place

An open-source [r/place](https://reddit.com/r/place) alternative, made by [Dynastic](https://dynastic.co). Want to chat? Join our [Discord server](https://discord.gg/CgC8FTg).

## The state of this project
This project is no longer actively maintained and may not be the best choice for a public service. We welcome contributions and new maintainers, but it can unfortunately no longer be a priority for us. In general, it uses some misguided techniques from formerly-beginner developers and portions may be somewhat hard to maintain due to this (however, any help fixing that are super appreciated).

It's been really cool to see people use this project, whether for their artful creations on [our copy, canvas.place](https://canvas.place), or to run their own special-purpose instances (for example, we heard of some Microsoft interns using it, which was pretty cool) and we're proud of the work everyone put into it.

---

## Getting started

These instructions will help you get an instance of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project in a production environment.

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

It's recommended that you use a reverse proxy rather than running Place direcly on port 80. For this, we recommend Nginx. Below is our nginx configuration:

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

Please make a [pull request](/https://github.com/dynastic/place/pulls). Before making a pull request, come and chat with us on [Discord](https://discord.gg/CgC8FTg) in #contributors.

Ensure that all code lints successfully - we have CI that requires this.

### Roadmap

Check our currently open issues for an idea on what to work on!

## Authors

* [Ayden Panhuyzen](https://ayden.dev) - Core Developer
* [Jamie Bishop](https://twitter.com/jamiebishop123) - Core Developer
* [Eric Rabil](https://twitter.com/ericrabil) - Core Developer

Also see the list of [contributors](https://www.github.com/dynastic/place/contributors) who generously donated their time and skills to this project to to make it what it is.

## License

Dynastic Place is licensed under a [modified version of the APGL-3.0 license](https://github.com/dynastic/place/blob/master/LICENSE). Please see it for details.

## Acknowledgments

Thank you to:
* Reddit, for the [original Place](https://reddit.com/r/place).
* Our community for making it worthwhile.
