# Yami rpg editor 社区分支

Yami rpg editor 是一款以用户友好性著称的 2D RPG 编辑器
Yami rpg editor is 2D rpg editor on user-friendliness.

## 开始

```shell
npm install
```

将“Runtime/electron-packages.zip”解压到“Project”中，作为游戏部署的依赖项。
由于部分文件超过 100MB，已将其拆分为多个卷。

Extract "Runtime/electron-packages.zip" to "Project" as dependencies for game deployment.
Since some files exceed 100MB, they have been split into multiple volumes.

## 运行

```shell
npm run start
```

## 外部 Browser 插件

您可在目录下的`extension`文件夹中添加浏览器插件，软件会自行扫描并添加

## 构建

```shell
# windows
npm run build:win

# macos
npm run build:mac

npm run build:macArm

npm run build:universal

# linux
npm run build:linux

```

## 关于

欢迎提出您宝贵的 **issue**，我们将会处理。

# LICENSE

[you can see this](./LICENSE)
