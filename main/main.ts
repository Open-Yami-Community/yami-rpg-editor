// [YAMI RPG EDITOR]主线程

// ESM import——npm 包和 Node 内建模块 external 掉后 runtime 用 createRequire 桥解析
import Koa from 'koa';
import Mime from 'mime-types';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';
import * as apkProcessor from './apk.ts';
import type { IpcMainInvokeEvent, IpcMainEvent, BrowserWindowExtension } from './types/main.ts';
import { app, Menu, BrowserWindow, ipcMain, dialog, shell, session, clipboard } from 'electron';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

// 模块所在目录（dist-electron/），不依赖 import.meta.url 或 CJS __dirname 全局
const __dirname = path.resolve(app.getAppPath(), 'dist-electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 含 --dirname 参数时表示 Node.js 调试模式，重定向根目录并开启调试
let debug = false;
let dirname = app.getAppPath();
const regexp = /^--dirname=(.+)$/;
let match;
for (const arg of process.argv) {
	if ((match = arg.match(regexp))) {
		dirname = path.resolve(dirname, match[1]);
		debug = true;
		break;
	}
}

// 判据用 devServerUrl 存在性而非 debug，避免 start:prod 带 --debug-mode 时误走 dev URL 致空白页
const devServerUrl = process.argv.find((arg) => arg.startsWith('--dev-server-url='))?.split('=')[1];
const VITE_DEV_URL = devServerUrl || 'http://localhost:5173';
const useViteDev = !!devServerUrl;
const generate32bit = (): string => {
	const n = Math.random() * 0x100000000;
	const s = Math.floor(n).toString(16);
	return s.length === 8 ? s : s.padStart(8, '0');
};
function generate64bit(): string {
	let id;
	// GUID 用作哈希表键，避免纯数字键降低访问速度
	do {
		id = generate32bit() + generate32bit();
	} while (!/[a-f]/.test(id));
	return id;
}

function getLocalIpAddress(): string[] {
	const interfaces = os.networkInterfaces();
	const results = new Set<string>();

	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]) {
			if (iface.family !== 'IPv4' || iface.internal !== false) continue;

			results.add(iface.address);
		}
	}

	return Array.from(results);
}

let isServerState = false;
ipcMain.on('get-server-state', (event) => {
	event.returnValue = isServerState;
});
ipcMain.handle('start-server', (event, config) => {
	const basePath = path.dirname(config.path);
	const instanceServer = new Koa();
	instanceServer.use(async (ctx) => {
		try {
			const filePath = path.join(basePath, '.preview', ctx.path);
			const ext = path.extname(filePath);
			const type = Mime.lookup(ext) || 'text/plain';
			if (ctx.path === '/') {
				ctx.set('Content-Type', Mime.lookup('html'));
				ctx.body = fs.readFileSync(path.join(filePath, 'index.html'));
			} else {
				ctx.set('Content-Type', type);
				ctx.body = fs.readFileSync(filePath);
			}
		} catch {
			ctx.body = '404 Not Found';
		}
	});

	const server = instanceServer.listen(config.port, () => {
		isServerState = true;
		console.log(`Start Server on http://localhost:${config.port}.`);
	});

	ipcMain.handleOnce('stop-server', () => {
		isServerState = false;
		server.close();
		instanceServer.emit('close');
	});
});

ipcMain.handle('to-qrcode', (event, url) => {
	return QRCode.toDataURL(url, { errorCorrectionLevel: 'H' })
		.then((url) => {
			return url;
		})
		.catch((err) => {
			console.error(err);
		});
});

ipcMain.handle('get-local-ip', () => {
	return getLocalIpAddress();
});

ipcMain.handle('to-excel', async (event, { langs, list }) => {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('open-yami');
	worksheet.columns = [
		{ header: 'ID', key: 'id', width: 20 },
		{ header: 'Name', key: 'name', width: 10 },
		...langs.map((v) => ({ header: v, key: v, width: 10 })),
		{ header: 'parentID', key: 'parentID', width: 20 },
		{ header: 'isDir', key: 'isDir', width: 10 }
	];
	const transformList = (DataList: any[], parentID?: string, isDir?: boolean) => {
		for (let item of DataList) {
			if (item?.class) {
				const id = generate64bit();
				transformList(item.children, id, true);
				worksheet.addRow({
					id: id,
					name: item.name || '',
					parentID,
					isDir: 1
				});
			} else {
				const data = {
					id: item.id,
					name: item.name || '',
					parentID
				};
				langs.forEach((v) => {
					data[v] = item.contents[v];
				});
				worksheet.addRow(data);
			}
		}
	};
	transformList(list);
	const window = getWindowFromEvent(event);
	dialog
		.showSaveDialog(window, {
			title: '保存到Excel',
			filters: [{ name: 'Excel(翻译文件)', extensions: ['xlsx'] }]
		})
		.then((result) => {
			if (result.canceled) return;
			const filePath = result.filePath;
			return workbook.xlsx.writeFile(filePath);
		});
});

ipcMain.handle('from-excel', async (event) => {
	try {
		const window = getWindowFromEvent(event);
		const { filePaths, canceled } = await dialog.showOpenDialog(window, {
			title: '选择导入翻译文件',
			filters: [{ name: 'Excel(翻译文件)', extensions: ['xlsx'] }],
			properties: ['openFile']
		});

		if (canceled || !filePaths || filePaths.length === 0) return [];

		const filePath = filePaths[0];
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.readFile(filePath);

		const worksheet = workbook.getWorksheet('open-yami');
		if (!worksheet) return [];

		// 解析表头：建立列标题到列号的映射
		const headerRow = worksheet.getRow(1);
		const colMap = {};
		headerRow.eachCell((cell, colNumber) => {
			const value = String(cell.value || '').trim();
			if (value) colMap[value] = colNumber;
		});

		const dataMap = new Map();
		const rootNodes = [];

		for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
			const row = worksheet.getRow(rowIndex);
			const isDirCell = row.getCell(colMap['isDir']);
			const isDir = isDirCell && isDirCell.value === 1;

			const rowData = isDir
				? {
						class: 'folder',
						id: row.getCell(colMap['ID']).value,
						name: row.getCell(colMap['Name']).value || '',
						parentID: row.getCell(colMap['parentID']).value,
						expanded: false,
						children: []
					}
				: {
						id: row.getCell(colMap['ID']).value,
						name: row.getCell(colMap['Name']).value,
						parentID: row.getCell(colMap['parentID']).value,
						contents: {}
					};

			if (!isDir) {
				// 收集多语言内容（排除系统列）
				Object.keys(colMap).forEach((key) => {
					if (!['ID', 'Name', 'parentID', 'isDir'].includes(key)) {
						const cellValue = row.getCell(colMap[key]).value;
						rowData.contents[key] = cellValue !== null ? cellValue : '';
					}
				});
			}

			let parent = dataMap.get(rowData.id);
			if (parent && parent.class === 'folder') {
				rowData.children = parent.children;
				dataMap.delete(rowData.id);
			}
			dataMap.set(rowData.id, rowData);

			// 挂载到父节点或作为根节点
			if (rowData.parentID) {
				const parent = dataMap.get(rowData.parentID);
				if (parent) {
					parent.children = parent.children || [];
					parent.children.push(rowData);
				} else {
					dataMap.set(rowData.parentID, {
						class: 'folder',
						id: rowData.parentID,
						name: '',
						expanded: false,
						children: [rowData]
					});
				}
			} else {
				rootNodes.push(rowData);
			}
		}
		return rootNodes;
	} catch {
		return [];
	}
});

// 获取存档目录
ipcMain.on('get-dir-path-sync', (event, location) => {
	switch (location) {
		case 'app-data':
			event.returnValue = app.getPath('appData');
			break;
		case 'documents':
			event.returnValue = app.getPath('documents');
			break;
		case 'desktop':
			event.returnValue = app.getPath('desktop');
			break;
		case 'local':
			event.returnValue = app.getAppPath();
			break;
	}
});

ipcMain.handle('get-dir-path', (event, location) => {
	switch (location) {
		case 'app-data':
			return app.getPath('appData');
		case 'documents':
			return app.getPath('documents');
		case 'desktop':
			return app.getPath('desktop');
		case 'local':
			return app.getAppPath();
	}
});

ipcMain.handle('write-file', (event, filePath, text, check) => {
	return protectPromise(writeFile(filePath, text, check));
});

ipcMain.handle('wait-write-file', () => {
	return Promise.allSettled(promises);
});

ipcMain.on('clipboard-has', (event, format: string) => {
	const buffer = clipboard.readBuffer(format);
	event.returnValue = buffer.length !== 0;
});
ipcMain.on('clipboard-read', (event, format: string) => {
	const buffer = clipboard.readBuffer(format);
	const string = buffer.toString();
	event.returnValue = string ? JSON.parse(string) : null;
});
ipcMain.on('clipboard-write', (event, format: string, object: any) => {
	const string = JSON.stringify(object);
	const buffer = Buffer.from(string);
	clipboard.writeBuffer(format, buffer);
	event.returnValue = undefined;
});

import { promises as FSP } from 'fs';
const writeFile = async (filePath: string, text: string, check?: boolean) => {
	if (check) await FSP.stat(filePath);
	return FSP.writeFile(filePath, text);
};

const promises = [];
const protectPromise = function (promise) {
	promises.push(promise);
	promise.finally(() => {
		const index = promises.indexOf(promise);
		if (index !== -1) {
			promises.splice(index, 1);
		}
	});
	return promise;
};

const extensionPath = path.join('./extension');
app.on('ready', () => {
	createEditorMenu();
	createEditorWindow();
	const isExtension = fs.existsSync(extensionPath);
	if (!isExtension) fs.mkdirSync(extensionPath);
	const dirs = fs.readdirSync(extensionPath);
	dirs.forEach(async (v) => {
		try {
			const p = path.resolve(extensionPath, v);
			await session.defaultSession.loadExtension(p, { allowFileAccess: true });
			console.log(`Loaded extension: ${v}`);
		} catch (err) {
			console.error(`Failed to load extension: ${v}`, err);
		}
	});
});

app.on('window-all-closed', () => {
	app.quit();
});

// 阻止退出直到写入完成
app.on('before-quit', async (event) => {
	event.preventDefault();
	await Promise.allSettled(promises);
	app.exit();
});

const createEditorMenu = function () {
	const template = createMenuTemplate();

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
};

const createMenuTemplate = function () {
	const template = [];
	const file = {
		label: 'File',
		submenu: []
	};
	const edit = {
		label: 'Edit',
		submenu: []
	};
	// 开发模式：开启F5刷新
	if (debug) {
		file.submenu.push({
			label: 'Reload',
			accelerator: 'F5',
			role: 'forceReload'
		});
	}
	if (process.platform !== 'darwin') {
		file.submenu.push({
			label: 'FullScreen',
			accelerator: 'F11',
			role: 'toggleFullScreen'
		});
	}
	file.submenu.push({
		label: 'Toogle DevTools',
		accelerator: 'F12',
		role: 'toggleDevTools'
	});
	// 启用MacOS开发者工具的复制粘贴操作(但跟编辑器冲突)
	if (process.platform === 'darwin' && debug) {
		edit.submenu.push(
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			{ role: 'paste' },
			{ role: 'selectAll' }
		);
	}
	if (file.submenu.length !== 0) {
		template.push(file);
	}
	if (edit.submenu.length !== 0) {
		template.push(edit);
	}
	return template;
};

const createEditorWindow = function () {
	const editor = new BrowserWindow({
		title: 'Yami RPG Editor',
		width: 1600,
		height: 900,
		useContentSize: true,
		backgroundColor: 'white',
		frame: process.platform === 'darwin',
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			spellcheck: false,
			additionalArguments: ['--disable-security-warnings', ...(debug ? ['--debug-mode'] : [])]
		}
	}) as BrowserWindow & BrowserWindowExtension;

	editor.setMenuBarVisibility(process.platform === 'darwin');

	if (useViteDev) {
		// Vite dev 模式：载 dev server URL，HMR + 模块解析由 Vite 接管
		editor.loadURL(VITE_DEV_URL);
	} else {
		// prod 模式：载 dist/index.html（vite build 产物）
		const indexPath = path.resolve(dirname, 'dist/index.html');
		editor.loadFile(indexPath);
	}

	editor.on('maximize', () => editor.send('maximize'));
	editor.on('unmaximize', () => editor.send('unmaximize'));
	editor.on('enter-full-screen', () => editor.send('enter-full-screen'));
	editor.on('leave-full-screen', () => editor.send('leave-full-screen'));

	// 加载配置文件并设置缩放系数
	const configPath = path.resolve(path.join(os.homedir(), '.openyami'), 'config.json');
	const promise = FSP.readFile(configPath);
	editor.once('ready-to-show', () => {
		editor.maximize();
		promise
			.then((config: Buffer) => {
				editor.webContents.setZoomFactor(JSON.parse(config.toString()).zoom);
			})
			.catch(() => {
				editor.webContents.setZoomFactor(1);
			});
	});

	let forceCloseId: NodeJS.Timeout | null = null;

	// 计划强制关闭应用
	function scheduleForceClose() {
		forceCloseId = setTimeout(() => {
			if (!editor.stopCloseEvent) {
				editor.stopCloseEvent = true;
				editor.close();
			}
		}, 2000);
	}

	// 取消强制关闭应用
	function cancelForceClose() {
		if (forceCloseId !== null) {
			clearTimeout(forceCloseId);
			forceCloseId = null;
		}
	}
	editor.cancelForceClose = cancelForceClose;

	editor.on('close', (event) => {
		if (!editor.stopCloseEvent) {
			apkProcessor.abortBuild();
			editor.send('before-close-window');
			event.preventDefault();
			scheduleForceClose();
		}
	});

	global.editor = editor;

	ipcMain.handle('build-apk', (event, config) => {
		const send = (data: any) => {
			if (!editor.isDestroyed()) editor.send('apk-log', data);
		};
		if (apkProcessor.isBuilding()) {
			send({
				done: true,
				msg: `当前已有构建任务正在进行中`
			});
			return;
		}
		try {
			apkProcessor.main({
				config,
				onProgress: (step: string, percentage: number, isError?: boolean) => {
					if (isError) {
						send({
							done: true,
							msg: `[${percentage}%] 错误: ${step}`
						});
					} else {
						const data = {
							done: false,
							msg: `[${percentage}%] 进度: ${step}`
						};
						if (Number(step) == 100) {
							data.done = true;
						}
						send(data);
					}
				}
			});
		} catch (err) {
			send({
				done: true,
				msg: `错误: ${err}`
			});
		}
	});
	ipcMain.on('isBuilding-apk', (event) => {
		event.returnValue = apkProcessor.isBuilding();
	});

	ipcMain.handle('stop-build-apk', () => {
		apkProcessor.abortBuild();
	});

	ipcMain.on('start-tsc', (event, projectDir) => {
		startTSC(path.normalize(projectDir));
	});

	ipcMain.on('stop-tsc', () => {
		stopTSC();
	});

	// 获取tsc原生可执行文件路径
	function getTsgoExePath(): string {
		const platform = process.platform;
		const arch = process.arch;
		const expectedPackage = 'typescript-' + platform + '-' + arch;
		const platformPackageName = '@typescript/' + expectedPackage;
		let exeDir;
		try {
			const packageJsonPath = require.resolve(platformPackageName + '/package.json');
			exeDir = path.join(path.dirname(packageJsonPath), 'lib');
		} catch {
			try {
				const nativePreviewDir = path.dirname(require.resolve('typescript/package.json'));
				exeDir = path.join(nativePreviewDir, '..', expectedPackage, 'lib');
			} catch {
				const nodeModulesDir = path.resolve(__dirname, '../node_modules');
				exeDir = path.join(nodeModulesDir, platformPackageName, 'lib');
			}
		}
		let exe = path.join(exeDir, 'tsc');
		if (platform === 'win32') {
			exe += '.exe';
			if (exe.length >= 248) {
				exe = '\\\\?\\' + exe;
			}
		}
		if (!fs.existsSync(exe)) {
			throw new Error('Executable not found: ' + exe);
		}
		return exe;
	}

	ipcMain.handle('tsc-file', async (event, code) => {
		let res, error;
		try {
			// 使用tsgo可执行文件编译，通过标准输入/输出处理代码
			const tsgo = spawn(
				getTsgoExePath(),
				['--target', 'ES2022', '--module', 'ESNext', '--outFile', '-'],
				{
					stdio: ['pipe', 'pipe', 'pipe']
				}
			);

			let stdout = '',
				stderr = '';
			tsgo.stdout.on('data', (data) => {
				stdout += data.toString();
			});
			tsgo.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			tsgo.stdin.write(code);
			tsgo.stdin.end();

			await new Promise((resolve, reject) => {
				tsgo.on('close', (code) => {
					if (code !== 0) {
						error = new Error(stderr || 'Compilation failed');
					} else {
						res = stdout;
					}
					resolve(undefined);
				});
				tsgo.on('error', reject);
			});
		} catch (e) {
			error = e;
		}
		return { res, error };
	});

	let tscProcess = null;

	// 启动TSC
	function startTSC(projectDir: string) {
		if (tscProcess) {
			stopTSC(() => startTSC(projectDir));
			return;
		}
		const tsgoExe = getTsgoExePath();
		tscProcess = spawn(tsgoExe, ['--watch'], {
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: projectDir
		});
		tscProcess.stdout.on('data', (data) => {
			if (!editor.isDestroyed()) editor.send('tsc-log', data.toString());
		});
		tscProcess.stderr.on('data', (data) => {
			if (!editor.isDestroyed()) editor.send('tsc-log', data.toString());
		});
	}

	// 停止TSC
	function stopTSC(callback?: () => void) {
		if (tscProcess) {
			tscProcess.kill();
			tscProcess.on('close', () => {
				tscProcess = null;
				callback?.();
			});
		} else {
			callback?.();
		}
	}
};

const createPlayerWindow = function (
	parent: BrowserWindow & BrowserWindowExtension,
	projectDir: string
): BrowserWindow & BrowserWindowExtension {
	const config = path.resolve(projectDir, 'Data/config.json');
	const window = (
		JSON.parse(fs.readFileSync(config).toString()) as {
			window: {
				title: string;
				width: number;
				height: number;
				display?: string;
			};
		}
	).window;

	// WIN窗口大小调整：减去菜单栏的高度
	let windowHeight = window.height;
	if (process.platform === 'win32') {
		windowHeight = Math.max(windowHeight - 20, 0);
	}

	const player = new BrowserWindow({
		icon: `${projectDir}Icon/icon.png`,
		title: window.title,
		width: window.width,
		height: windowHeight,
		useContentSize: true,
		backgroundColor: 'black',
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			spellcheck: false,
			additionalArguments: ['--disable-security-warnings', '--debug-mode']
		}
	}) as BrowserWindow & BrowserWindowExtension;
	player.config = window;

	player.setMenuBarVisibility(false);

	player.loadFile(`${projectDir}index.html`);

	player.once('ready-to-show', () => {
		player.show();
		switch (window.display) {
			case 'windowed':
				break;
			case 'maximized':
				player.maximize();
				break;
			case 'fullscreen':
				player.setFullScreen(true);
				break;
		}
	});

	player.on('close', (event) => {
		if (!player.stopCloseEvent) {
			player.send('before-close-window');
			event.preventDefault();
			// 如果渲染线程未响应，超时2秒后关闭窗口
			setTimeout(() => {
				if (!player.stopCloseEvent) {
					player.stopCloseEvent = true;
					player.close();
				}
			}, 2000);
		}
	});

	player.once('closed', () => {
		if (parent && !parent?.isDestroyed()) {
			parent.send('player-window-closed');
		}
	});
	return player;
};

// 获取事件来源窗口
const getWindowFromEvent = function (
	event: IpcMainEvent | IpcMainInvokeEvent
): (BrowserWindow & BrowserWindowExtension) | null {
	return BrowserWindow.fromWebContents(event.sender) as
		| (BrowserWindow & BrowserWindowExtension)
		| null;
};

ipcMain.on('minimize-window', (event) => {
	const window = getWindowFromEvent(event);
	if (window.isMinimized()) {
		window.restore();
	} else {
		window.minimize();
	}
});

ipcMain.on('maximize-window', (event) => {
	const window = getWindowFromEvent(event);
	if (!window.isFullScreen()) {
		if (window.isMaximized()) {
			window.unmaximize();
		} else {
			window.maximize();
		}
	}
});

ipcMain.on('close-window', (event) => {
	const window = getWindowFromEvent(event);
	window.close();
});

ipcMain.on('prevent-close-window', (event) => {
	const window = getWindowFromEvent(event);
	window.cancelForceClose();
});

ipcMain.on('force-close-window', (event) => {
	const window = getWindowFromEvent(event);
	window.stopCloseEvent = true;
	window.close();
});

ipcMain.on('toggle-full-screen', (event) => {
	const window = getWindowFromEvent(event);
	window.setFullScreen(!window.isFullScreen());
});

ipcMain.on('open-path', (event, targetPath) => {
	shell.openPath(path.normalize(targetPath));
});

// 使用VSCode打开脚本
ipcMain.on('open-vscode', (event, scriptPath, line, column) => {
	const url = `${path.normalize(scriptPath)}:${line}:${column}`;
	shell.openExternal(`vscode://file/${url}`);
});

ipcMain.on('show-item-in-folder', (event, filePath) => {
	shell.showItemInFolder(path.normalize(filePath));
});

let currentprojectPath = '';
let currentPlayerWindow = null;
ipcMain.on('create-player-window', (event, projectPath) => {
	const window = getWindowFromEvent(event);
	currentprojectPath = projectPath;
	currentPlayerWindow = createPlayerWindow(window, projectPath);
});

ipcMain.handle('update-max-min-icon', (event) => {
	const window = getWindowFromEvent(event);
	return window.isMaximized()
		? 'maximize'
		: window.isFullScreen()
			? 'enter-full-screen'
			: 'unmaximize';
});

ipcMain.handle('show-open-dialog', (event, options) => {
	const window = getWindowFromEvent(event);
	return dialog.showOpenDialog(window, options);
});

ipcMain.handle('show-save-dialog', (event, options) => {
	const window = getWindowFromEvent(event);
	return dialog.showSaveDialog(window, options);
});

ipcMain.handle('trash-item', (event, filePath) => {
	return shell.trashItem(path.normalize(filePath));
});

// 设置设备像素比率
ipcMain.on('set-device-pixel-ratio', (event, ratio) => {
	const window = getWindowFromEvent(event);
	// MacOS不像Windows一样锁定窗口最大化
	if (process.platform === 'darwin') {
		if (window.isMaximized() || window.isFullScreen()) {
			return;
		}
	}
	const bounds = window.getContentBounds();
	const config = (
		window as BrowserWindow &
			BrowserWindowExtension & { config?: { width: number; height: number } }
	).config;
	const width = Math.round(config!.width / ratio);
	const height = Math.round(config!.height / ratio);
	const x = bounds.x + ((bounds.width - width) >> 1);
	const y = bounds.y + ((bounds.height - height) >> 1);
	// electron bug：非100%缩放时，窗口位置不能完美地被设置
	window.setContentBounds({ x, y, width, height });
});

ipcMain.on('open-devTools', (event) => {
	event.sender.openDevTools();
});

ipcMain.on('set-display-mode', (event, display) => {
	const window = getWindowFromEvent(event);
	switch (display) {
		case 'windowed':
			if (window.isFullScreen()) {
				window.setFullScreen(false);
			}
			if (window.isMaximized()) {
				window.unmaximize();
			}
			break;
		case 'maximized':
			if (window.isFullScreen()) {
				window.setFullScreen(false);
			}
			if (!window.isMaximized()) {
				window.maximize();
			}
			break;
		case 'fullscreen':
			if (!window.isFullScreen()) {
				window.setFullScreen(true);
			}
			break;
	}
});

// commandLine
ipcMain.on('get-command-line-switch', (event, name) => {
	event.returnValue = app.commandLine.getSwitchValue(name);
});

ipcMain.on('add-command-line-switch', (event, name, value) => {
	if (value) {
		app.commandLine.appendSwitch(name, value);
	} else {
		app.commandLine.appendSwitch(name);
	}
});

ipcMain.on('remove-command-line-switch', (event, name) => {
	app.commandLine.removeSwitch(name);
});

ipcMain.on('has-command-line-switch', (event, name) => {
	event.returnValue = app.commandLine.hasSwitch(name);
});

// 重启应用
ipcMain.handle('relaunch-app', async (event) => {
	try {
		const window = getWindowFromEvent(event);
		// 如果有窗口，等待它真正关闭
		if (currentPlayerWindow) {
			return await new Promise((resolve) => {
				currentPlayerWindow.once('closed', () => {
					currentPlayerWindow = createPlayerWindow(window, currentprojectPath);
					resolve({ success: true });
				});
				currentPlayerWindow.destroy();
			});
		}
		currentPlayerWindow = createPlayerWindow(window, currentprojectPath);
		return { success: true };
	} catch (error) {
		return { success: false, message: (error as Error).message };
	}
});
