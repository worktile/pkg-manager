---
title: "Publish"
order: 40
---


### 使用说明

<pre><code>wpm publish</code></pre>

运行以上命令，会执行以下步骤：

1. 切换到允许发布的分支
1. 创建一个和当前分支版本一样的 Tag 
1. 推送 Tag 到远程分支

> `publish` 不会修改任何版本号文件，它直接使用当前 `package.json`（或 `packageJsonPath` 指定文件）中的 `version` 作为 Tag 版本。

### 选项

全局选项（`release` 与 `publish` 共用）：

-   `--config` / `-c`
-   `--default-branch` / `-b`
-   `--allow-branch`
-   `--dry-run`
-   `--force` / `-f`
-   `--tag-prefix` / `-t`
-   `--hooks`

`publish` 专属选项：

-   `--skip` / `-s`
-   `--skip.confirm` / `-sc`

> 可在 `.wpmrc.js`、`.wpmrc.json`、`package.json` 的 `wpm` 字段等配置文件中使用 camelCase 名称配置。

### `--config <path>`

指定本次命令读取的 wpm 配置文件：

```sh
wpm publish --config wpm.all.config.js
```

未指定时按 `package.json` 的 `wpm` 字段、`.wpmrc*`、`wpm.config.js` 的顺序自动查找。

### `--default-branch`

系统保留的基础分支配置，默认 `master`，可选 `master`、`develop`。

> 当前版本的目标分支由 `--allow-branch` 白名单加交互选择决定，该参数仅作为配置项保留。

### `--force`

忽略工作区未提交改动的检查。

`publish` 默认要求工作区干净（存在未提交改动时会报 `E_GIT_STATUS` 并退出），如果你确实需要在 dirty 的工作区创建 Tag，可以加 `--force`：

```sh
wpm publish --force
```

### `--skip.confirm`

跳过分支确认交互，直接在当前分支执行。默认会先询问是否在当前分支发布，若当前分支不在白名单中则提示从白名单分支中选择。

```sh
wpm publish --skip.confirm
wpm publish -sc
```

### `--allow-branch <glob>`
允许执行 Publish 的分支白名单，通过 glob 规则配置，默认为：`["master", "develop"]`，最简单也是推荐的做法是在`.wpmrc.js`配置文件中配置，但是通过 CLI 选项可以覆盖。

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
跳过内置的生命周期步骤，也可以通过在 package.json 和 .rc 配置文件中设置。

`publish` 包含: tag, push

`publish` 可用的跳过项：

| 跳过项      | 说明                                                                  |
| ----------- | --------------------------------------------------------------------- |
| `tag`       | 不创建 Tag；此时 `push` 阶段会因为找不到 Tag 而报错，除非同时 `--skip.push` |
| `push`      | 不推送 Tag 到远程                                                     |
| `confirm`   | 跳过分支确认交互，直接在当前分支执行                                  |

`--skip.tag --skip.push`

```
// package.json
{
  "wpm": {
    "skip": {
      "push": true
    }
  }
}
```

```
// .wtpmrc.js
module.exports = {
   "skip": {
      "push": true
    }
}
```


### `--tag-prefix`
设置 Git Tag 的自定义前缀，默认为`v`。Tag 名为 `{{tagPrefix}}{{version}}`，例如默认配置下发布 `1.0.1` 会创建 Tag `v1.0.1`。
如果你的项目之前是不带前缀(v)创建 Tag 的，你需要手动设置为空，否则更新日志会重新生成，将会丢失之前版本的更新日志。

`--tag-prefix=`

```
{
    tagPrefix: ""
}
```


### `--hooks`

wpm supports lifecycle hooks. These allow you to execute your own supplementary commands during the release or publish. The following hooks are available and execute in the order documented:

-   prerelease/postrelease: executed before/after anything happens. If the prerelease script returns a non-zero exit code, versioning will be aborted, but it has no other effect on the process.
-   prereleaseBranch/postreleaseBranch: executed before and after the release branch is created.
-   prebump/postbump: executed before and after the version is bumped.
-   prechangelog/postchangelog: executes before and after the CHANGELOG is generated.
-   precommit/postcommit: called before and after the commit step.
-   pretag/posttag: called before and after the tagging step.

`publish` 实际会触发的钩子：`prepublish`、`pretag`、`posttag`、`postpublish`。钩子命令中的 `{{version}}` 会被替换为本次发布的版本号。

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