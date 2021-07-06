---
title: "Release"
order: 30
---

Release 提供修改版本号，创建 Release 分支，生成更新日志，提交到远程分支等功能。
### 使用说明

```
wpm release 1.0.1 # 明确版本号
wpm release patch # 语义化版本关键字: `patch`、`minor`、`major`
wpm release       # 通过命令行提示选择版本
```

运行以上命令，会执行以下步骤：
1. 切换到允许发布的分支，并列出当前版本和最后一次的 Tag
1. 提示你选择一个新版本
1. 创建一个 release 分支
1. 修改包元数据（版本号）并生成更新日志
1. 提交修改到 release 分支
1. 推送代码到远程分支

### 语义化升级版本 `bump`

```sh
wpm release [major | minor | patch | premajor | preminor | prepatch | prerelease]
# uses the next semantic version(s) value and this skips `Select a new version for...` prompt
```
当指定了语义化升级版本后，`wpm release` 命令会忽略选择版本的步骤并且通过指定关键字[升级版本](https://github.com/npm/node-semver#functions)

### 选项

-   `--allow-branch`
-   `--dry-run`
-   `--skip`
-   `--release-branch-format`
-   `--issue-url-format`
-   `--bump-files`
-   `--infile`
-   `--preset`
-   `--commit-all`
-   `--hooks`

### `--allow-branch <glob>`
允许执行 Release 的分支白名单，通过 glob 规则配置，默认为：`["master", "develop"]`，最简单也是推荐的做法是在`.wpmrc.js`配置文件中配置，但是通过 CLI 选项可以覆盖。

```json
{
  "allowBranch": ["master", "feature/*"]
}
```

### `--dry-run`

```sh
wpm release --dry-run
wpm publish --dry-run
```
通过 `--dry-run` 执行会让我们看到命令行的执行情况，但是不会修改文件和提交到 Git，主要供测试配置是否正确使用。 

### `--skip`
跳过内置的生命周期步骤 (branch, bump, changelog, commit, push, tag)，也可以通过在 package.json 和 .rc 配置文件中设置。

`release` 命令包含: branch, bump, changelog, commit, push
`publish` 包含: tag, push

`--skip.branch --skip.bump`

```
// package.json
{
  "wpm": {
    "skip": {
      "bump": true
    }
  }
}
```

```
// .wtpmrc.js
module.exports = {
   "skip": {
      "bump": true
    }
}
```

### `--release-branch-format`

创建 Release 分支的命名格式，默认：`release-v{{version}}`

### `--tag-prefix`
设置 Git Tag 的自定义前缀，默认为`v`.
如果你的项目之前是不带前缀(v)创建 Tag 的，你需要手动设置为空，否则更新日志会重新生成，将会丢失之前版本的更新日志。

`--tag-prefix=`

```
{
    tagPrefix: ""
}
```

### `--issue-url-format`
Issue 格式化 URL，可以设置成 Github, Gitlab, Bitbucket等等，取决于你想要 #工作项编号 的 Issue URL，我们目前都是 #工作项 编号，那么我们肯定希望生成 PingCode 的工作项地址

默认： `https//at.pingcode.com/agile/items/{{id}}`

### `--bump-files`

### `--infile`
更新日志读取和生成的文件，默认是`CHANGELOG.md`

### `--preset`

List of preset see [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog), by default, release use [angular preset](https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-changelog-angular/README.md)

### `--commit-all`

If you want to commit generated artifacts in the release commit, you can use the `--commit-all` or `-a` flag. You will need to stage the artifacts you want to commit, so your release command could look like this:

```
"prerelease": "npm run build-docs",
"release": "git add <file(s) to commit> && wpm release -commit-all"
```

### `--hooks`

wpm supports lifecycle hooks. These allow you to execute your own supplementary commands during the release or publish. The following hooks are available and execute in the order documented:

-   prerelease/postrelease: executed before/after anything happens. If the prerelease script returns a non-zero exit code, versioning will be aborted, but it has no other effect on the process.
-   prebump/postbump: executed before and after the version is bumped. If the prebump script returns a version #, it will be used rather than the version calculated by standard-version.
-   prechangelog/postchangelog: executes before and after the CHANGELOG is generated.
-   precommit/postcommit: called before and after the commit step.
-   pretag/posttag: called before and after the tagging step.

Simply add the following to your package.json or .wtpmrc file to configure lifecycle hooks:

```
{
  "wpm": {
    "hooks": {
      "prebump": "echo 9.9.9"
    }
  }
}
```

As an example to build artifacts before publish, publish artifacts to npm after created tag.

```
{
  "wpm": {
    "hooks":
    {
      "prepublish": "npm run build",
      "postpublish": "cd built && npm publish"
   }
  }
}
```