## 🚀 Worktile Package Manager 🚀

[![docgeni](https://img.shields.io/badge/docs%20by-docgeni-348fe4)](https://github.com/docgeni/docgeni)
[![npm (scoped)](https://img.shields.io/npm/v/@worktile/pkg-manager?style=flat)](https://www.npmjs.com/package/@worktile/pkg-manager)
[![npm](https://img.shields.io/npm/dm/@worktile/pkg-manager)](https://www.npmjs.com/package/@worktile/pkg-manager)
[![npm](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square
)](https://github.com/prettier/prettier)

Generic CLI tool to automate versioning and package publishing related tasks:

- Bump version (in e.g. package.json)
- Git create branch, commit, tag, push
- Execute any (test or build) commands using hooks
- Create release
- Generate changelog

## Installation

```bash
$ npm i @worktile/pkg-manager --save
// or
$ yarn add @worktile/pkg-manager
```

## Quick Links
- ✨ Learn about it on the [docs site](https://worktile.github.io/pkg-manager)

### wpm release

```bash
wpm release 1.0.1 # 明确版本号
wpm release patch # 语义化版本关键字: `patch`、`minor`、`major`
wpm release       # 通过命令交互界面选择版本
```

### wpm publish

```bash
wpm publish
```

## LICENSE

[MIT LICENSE](https://github.com/worktile/pkg-manager/blob/master/LICENSE)
