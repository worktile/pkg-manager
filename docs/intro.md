---
title: "介绍"
order: 10
---

`@worktile/pkg-manager` 主要提供了 `wpm` 命令行工具，包含以下子命令：

- `wpm release` 主要提供修改版本号、生成更新日志、创建 Release 分支、提交代码到远程分支的功能
- `wpm publish` 主要提供发布版本（只有类库项目才会需要）和创建Tag推送到远程仓储
- `wpm git-publish` 主要提供发布代码到 GitHub 仓储的功能，目前推荐使用 GitHub Package 功能进行私有包管理

## 安装

执行如下命令安装`pkg-manager`模块
```bash
$ npm i @worktile/pkg-manager --save
// or
$ yarn add @worktile/pkg-manager
```

安装后在 package.json 中添加如下脚本：

```
{
  scripts: {
    ...
    "release": "wpm release",
    "pub": "wpm publish"
    ...
  }  
}
```


## 配置

每个子命令都会有不同的参数设置，可以执行命令的时候传参 `wpm release --skip.bump`，也可以在 .wpmrc 文件中配置。

```
module.exports = {
    allowBranch: ['master', 'v0.*'],
    bumpFiles: [
        'package.json',
        'package-lock.json',
        {
            filename: './VERSION.txt',
            type: 'plain-text'
        },
        {
            filename: './src/version.json',
            type: 'json'
        },
        {
            filename: './src/version.ts',
            type: 'code'
        }
    ],
    skip: {
        changelog: true
    },
    commitAll: true,
    hooks: {
        prepublish: 'yarn workspaces run build',
        postpublish: 'lerna publish from-git',
        postreleaseBranch: 'lerna version {{version}} && git add .'
    }
};
```