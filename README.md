# make-dev-fast

通过本工具，让开发变得又快又方便，提供了很多开发时常用的命令，包括项目初始化脚手架、 git 相关操作优化、本地服务器、获取系统负载信息、快捷的文件上传等等。

[![npm](https://img.shields.io/npm/v/make-dev-fast.svg?style=flat)](https://www.npmjs.org/package/make-dev-fast)
<br />

## Usage
### 安装
```shell
$ npm i make-dev-fast -g

$ dev -h
```


### Git 操作命令

#### ps/push 命令：Git 提交代码

包含如下功能：
+ 分支检测：在提交代码时，会检测当前提交的分支是否为 `master` 或 `main`，如果是，会提示二次确认，避免错误提交代码。
+ `.gitignore` 检测：在提交代码时，会检测是否对 `node_modules` 等配置了 `.gitignore`，避免错误提交代码。
+ 自动 add 和 commit 信息辅助：在提交代码时，会在命令行中出现 `feat`、`fix`、`chore`、 `test` 等提交信息格式化前缀，帮助你编写更好的提交信息。
+ 计算代码变更数量：计算本次提交新增、减少了多少行代码，并会根据不同的语言类型分类计算，

```shell
$ dev ps
# 或
$ dev push
```

额外支持 `--no-verify`（或 `--pass`）来跳过 pre commit check。
另外，在 git commit 的时候，会自动在本地目录记录当前仓库新增、删除了多少行代码，便于统计，可以使用 `dev info` 查看相关代码变更数量信息。

#### co/checkout 命令：辅助变更分支

包含如下功能：
+ 分支搜索：执行 `dev co` 的时候，会出现一个可以输入检索的选择列表，通过输入和键盘上下键，高效的选择要切换的分支
+ 创建分支：执行 `dev co xxx` 的时候，如果 xxx 分支不存在，会自动创建 xxx 分支，并切换到 xxx 分支

```shell
$ dev co
# 或
$ dev checkout
```

#### clone 命令：辅助克隆 git 仓库

包含如下功能：
+ 自动格式化：支持 git@xxx.com、https://xxx.com/xxx 等等多种格式的地址，甚至是仓库中的一个文件的访问地址（如：`https://github.com/echosoar/make-dev-fast/blob/master/packages/dev/README.md`），都能自动格式化成可以 clone 的仓库地址
+ 自动切换分支：当 clone 的地址，存在分支相关的内容时，会在 clone 完成后，自动切换到对应的分支，如 `https://github.com/echosoar/make-dev-fast/blob/v0.2.11/packages/dev/README.md`，会在 clone 之后，切换到 `v0.2.11` 分支
+ 自动安装依赖：当 clone 完成后，对支持的仓库类型，会输入是否自动安装依赖确认，确认后会自动安装仓库的依赖，如匹配到 node.js 项目，可以自动选择 `npm`、`yarn` 或 `pnpm` 等进行依赖安装。

```shell
$ dev clone https://github.com/echosoar/make-dev-fast
```

#### git 命令：输出当前的 git 相关信息

包含如下信息：
+ name：对当前仓库进行操作的 git 用户名。
+ email：对当前仓库进行操作的 git 用户 email。
+ remoteUrl：远程仓库 http 协议地址，如："https://github.com/echosoar/make-dev-fast
+ remoteGitUrl：远程仓库 git 协议地址，如：git@github.com:echosoar/make-dev-fast.git
+ remoteName：远程仓库 git 地址名，如 origin，
+ currenBranch：当前分支名，如 master
* lastCommitId：本地当前分支最后一次 commmit id
* mergedMaster：最后一次 commit id 是否已经合入 master

```shell
$ dev git
```


#### reset 命令：回滚变更

支持回滚本地所有的变更，包括本地已经 commit 但是还没有 push 的变更

```shell
$ dev reset
```

#### mergeto 命令：将当前分支合并到目标分支

包含如下功能：
+ 检查未提交的更改：在执行合并操作之前，会检查是否有未提交的更改，并提示用户提交或暂存这些更改。
+ 执行合并操作：将当前分支合并到目标分支，并处理任何合并冲突。

```shell
$ dev mergeto <target-branch>
```

### init 命令：初始化项目

通过 `dev init` 命令，可以快速初始化项目。当你在命令行中执行 `dev init` 时，系统会提示你输入项目目录名称。如果你输入 './'，则项目会在当前目录下初始化。这使得在已有目录中快速开始一个新项目变得非常方便。

```shell
$ dev init
```

目前提供如下项目脚手架模板


|名称|语言|环境| 描述 |
|---|---|---|---|
|ts-node| Typescript | Node.js | 纯 NPM 包 |
|ts-bin| Typescript | Node.js | 命令行工具 |
|ts-web| Typescript | Browser | 浏览器工具包 |
|ts-react| Typescript | Browser | 浏览器 React 组件 |


### static 命令：在某个目录启动本地开发 server
```shell
$ dev static
$ dev static --port=12777
$ dev static --dir=./src
$ dev static --ssl
$ dev static --ssl --ssl-cert=path/to/cert.pem --ssl-key=path/to/key.pem
```
* 默认端口：12777，可以通过 `--port` 参数指定
* 默认目录：当前执行目录，可以通过 `--dir` 参数指定
* 此服务默认携带 CORS 跨域支持
* 支持 `--ssl` 参数来启用 HTTPS，提供默认的 `127.0.0.1` 证书，也可以使用 `--ssl-cert` 和 `--ssl-key` 参数来指定 SSL 证书和密钥文件的路径


### proxy 命令：代理请求
```shell
# 将 12778 端口的 https 请求代理到 12777 端口的 http server
$ dev proxy --port=12778 --target=12777 --ssl

# 将 12778 端口的 http 请求代理到 https://www.baidu.com
$ dev proxy --port=12778 --target=https://www.baidu.com

# 使用 HTTP/2 协议启动代理服务器
$ dev proxy --port=12778 --target=12777 --http2

```

**参数说明：**
* `--port`: 指定代理服务器监听端口，默认 12778
* `--target`: 指定后端目标地址，可以是完整 URL 或端口号
* `--ssl`: 启用 HTTPS（HTTP/1.1）
* `--http2`: 启用 HTTP/2 协议（自动启用 HTTPS，支持 HTTP/1.1 回退）
* `--ssl-cert`: 指定 SSL 证书文件路径（可选）
* `--ssl-key`: 指定 SSL 密钥文件路径（可选）



### where 命令：查找本地的全局命令位置
```shell
$ dev where npm

# 会有如下输出
npm -> /usr/local/bin/npm [bin]
npm -> /usr/local/lib/node_modules/npm/bin/npm-cli.js [link]
```

查找对应的命令的可执行文件(bin)所在位置。
如果对应的可执行文件是个软连，还会继续寻找原始的路径位置，进行输出。



### 其他更多命令
```shell
$ dev -h
```
---
© MIT LICENSE 
