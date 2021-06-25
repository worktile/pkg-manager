---
title: "Git Publish"
order: 50
---


### 使用说明

```
wpm git-publish
```

运行以上命令，会执行以下步骤：

1. 创建临时文件夹并拷贝 artifacts 到临时文件夹
1. 初始化临时文件夹的 Git 并提交到本地 Git
1. 创建一个 Release Tag
1. 推送临时文件夹和 Tag 到远程分支

### 选项

-   [`--source`](#--source)
-   [`--name`](#--name)
-   [`--protocol`](#--protocol)
-   [`--provider`](#--provider)
-   [`--organization`](#--organization)
-   [`--dry-run`](#--dry-run)

### `--source`

需要同步到 Repo 的制品文件夹，一般是 built 文件夹

### `--name`

发布类库在git上仓储的名称，比如你发布的仓储叫 `example` ，那么 name 就需要传 `example`

### `--protocol`

Git 传输协议，支持 `https` 和 `ssh`, 默认是 `ssh`

### `--provider`

发布仓储的目标服务，目前支持 `git`、`github`、`gitlab`

### `--organization`

组织或者用户在 provider 上的名称，会根据 `provider`、`protocol`、`name` 生成 Remote URL。

```
provider: github
protocol: ssh
name: example
organization: worktile

生成的 Remote URL: git@github.com:worktile/example.git
```

```
provider: github
protocol: https
name: example
organization: worktile

生成的 Remote URL: https://github.com/worktile/example
```