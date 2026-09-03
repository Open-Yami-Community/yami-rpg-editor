import { Resources } from '../resource.ts';
import type { SettingSection } from './types.ts';

// ============================ Schema 定义 ============================
// settingSchema 是设置页的单一数据源：分组、选项、默认值、校验、回调均在此声明。
// 渲染引擎（renderer.ts）与配置持久化（index.ts）均据此工作。

export const settingSchema: SettingSection[] = [
	{
		id: 'server',
		options: [
			{
				key: 'port',
				type: 'number',
				default: 5959,
				min: 0,
				max: 65535,
				validate: (v) => {
					const n = Number(v);
					return Number.isInteger(n) && n >= 0 && n <= 65535 ? null : '0-65535';
				}
			},
			{ key: 'auto', type: 'checkbox', default: false }
		]
	},
	{
		id: 'apkbuild',
		options: [
			{ key: 'apkPath', type: 'text', default: '@/app-release.apk', hidden: true },
			{ key: 'outputDir', type: 'text', default: '$/decompiled', tooltipPath: true },
			{ key: 'newApkPath', type: 'text', default: '$/app-release-re.apk' },
			{ key: 'apktoolPath', type: 'text', default: '@/apktool.jar', tooltipPath: true }
		]
	},
	{
		id: 'signed',
		options: [
			{ key: 'isSign', type: 'checkbox', default: true, hidden: true },
			{ key: 'jksPath', type: 'text', default: '@/release.jks', tooltipPath: true },
			{ key: 'keyStorePassword', type: 'text', default: '123456' },
			{ key: 'keyAlias', type: 'text', default: 'xuran' },
			{ key: 'keyPassword', type: 'text', default: '123456' },
			{ key: 'apksignerPath', type: 'text', default: '@/apksigner.bat', tooltipPath: true },
			{ key: 'zipalignPath', type: 'text', default: '@/zipalign.exe', tooltipPath: true },
			{
				key: 'signedApkPath',
				type: 'text',
				default: '$/app-debug-signed.apk',
				tooltipPath: true
			}
		]
	},
	{
		id: 'other',
		options: [
			{ key: 'copyAsTextKeepEmptyLine', type: 'checkbox', default: true },
			{
				key: 'browserSearchHistoryLimit',
				type: 'select',
				default: 9,
				optionsFn: () =>
					Array.from({ length: 9 }, (_, i) => ({ name: String(i + 1), value: i + 1 })),
				validate: (v) => {
					const n = Number(v);
					return Number.isInteger(n) && n >= 1 && n <= 9 ? null : '1-9';
				}
			}
		]
	},
	{
		id: 'recent',
		titleKey: 'setting-title-recent',
		titleFallback: 'Recent Projects',
		options: [
			{
				key: 'statsMode',
				type: 'select',
				default: 'count',
				labelKey: 'setting-recent-statsMode-label',
				labelId: 'setting-recent-statsMode-label',
				labelFallback: 'Stats Mode',
				optionsFn: ({ get }) => [
					{ name: get('recent-statsMode-count') || 'Count (只统计数量)', value: 'count' },
					{ name: get('recent-statsMode-size') || 'Size (计算大小)', value: 'size' }
				]
			}
		]
	},
	{
		id: 'github',
		options: [
			{
				key: 'accelerationNode',
				type: 'select',
				default: 'auto',
				optionsFn: async ({ get }) => {
					const items = [
						{ name: get('github-acceleration-auto') || '自动选择', value: 'auto' }
					];
					if (typeof Resources !== 'undefined' && Resources._fastGithubArray) {
						Resources._fastGithubArray = await Resources.updateFastGithubArray();
						Resources._fastGithubArray.forEach((url: string, i: number) => {
							const n = i + 1;
							const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
							const nodeLabel = get('github-acceleration-node') || '节点';
							items.push({
								name: `${nodeLabel} ${n} (${domain})`,
								value: `node${n}`
							});
						});
					}
					items.push({
						name: get('github-acceleration-none') || '不使用加速',
						value: 'none'
					});
					return items;
				}
			}
		]
	},
	{
		id: 'autoReload',
		options: [
			{
				key: 'enabled',
				type: 'checkbox',
				default: false
			},
			{
				key: 'pollInterval',
				type: 'number',
				default: 5,
				min: 0,
				max: 3600,
				validate: (v) => {
					const n = Number(v);
					return Number.isInteger(n) && n >= 0 && n <= 3600 ? null : '0-3600';
				}
			}
		]
	},
	{
		id: 'update',
		titleKey: 'setting-title-update',
		titleFallback: 'Update',
		options: [
			{
				key: 'checkOnStart',
				type: 'checkbox',
				default: true,
				labelKey: 'setting-update-checkOnStart-label',
				labelId: 'setting-update-checkOnStart-label',
				labelFallback: 'Check for updates on startup'
			}
		]
	}
];

/** 由 schema 派生默认 config（含 hidden 隐藏项，递归处理 subgroups） */
export function buildDefaultConfig(schema: SettingSection[] = settingSchema): any {
	const cfg: any = {};
	const build = (sections: SettingSection[], target: any) => {
		for (const s of sections) {
			target[s.id] = {};
			for (const o of s.options) target[s.id][o.key] = o.default;
			if (s.subgroups) build(s.subgroups, target[s.id]);
		}
	};
	build(schema, cfg);
	return cfg;
}
