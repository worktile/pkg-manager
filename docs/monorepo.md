---
title: "Monorepo 发布"
order: 35
---

从 `0.2.0-next.0` 开始，`wpm release` 支持在 Monorepo 仓库中发布。你可以在配置文件中通过 `packages` 声明参与本次发布的子包。单次 `wpm release` 内的版本是统一的，但通过**多个 wpm 配置文件 + `--config`**，可以实现整仓发布、独立发布或自定义分组发布。

### 发布模式

同一个仓库可以放多份 wpm 配置文件，每次命令通过 `--config <file>` 选择其中一份：

| 模式     | 配置方式                                                                                     | 版本表现                         |
| -------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| 整仓发布 | 一份配置的 `packages` 列出所有子包                                                           | 根目录与所有子包共享同一版本     |
| 独立发布 | 每个包一份配置，`packageJsonPath` 指向该包 `package.json`，`packages` 只包含该包             | 各包按自己的 `package.json` 版本独立递增 |
| 自定义分组 | 每组一份配置，`packages` 列出组内包，`packageJsonPath` 指向该组的版本来源                    | 组内共享版本，组与组之间独立     |

注意：**单次 `wpm release` 只处理一份配置**。因此一次调用内版本统一；跨配置、多次调用才能实现独立版本。Release 分支和 Tag 也按每次调用创建，独立发布时应使用不同的版本号，避免 `release-v{{version}}` 分支或 `v{{version}}` Tag 冲突。

### 目录结构示例

```text
repo/
├── package.json
├── package-lock.json             # 可选，用于同步 workspace 版本
├── wpm.all.config.js             # 整仓发布
├── wpm.core.config.js            # 独立发布 packages/core
├── wpm.ui.config.js              # 自定义分组：ui 相关包一起发布
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── CHANGELOG.md
    │   └── src/version.ts
    ├── cli/
    │   └── package.json
    ├── ui/
    │   └── package.json
    └── ui-icons/
        └── package.json
```

### 配置

在配置文件中增加 `packages` 配置，并通过 `--config` 指定使用哪一份：

```js
module.exports = {
    allowBranch: ['master'],
    // 根目录参与 bump 的文件，默认 ['package.json', 'package-lock.json', 'npm-shrinkwrap.json']
    bumpFiles: ['package.json'],
    packages: [
        {
            path: 'packages/core',
            bumpFiles: ['package.json', { filename: 'src/version.ts', type: 'code' }]
        },
        {
            path: 'packages/cli'
        },
        {
            // 不生成该包的 CHANGELOG.md
            path: 'packages/utils',
            infile: ''
        }
    ]
};
```

`packages` 中每一项支持以下字段：

| 字段        | 是否必填 | 说明                                                                                                                       |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `path`      | 是       | 子包目录，相对于 `cwd`（默认为执行命令的目录）                                                                             |
| `bumpFiles` | 否       | 该包需要更新版本号的文件，路径相对于该包目录；未配置时继承根级 `bumpFiles`                                                 |
| `infile`    | 否       | 该包 CHANGELOG 的输出文件，相对于该包目录，默认为 `CHANGELOG.md`；设置为空字符串 `''` 表示不生成该包的更新日志            |

`bumpFiles` 的每一项可以是文件路径字符串，也可以是对象：

```js
{
    filename: 'src/version.ts',
    // json（默认）| plain-text | code
    type: 'code',
    // 自定义 updater，模块需导出 readVersion(contents) 和 writeVersion(contents, version)
    updater: './scripts/my-updater.js'
}
```

> `type: 'code'` 会用内置的正则匹配并替换文件中的第一个语义化版本号，适合 `src/version.ts` 这类源码中的版本常量。

如果版本号不在根 `package.json` 中，可以用 `packageJsonPath` 指定读取版本号的文件。该字段通常通过配置文件设置：

```js
module.exports = {
    packageJsonPath: 'packages/core/package.json',
    packages: [{ path: 'packages/core' }, { path: 'packages/cli' }]
};
```

> `packageJsonPath` 只是版本号来源，不会自动更新该文件。确保它同时出现在对应层级的 `bumpFiles` 中，否则读取到的版本不会随发布递增。

### 多配置文件示例

**整仓发布**（`wpm.all.config.js`）：所有子包共享根 `package.json` 的版本。

```js
module.exports = {
    allowBranch: ['master'],
    packageJsonPath: 'package.json',
    packages: [{ path: 'packages/core' }, { path: 'packages/cli' }, { path: 'packages/ui' }, { path: 'packages/ui-icons' }]
};
```

**独立发布**（`wpm.core.config.js`）：只发布 `packages/core`，使用该包自己的版本号。

```js
module.exports = {
    allowBranch: ['master'],
    packageJsonPath: 'packages/core/package.json',
    // 不 bump 根目录文件，避免把根 package.json 也改成 core 的版本
    bumpFiles: [],
    // 不生成根 CHANGELOG
    infile: '',
    packages: [{ path: 'packages/core', bumpFiles: ['package.json'] }]
};
```

**自定义分组**（`wpm.ui.config.js`）：把 `ui` 和 `ui-icons` 作为一个整体发布，组内共享版本。

```js
module.exports = {
    allowBranch: ['master'],
    packageJsonPath: 'packages/ui/package.json',
    bumpFiles: [],
    infile: '',
    packages: [
        { path: 'packages/ui', bumpFiles: ['package.json'] },
        { path: 'packages/ui-icons', bumpFiles: ['package.json'] }
    ]
};
```

按需选择配置执行：

```sh
wpm release --config wpm.all.config.js minor   # 整仓
wpm release --config wpm.core.config.js patch  # 只发 core
wpm release --config wpm.ui.config.js minor    # 发 ui 分组
```

使用多个配置文件时注意：

-   **单次调用只处理一份配置**，一次调用内根目录和所选子包共享同一个新版本；独立版本来自多次调用和各自的 `packageJsonPath`。
-   各配置的 `packages` 应互不重叠，否则同一个包会在多次发布中被重复 bump。
-   独立发布或分组发布时，建议用 `bumpFiles: []` 关闭根目录 bump，并用 `infile: ''` 关闭根 CHANGELOG；子包通过自己的 `bumpFiles` 更新版本。
-   Release 分支和 Tag 由每次调用的版本号生成，独立发布时请确保不同包使用不同版本号，避免分支或 Tag 冲突。
-   `--config` 只决定读取哪份配置，Git 提交、分支和推送仍在当前仓库中执行。

### Release 各阶段行为

执行 `wpm release` 后，各个阶段在 Monorepo 下的行为如下：

1. **选择版本**：读取根 `package.json`（或 `packageJsonPath`）的 `version`，按交互提示或 `releaseAs` 参数计算下一个版本。
2. **创建 Release 分支**：按 `releaseBranchFormat` 创建一个仓库级的分支，例如 `release-v1.2.0`。
3. **更新版本号（bump）**：
    - 更新根级 `bumpFiles` 中的文件
    - 依次更新每个 `packages` 中声明的子包：使用该包的 `bumpFiles`，未配置时继承根级配置，文件路径相对包目录解析
    - 同步 `package-lock.json` 中对应的 workspace 版本号（见下文）
4. **生成更新日志（changelog）**：
    - 为每个子包生成/合并各自的 `CHANGELOG.md`，只包含该包目录下的提交
    - 为根目录生成/合并根 `CHANGELOG.md`，汇总所有子包目录下的提交
    - 包级或根级的 `infile` 为空字符串时跳过对应更新日志
5. **提交**：把根级与各子包的 `CHANGELOG.md`、`bumpFiles` 中实际存在的文件加入本次 Release 提交。
6. **推送**：推送 Release 分支到 `origin`，并按远程地址输出创建 PR 的链接。

### package-lock.json 版本同步

如果仓库中存在 `package-lock.json`（包含 `packages` 字段，即 lockfileVersion 2/3 的格式），`bump` 阶段会：

1. 从 `cwd` 逐级向上查找第一个带 `packages` 字段的 `package-lock.json`
2. 根据本次被 bump 的 `package.json` 路径，更新 `packages[""]`（根包）或 `packages["packages/core"]`（子包）的 `version`
3. 将 `package-lock.json` 自动加入待提交文件

目前只同步 `package-lock.json`；`pnpm-lock.yaml`、`yarn.lock` 不会被修改，使用 pnpm/yarn 的仓库请在 `postbump` 钩子中自行同步，例如：

```js
module.exports = {
    hooks: {
        postbump: 'git add .'
    }
};
```

### 验证配置

建议先用 `--dry-run` 检查参与 bump 和 changelog 的文件列表，不会修改文件或提交：

```sh
wpm release --dry-run
```

确认无误后再执行正式发布：

```sh
wpm release patch
```

### 常见问题

**子包没有生成 CHANGELOG**

-   检查该包是否在 `packages` 中声明
-   检查该包或根级的 `infile` 是否被设置为 `''`
-   更新日志只包含该包目录下的提交，若该包在本次版本区间没有提交，会输出 `No changelog generated` 警告

**根 CHANGELOG 没有包含根目录的改动**

根 CHANGELOG 的提交范围按 `packages` 中的目录过滤，只汇总子包目录下的提交。根目录（如构建脚本、配置）的改动不会出现在根 CHANGELOG 中，需要时请手动补充。

**子包版本号没有变化**

-   确认该包的 `bumpFiles`（或继承的根级 `bumpFiles`）中包含对应文件
-   文件不存在或未匹配到版本号时，`wpm` 会输出 `Skip (file not found)` 或 `Skip (no version)` 警告，不会中断发布

**提交里缺少构建产物**

Release 提交只包含 `wpm` 已知的 `CHANGELOG.md` 和 `bumpFiles`。如需提交其他生成文件，在 `postbump` 钩子中执行 `git add`。

**能否只用命令行传 `packages`**

`--packages` 是数组参数，元素为对象，不适合在命令行书写。推荐始终在 `.wpmrc.js`、`.wpmrc.json` 或 `package.json` 的 `wpm` 字段中配置。
