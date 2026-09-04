// ******************************** 自动重载 ********************************
// 监听 Assets 数据文件的外部修改并自动重读进编辑器内存
// 配置由 SettingConfig.config.autoReload 提供（设置窗口 → OpenYami → 设置）

import { EventBus } from '@/module/eventbus.ts';
import { File } from '@/file/file-system-core.ts';
import { Data } from '@/data/data-object.ts';
import { Scene } from '@/scene/scene-window.ts';
import { Updater } from '@/update/updater.ts';
import { EventEditor } from '@/command/event-editor.ts';
import { Inspector } from '@/inspector/inspector.ts';
import { SettingConfig } from '@/module/settingconfig';
import nodeFs from 'node:fs';
import nodePath from 'node:path';

export const AutoReload = new (class AutoReload {
	// 数据文件扩展名 -> 数据映射表名称
	static dataExtnameMap: Record<string, string> = {
		'.actor': 'actors',
		'.skill': 'skills',
		'.trigger': 'triggers',
		'.item': 'items',
		'.equip': 'equipments',
		'.state': 'states',
		'.event': 'events',
		'.scene': 'scenes',
		'.tile': 'tilesets',
		'.ui': 'ui',
		'.anim': 'animations',
		'.particle': 'particles'
	};

	enabled = false;
	watcher: nodeFs.FSWatcher | null = null;
	rootTick: ReturnType<typeof setInterval> | null = null;
	watchedRoot = '';
	pollTimer: ReturnType<typeof setInterval> | null = null;
	pollSeconds = 5;
	lastMtime = new Map<string, number>();
	pending = new Map<string, ReturnType<typeof setTimeout>>();

	// 应用配置
	applyConfig() {
		const config = SettingConfig.config.autoReload ?? {};
		const enabled = config.enabled === true;
		let pollSeconds = Number(config.pollInterval);
		if (!Number.isFinite(pollSeconds) || pollSeconds < 0) {
			pollSeconds = 5;
		}
		// 轮询间隔变化时重启轮询
		if (this.pollSeconds !== pollSeconds) {
			this.pollSeconds = pollSeconds;
			this.stopPoll();
		}
		if (enabled) {
			this.enabled = true;
			if (this.rootTick === null) {
				this.rootTick = setInterval(() => this.tickRoot(), 2000);
			}
			this.tickRoot();
			this.startPoll();
		} else {
			this.enabled = false;
			if (this.rootTick !== null) {
				clearInterval(this.rootTick);
				this.rootTick = null;
			}
			this.stopWatcher();
			this.stopPoll();
		}
	}

	// 项目切换检测：Assets 路径变化时重启监听。
	// 注意：watchedRoot 存的是 Assets 的绝对路径（见 startWatcher），必须与 File.path('Assets') 比较；
	// 与 File.root（项目根）比较恒不相等，会导致每 2 秒重启 watcher 并清空防抖队列（外部修改丢失）。
	tickRoot() {
		if (!this.enabled || !File.root) return;
		if (File.path('Assets') !== this.watchedRoot) {
			this.stopWatcher();
			this.startWatcher();
		}
	}

	// 启动文件监听
	startWatcher() {
		if (this.watcher !== null) return;
		// File.path 始终返回真实文件系统路径；File.route 在 dev 模式返回 /local-file/?path= 的 URL，
		// 交给 fs.existsSync/watch 会让监听永远无法启动（dev 下静默失效）。
		const root = File.path('Assets');
		if (!root || !nodeFs.existsSync(root)) return;
		this.watchedRoot = root;
		this.watcher = nodeFs.watch(root, { recursive: true }, (_eventType, filename) => {
			if (!filename) return;
			// 忽略编译产物与临时文件
			if (/\.(js|js\.map|tsbuildinfo)$/i.test(filename)) return;
			this.schedule(nodePath.join(root, String(filename)));
		});
		this.watcher.on('error', (error) => {
			console.warn('[AutoReload] 监听异常:', error);
			this.stopWatcher();
		});
		console.log('[AutoReload] 监听已启动:', root);
	}

	// 停止文件监听
	stopWatcher() {
		if (this.watcher !== null) {
			this.watcher.close();
			this.watcher = null;
		}
		for (const timer of this.pending.values()) clearTimeout(timer);
		this.pending.clear();
		this.watchedRoot = '';
	}

	// 防抖调度
	schedule(absPath: string) {
		if (this.pending.has(absPath)) {
			clearTimeout(this.pending.get(absPath));
		}
		const timer = setTimeout(() => {
			this.pending.delete(absPath);
			void this.reloadFile(absPath);
		}, 300);
		this.pending.set(absPath, timer);
	}

	// 重读单个数据文件
	async reloadFile(absPath: string) {
		if (!File.root) return;
		if (!nodeFs.existsSync(absPath)) return;

		const assetsRoot = File.path('Assets');
		let relative = nodePath.relative(assetsRoot, absPath);
		if (relative.startsWith('..') || nodePath.isAbsolute(relative)) return;
		relative = 'Assets/' + relative.split(nodePath.sep).join('/');

		const ext = nodePath.extname(absPath).toLowerCase();
		const mapName = AutoReload.dataExtnameMap[ext];
		if (!mapName) return;

		let meta = Data.manifest.pathMap[relative];
		if (!meta) {
			// Windows 大小写不敏感回退匹配
			const lowerRelative = relative.toLowerCase();
			for (const key in Data.manifest.pathMap) {
				if (key.toLowerCase() === lowerRelative) {
					meta = Data.manifest.pathMap[key];
					relative = key;
					break;
				}
			}
		}
		if (!meta || !meta.guid) return;

		// 编辑器内有未保存改动时跳过
		if (Data.manifest.changes.includes(meta)) {
			console.warn('[AutoReload] 跳过（编辑器有未保存改动）:', relative);
			return;
		}
		// 场景编辑器正在编辑该文件时跳过
		if (Scene.meta === meta) {
			console.warn('[AutoReload] 跳过（场景编辑器占用中）:', relative);
			return;
		}

		try {
			const data = await File.get({ path: relative, type: 'json' });
			if (data === null) return;
			Object.defineProperty(data, 'guid', {
				configurable: true,
				writable: true,
				value: meta.guid
			});
			Data[mapName][meta.guid] = data;

			// 与引擎 Meta 构造保持一致的后处理
			switch (mapName) {
				case 'events':
					(Updater as any).updateGlobalEvent(meta);
					break;
				case 'scenes':
					Data.registerScenePresets(meta.guid);
					break;
				case 'ui':
					Data.registerUiPresets(meta.guid);
					break;
			}

			// 刷新属性检查器（若当前正打开该实体）
			this.refreshInspector(meta, data);

			// 刷新事件编辑器
			this.refreshEventEditor(meta.guid);

			console.log('[AutoReload] 已重载:', relative);
		} catch (error: any) {
			// 文件写入未完成等瞬态错误：忽略，等待下一次事件
			console.warn('[AutoReload] 重载失败（忽略）:', relative, error?.message);
		}
	}

	// 刷新属性检查器当前打开项
	refreshInspector(meta: any, data: any) {
		if (Inspector.meta === meta && Inspector.type && (Inspector as any)[Inspector.type]) {
			const page = (Inspector as any)[Inspector.type];
			page.target = null;
			page.meta = null;
			page.open(data, meta);
		}
	}

	// 刷新事件编辑器已打开项
	refreshEventEditor(guid: string) {
		if (!EventEditor.data) return;
		const selected = (EventEditor.list as any)?.selected;
		for (const item of EventEditor.data) {
			if (item.id !== guid || item.class !== 'global') continue;
			if (item.changed) {
				console.warn('[AutoReload] 事件正在编辑且有未保存改动，窗口不刷新:', guid);
				continue;
			}
			item.event = Data.events[guid];
			delete item.commands;
			if (item === selected) EventEditor.openCommandList(item);
		}
	}

	// 扫描数据文件修改时间快照
	scanDataFiles(root: string) {
		const map = new Map<string, number>();
		try {
			const files = nodeFs.readdirSync(root, { recursive: true, encoding: 'utf-8' });
			for (const rel of files) {
				const ext = nodePath.extname(rel).toLowerCase();
				if (!AutoReload.dataExtnameMap[ext]) continue;
				const absPath = nodePath.join(root, rel);
				try {
					map.set(absPath, Number(nodeFs.statSync(absPath).mtimeMs));
				} catch (_error) {
					// 文件刚被删除等情况，忽略
				}
			}
		} catch (_error) {
			// readdirSync recursive 不可用等异常：本次跳过
		}
		return map;
	}

	// 轮询兜底：对比修改时间快照，防系统监听漏报
	pollScan() {
		const root = File.path('Assets');
		if (!File.root || !root || !nodeFs.existsSync(root)) return;
		const snapshot = this.scanDataFiles(root);
		for (const [absPath, mtimeMs] of snapshot) {
			const last = this.lastMtime.get(absPath);
			if (last !== undefined && last !== mtimeMs) {
				this.schedule(absPath);
			}
			this.lastMtime.set(absPath, mtimeMs);
		}
		// 清理已删除文件的快照条目
		for (const key of this.lastMtime.keys()) {
			if (!snapshot.has(key)) this.lastMtime.delete(key);
		}
	}

	// 启动轮询兜底
	startPoll() {
		if (this.pollTimer !== null || this.pollSeconds <= 0) return;
		const root = File.path('Assets');
		if (File.root && root && nodeFs.existsSync(root)) {
			this.lastMtime = this.scanDataFiles(root);
		}
		this.pollTimer = setInterval(() => this.pollScan(), this.pollSeconds * 1000);
	}

	// 停止轮询兜底
	stopPoll() {
		if (this.pollTimer !== null) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
		this.lastMtime.clear();
	}
})();

(window as any).AutoReload = AutoReload;

// 编辑器初始化完成后按配置启动
EventBus.on('editor_loaded', () => {
	AutoReload.applyConfig();
});
