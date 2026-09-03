import { $ } from '@/util/dom.ts';
import { GlobalPathForDir, GlobalPath } from '@/util/config.ts';
import { Window } from '@/tools/window-object.ts';
import { WebServer } from '../webserver.ts';
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { SettingRenderer } from './renderer.ts';
import { settingSchema, buildDefaultConfig } from './schema.ts';

export const path = nodePath;

// ============================ SettingConfig ============================
// 配置持久化与生命周期管理；UI 渲染委托给 SettingRenderer。

export const SettingConfig = new (class {
	config = {} as any;
	/** DOM 是否已渲染（localize 回调据此判断是否需要重新本地化） */
	private _rendered = false;
	/** localize 回调是否已绑定，避免重复注册 */
	private _localizeBound = false;
	/** 渲染引擎：传入 this 作为 host，使其始终读到最新 config */
	private renderer = new SettingRenderer(this, settingSchema);

	get homedir() {
		return GlobalPathForDir;
	}
	get configPath() {
		return path.join(GlobalPath, 'yami-config.json');
	}
	/** 由 schema 派生默认 config（含 hidden 隐藏项） */
	get defaultConfig() {
		return buildDefaultConfig(settingSchema);
	}

	constructor() {
		// 启动期即从磁盘载入完整 config，避免下游裸取 config.github.* 时撞默认空 {} 的问题
		this.load();
		$('#setting').on('open', this.open.bind(this));
		$('#setting-confirm').on('click', () => Window.close('setting'));
	}

	// ---- 生命周期 ----

	open() {
		this.load();
		this.render();
		$('#setting').on('closed', () => this.close(), { once: true });
	}
	close() {
		this.save();
	}

	/** 渲染并注册 localize 回调（仅一次） */
	private render() {
		this.renderer.render();
		this._rendered = true;
		if (!this._localizeBound) {
			this._localizeBound = true;
			window.on('localize', () => {
				if (!this._rendered) return;
				this.renderer.applyL10n();
				void this.renderer.reloadAllSelectOptions();
			});
		}
	}

	// ---- 配置读写 ----

	load() {
		if (!nodeFs.existsSync(this.configPath)) {
			nodeFs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig), 'utf-8');
			this.config = JSON.parse(JSON.stringify(this.defaultConfig));
			return;
		}
		this.config = JSON.parse(nodeFs.readFileSync(this.configPath, 'utf-8'));
		// 兜底：旧 yami-config.json 中某字段可能为 null（用户手动改或旧版写入），Reflect.has(null) 会抛错中断 load()
		const patch = (_p_obj: any, _t_obj: any) => {
			if (_t_obj === null || typeof _t_obj !== 'object') {
				_t_obj = {};
			}
			for (const key in _p_obj) {
				if (!Reflect.has(_t_obj, key)) {
					_t_obj[key] = _p_obj[key];
				}
				if (typeof _p_obj[key] === 'object') {
					_t_obj[key] = patch(_p_obj[key], _t_obj[key]);
				}
			}
			return _t_obj;
		};
		this.config = patch(this.defaultConfig, this.config);
		// 兜底：旧 yami-config.json 可能缺子段，patch() 对已存在但缺子字段的补不全，Object.assign 强合
		for (const key of Object.keys(this.defaultConfig)) {
			this.config[key] ??= {};
			for (const sub of Object.keys(this.defaultConfig[key])) {
				if (this.config[key][sub] === undefined) {
					this.config[key][sub] = this.defaultConfig[key][sub];
				}
			}
		}
		const browserSearchHistoryLimit = Math.floor(
			Number(this.config.other.browserSearchHistoryLimit)
		);
		this.config.other.browserSearchHistoryLimit = Number.isFinite(browserSearchHistoryLimit)
			? Math.min(Math.max(browserSearchHistoryLimit, 1), 9)
			: 9;
	}
	save() {
		if (!nodeFs.existsSync(this.configPath)) {
			return nodeFs.writeFileSync(
				this.configPath,
				JSON.stringify(this.defaultConfig),
				'utf-8'
			);
		}
		nodeFs.writeFileSync(this.configPath, JSON.stringify(this.config), 'utf-8');
		this.apply();
	}
	apply() {
		if (WebServer.port !== this.config.server.port) {
			WebServer.port = this.config.server.port;
		}
		// 自动重载
		if ((window as any).AutoReload) {
			(window as any).AutoReload.applyConfig();
		}
	}
})();
