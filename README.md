## 🚀 Worktile Package Manager 🚀

Generic CLI tool to automate versioning and package publishing related tasks:

- Bump version (in e.g. package.json)
- Git create branch, commit, tag, push
- Execute any (test or build) commands using hooks
- Create release
- Generate changelog

## Installation

```bash
$ npm i @worktile/wpm --save
// or
$ yarn add @worktile/wpm
```

### Release

```bash
wpm release 1.0.1 # 明确版本号
wpm release patch # 语义化版本关键字: `patch`、`minor`、`major`
wpm release       # 通过命令交互界面选择版本
```

### Publish

```bash
wpm publish
```
