import { Editor } from './editor.ts';
import { File } from '@/file/file-system-core.ts';
import { Directory } from '@/file/directory-object.ts';
import { Title } from '@/title/title-bar.ts';
import { UndoManager } from '@/tools/undo-manager.ts';
import { Data } from '@/data/data-object.ts';
import { Scene } from '@/scene/scene-window.ts';
import { Layout } from '@/layout/layout.ts';
import { Inspector } from '@/inspector/inspector.ts';
import { EventEditor } from '@/command/event-editor.ts';

// 插件侧契约：把引擎内部接口暴露到 window，供外部扩展（如 DanJuan妙妙插件）读取。
// 没有这一段，插件在本构建上只能退化成纯文件工具：保存 / 撤销 / 重做 / 刷新资源树 /
// 启动试玩 / 文件未保存预检 / 环境快照 全部不可用（官方预编译版就是这种状态）。
// 与 Linux 源码构建上那次的本地补丁保持一致，并补上了环境快照要用的 Scene / Layout / Inspector / EventEditor。
(window as any).YamiEngine = {
	File,
	Directory,
	Title,
	UndoManager,
	Data,
	Scene,
	Layout,
	Inspector,
	EventEditor
};

// 老打包版的历史契约：这些内部对象当年是直接挂全局的，插件里保留了大量按裸全局读取的
// 路径（场景名、当前工作页、检视器、事件编辑器…）。照挂一遍即可全部点亮，插件侧一行都不用改。
// 唯独不挂 File —— window.File 是浏览器原生 File 构造函数，覆盖它会波及引擎/Electron 自身的
// Blob 相关代码；插件侧取 File 走 window.YamiEngine.File 即可。
Object.assign(window as any, {
	Directory,
	Title,
	UndoManager,
	Data,
	Scene,
	Layout,
	Inspector,
	EventEditor
});

(function main() {
	const start = () => Editor.initialize();
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, { once: true });
	} else {
		start();
	}
})();
