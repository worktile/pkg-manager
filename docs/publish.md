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

### 选下过

-   `--allow-branch`
-   `--dry-run`
-   `--skip`
-   `--tag-prefix`
-   `--hooks`


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


### `--tag-prefix`
设置 Git Tag 的自定义前缀，默认为`v`.
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