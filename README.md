# Yami rpg editor 社区分支

Yami rpg editor 是一款以用户友好性著称的 2D RPG 编辑器

Yami rpg editor is 2D rpg editor on user-friendliness.

PS：目前项目只构建了 `Windows` 版本，其他版本请自行构建

PS：目前项目多语言只维护`中文`、`english`语言包，其他语言我们暂不维护（多余的维护成本）

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Open-Yami-Community/yami-rpg-editor)

## 

![Yami_RPG_Editor](https://shared.cdn.queniuqe.com/store_item_assets/steam/apps/1964480/header.jpg?t=1742510557)

如果你觉得此软件不错的话，欢迎前往Steam**支持正版**：[Yami RPG Editor](https://store.steampowered.com/app/1964480/Yami_RPG_Editor/)

## 开始

```shell
pnpm install
```

将“Runtime/electron-packages.zip”解压到“Project”中，作为游戏部署的依赖项。
由于部分文件超过 100MB，已将其拆分为多个卷。

Extract "Runtime/electron-packages.zip" to "Project" as dependencies for game deployment.
Since some files exceed 100MB, they have been split into multiple volumes.

## 运行

```shell
pnpm run start
```

## 外部 Browser 插件

您可在目录下的`extension`文件夹中添加浏览器插件，软件会自行扫描并添加

## 构建

```shell
# windows
npm run build:win

# macos
pnpm run build:mac

pnpm run build:macArm

pnpm run build:universal

# linux
pnpm run build:linux

# exe
# 后面加exe 则是打包setup版本

```

## 贡献者

![GitHub contributors](https://img.shields.io/github/contributors/Open-Yami-Community/yami-rpg-editor)

<a href="https://github.com/Open-Yami-Community/yami-rpg-editor/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Open-Yami-Community/yami-rpg-editor">
</a>

贡献请参照[CONTRIBUTING](./CONTRIBUTING.md)

## 关于

欢迎提出您宝贵的 **issue**，我们将会处理。

# LICENSE

[you can see this](./LICENSE)
