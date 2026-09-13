import { Timer } from '@/util/timer.ts';
import { Data } from '@/data/data-object.ts';
import { Window } from '@/tools/window-object.ts';
import { GL } from '@/webgl/webgl-init.ts';
import { Menu } from './menu-list.ts';
import { TextBox } from './text-box.ts';
import { Directory } from '@/file/directory-object.ts';
import { FileItem } from '@/file/file-item.ts';
import { File } from '@/file/file-system-core.ts';
import { FSP } from '@/file/file-system.ts';
import { FolderItem } from '@/file/folder-item.ts';
import { Reference } from '@/log/related-references.ts';
import { Editor } from '@/main/editor.ts';
import { Local } from '@/tools/localization.ts';
import { Path } from '@/util/config.ts';
import { FileBrowserLinks } from '@/types/file-browser-links.ts';

export class FileBodyPane extends HTMLElement {
	viewIndex: number | null;
	viewMode: string | null;
	timer: any;
	elements: any[] & {
		versionId: number;
		count: number;
		start: number;
		end: number;
	};
	activeFile: FileItem | null;
	selections: any[];
	content: HTMLElement & {
		range: Uint32Array;
		count: number;
		itemSize: number;
		visibleLines: number;
		normalCountPerLine: number;
		scrollCountPerLine: number;
		scrollCount: number;
		countPerLine: number;
	};
	pressing: ((event: PointerEvent) => void) | null;
	windowKeydown: (event: KeyboardEvent) => void;
	windowKeyup: (event: KeyboardEvent) => void;
	windowPointermove: (event: PointerEvent) => void;
	openEventEnabled: boolean;
	selectEventEnabled: boolean;
	unselectEventEnabled: boolean;
	popupEventEnabled: boolean;
	textBox: TextBox;
	declare links: FileBrowserLinks;

	constructor() {
		super();

		const timer = new Timer({
			duration: 500,
			callback: (timer: any) => {
				const files = this.selections;
				if (files.length === 1) {
					const file = files[0];
					const target = timer.target;
					const context = file.getContext(this);
					const element = context.element;
					if (element.contains(target)) {
						this.rename(file);
					}
				}
				timer.target = null;
				timer.running = false;
			}
		});

		this.viewIndex = null;
		this.viewMode = null;
		this.timer = timer;
		this.elements = [] as any;
		this.elements.versionId = 0;
		this.elements.count = 0;
		this.elements.start = -1;
		this.elements.end = -1;
		this.activeFile = null;
		this.selections = [];
		this.content = document.createElement('file-body-content') as any;
		this.content.tabIndex = 0;
		this.content.range = new Uint32Array(2);
		this.pressing = null;
		this.windowKeydown = FileBodyPane.windowKeydown.bind(this);
		this.windowKeyup = FileBodyPane.windowKeyup.bind(this);
		this.windowPointermove = FileBodyPane.windowPointermove.bind(this);
		this.openEventEnabled = false;
		this.selectEventEnabled = false;
		this.unselectEventEnabled = false;
		this.popupEventEnabled = false;
		this.textBox = FileBodyPane.textBox;

		const { elements } = this;
		Object.defineProperty(this.content, 'countPerLine', {
			get: function (this: any) {
				return elements.count < this.scrollCount
					? this.normalCountPerLine
					: this.scrollCountPerLine;
			}
		});

		this.on('scroll', this.resize);
		this.on('keydown', this.keydown);
		this.on('pointerdown', this.pointerdown);
		this.on('pointerup', this.pointerup);
		this.on('doubleclick', this.doubleclick);
		this.on('wheel', this.wheel);
		window.on('keydown', this.windowKeydown);
	}

	setViewIndex(viewIndex: number): void {
		viewIndex = Math.clamp(viewIndex, 0, 4);
		if (this.viewIndex !== viewIndex) {
			const { head } = this.links;
			this.viewIndex = viewIndex;
			(head as any).view.write(viewIndex);
			this.updateViewMode();
		}
	}

	updateViewMode(): void {
		let viewMode: string | null = null;
		switch (this.viewIndex) {
			case 0:
				viewMode = 'list';
				break;
			case 1:
				viewMode = 'small';
				break;
			case 2:
				viewMode = 'medium';
				break;
			case 3:
				viewMode = 'large';
				break;
			case 4:
				viewMode = 'huge';
				break;
		}
		if (this.viewMode !== viewMode) {
			viewMode === 'list' ? this.addClass('horizontal') : this.removeClass('horizontal');
			this.content.removeClass(this.viewMode!);
			this.content.addClass(viewMode!);
			this.resetContentStyle();
			this.viewMode = viewMode;
			this.computeGridProperties();
			this.resize();
			this.updateContentOffset();
		}
	}

	getFiles(): any[] {
		const { browser, nav } = this.links;
		const folders = nav.selections;
		const filters = browser.filters;
		if (!filters) {
			let length = 0;
			for (const folder of folders) {
				length += folder.children.length;
			}
			let i = 0;
			const items = new Array(length);
			for (const folder of folders) {
				for (const item of folder.children) {
					items[i++] = item;
				}
			}
			return items;
		}
		const items: any[] = [];
		for (const folder of folders) {
			for (const item of folder.children) {
				if (item instanceof FolderItem || filters.includes(item.type)) {
					items.push(item);
				}
			}
		}
		return items;
	}

	updateFiles(): void {
		const { elements } = this;
		elements.start = -1;
		elements.count = 0;

		const { browser } = this.links;
		switch (browser.display) {
			case 'normal':
				this.createFlatItems(this.getFiles());
				break;
			case 'search':
				this.createFlatItems(browser.searchResults);
				break;
		}

		this.clearElements(elements.count);

		this.resize();
	}

	resize(): void {
		const ch = this.clientHeight;
		const elements = this.elements;
		if (ch === 0) {
			return;
		}
		const [start, end] = this.computeStartAndEnd();
		this.updateContentSize();
		if (elements.start !== start || elements.end !== end) {
			elements.start = start;
			elements.end = end;
			this.updateContentOffset();
			const versionId = elements.versionId++;
			for (let i = start; i < end; i++) {
				const element = elements[i];
				element.versionId = versionId;
				this.updateOnResize(element);
			}
			const content = this.content;
			const nodes = content.childNodes;
			const last = nodes.length - 1;
			for (let i = last; i >= 0; i--) {
				const element = nodes[i] as any;
				if (element.versionId !== versionId) {
					element.remove();
				}
			}
			const foot = elements[end - 1];
			if (foot && !foot.parentNode) {
				content.appendChild(foot);
			}
			for (let i = end - 2; i >= start; i--) {
				const element = elements[i];
				if (element.parentNode === null) {
					const next = elements[i + 1];
					content.insertBefore(element, next);
				}
			}
		}
	}

	computeGridProperties(): void {
		this.content.count = -1;
		switch (this.viewMode) {
			case 'list':
				return this.computeListGridProperties();
			case 'small':
				return this.computeTileGridProperties(40, 72);
			case 'medium':
				return this.computeTileGridProperties(72, 104);
			case 'large':
				return this.computeTileGridProperties(136, 168);
			case 'huge':
				return this.computeTileGridProperties(264, 296);
		}
	}

	computeListGridProperties(): void {
		const { content } = this;
		const WIDTH = 240;
		const HEIGHT = 20;
		const PADDING = 4;
		const GAP = 2;
		const SCROLLBAR_HEIGHT = 12;
		const rect = this.rect();
		const cw = rect.width;
		const ch = rect.height;
		const ow = Math.max(cw - PADDING * 2 + GAP, 0);
		const oh = Math.max(ch - PADDING * 2, 0);
		const iw = WIDTH + GAP;
		const ih = HEIGHT;
		const visibleLines = Math.ceil((cw + GAP) / iw) + 1;
		const normalCountPerLine = Math.max(Math.floor(oh / ih), 1);
		const scrollCountPerLine = Math.max(Math.floor((oh - SCROLLBAR_HEIGHT) / ih), 1);
		const scrollCount = Math.floor(ow / iw) * normalCountPerLine + 1;
		content.itemSize = iw;
		content.visibleLines = visibleLines;
		content.normalCountPerLine = normalCountPerLine;
		content.scrollCountPerLine = scrollCountPerLine;
		content.scrollCount = scrollCount;
	}

	computeTileGridProperties(width: number, height: number): void {
		const { content } = this;
		const PADDING = 4;
		const GAP = 2;
		const SCROLLBAR_WIDTH = 12;
		const rect = this.rect();
		const cw = rect.width;
		const ch = rect.height;
		const ow = Math.max(cw - PADDING * 2 + GAP, 0);
		const oh = Math.max(ch - PADDING * 2 + GAP, 0);
		const iw = width + GAP;
		const ih = height + GAP;
		const visibleLines = Math.ceil((ch + GAP) / ih) + 1;
		const normalCountPerLine = Math.max(Math.floor(ow / iw), 1);
		const scrollCountPerLine = Math.max(Math.floor((ow - SCROLLBAR_WIDTH) / iw), 1);
		const scrollCount = Math.floor(oh / ih) * normalCountPerLine + 1;
		content.itemSize = ih;
		content.visibleLines = visibleLines;
		content.normalCountPerLine = normalCountPerLine;
		content.scrollCountPerLine = scrollCountPerLine;
		content.scrollCount = scrollCount;
	}

	computeStartAndEnd(): Uint32Array {
		const { range } = this.content;
		const { count } = this.elements;
		const scroll =
			this.viewMode === 'list'
				? Math.max(this.scrollLeft - 4, 0)
				: Math.max(this.scrollTop - 4, 0);
		const { countPerLine, itemSize, visibleLines } = this.content;
		const lines = Math.ceil(count / countPerLine);
		const sLine = Math.clamp(Math.floor(scroll / itemSize), 0, lines - 1);
		const start = countPerLine * sLine;
		const length = countPerLine * visibleLines;
		const end = Math.min(start + length, count);
		range[0] = start;
		range[1] = end;
		return range;
	}

	updateContentSize(): void {
		const { content } = this;
		const { count } = this.elements;
		if (this.clientHeight !== 0 && content.count !== count) {
			content.count = count;
			const PADDING = 4;
			const GAP = 2;
			const { style, countPerLine, itemSize } = content;
			const lines = Math.ceil(count / countPerLine);
			const length = Math.max(lines * itemSize - GAP, 0) + PADDING * 2;
			if (this.viewMode === 'list') {
				style.width = `${length}px`;
			} else {
				style.height = `${length}px`;
			}
		}
	}

	updateContentOffset(): void {
		const PADDING = 4;
		const { start } = this.elements;
		const { style, countPerLine, itemSize } = this.content;
		const padding = (start / countPerLine) * itemSize + PADDING;
		if (this.viewMode === 'list') {
			style.paddingLeft = `${padding}px`;
		} else {
			style.paddingTop = `${padding}px`;
		}
	}

	resetContentStyle(): void {
		this.content.count = -1;
		const { style } = this.content;
		switch (this.viewMode) {
			case 'list':
				style.width = '';
				style.paddingLeft = '';
				break;
			default:
				style.height = '';
				style.paddingTop = '';
				break;
		}
	}

	updateOnResize(element: any): void {
		if (element.changed) {
			element.changed = false;
			const { file } = element;
			if (file instanceof FileItem) {
				this.updateFileElement(element);
				return;
			}
			if (file instanceof FolderItem) {
				this.updateFolderElement(element);
				return;
			}
		}
	}

	createFlatItems(dir: any[]): void {
		Directory.sortFiles(dir);
		const elements = this.elements;
		const length = dir.length;
		for (let i = 0; i < length; i++) {
			const file = dir[i];
			if (file instanceof FileItem) {
				elements[elements.count++] = this.createFileElement(file);
				continue;
			}
			if (file instanceof FolderItem) {
				elements[elements.count++] = this.createFolderElement(file);
				continue;
			}
		}
	}

	createFolderElement(file: any): HTMLElement {
		const context = file.getContext(this);
		let element = context.element;
		if (element === undefined) {
			element = document.createElement('file-body-item') as unknown as HTMLElement & {
				file: any;
				context: any;
				changed?: boolean;
			};
			(element as HTMLElement & { file: any; context: any }).file = file;
			(element as HTMLElement & { file: any; context: any }).context = context;
			context.element = element;

			const { selections } = this;
			if (selections.length !== 0 && selections.includes(file)) {
				(element as HTMLElement).addClass('selected');
			}
		}
		(element as HTMLElement & { changed?: boolean }).changed = true;
		return element;
	}

	updateFolderElement(element: any): void {
		if (!element.nameBox) {
			const fileIcon = document.createElement('file-body-icon');
			fileIcon.addClass('icon-folder');
			element.appendChild(fileIcon);

			const nameBox = document.createElement('file-body-name');
			nameBox.textContent = element.file.name;
			element.appendChild(nameBox);

			element.draggable = true;
			element.fileIcon = fileIcon;
			element.nameBox = nameBox;
		}
	}

	createFileElement(file: any): HTMLElement {
		const context = file.getContext(this);
		let element = context.element;
		if (element === undefined) {
			element = document.createElement('file-body-item') as unknown as HTMLElement & {
				file: any;
				context: any;
				changed?: boolean;
			};
			(element as HTMLElement).addClass('file-item');
			(element as HTMLElement & { file: any; context: any }).file = file;
			(element as HTMLElement & { file: any; context: any }).context = context;
			context.element = element;
		}
		(element as HTMLElement & { changed?: boolean }).changed = true;
		return element;
	}

	updateFileElement(element: any): void {
		const { file } = element;
		if (!element.nameBox) {
			const fileIcon = this.createIcon(file);
			element.appendChild(fileIcon);

			const nameBox = document.createElement('file-body-name');
			nameBox.textContent = file.basename;
			element.appendChild(nameBox);

			element.draggable = true;
			element.fileIcon = fileIcon;
			element.nameBox = nameBox;

			const { selections } = this;
			if (selections.length !== 0 && selections.includes(file)) {
				element.addClass('selected');
			}
		}
		if (element.fileIcon.isImageChanged?.()) {
			this.updateIcon(file);
		}
	}

	createIcon(file: any): HTMLElement {
		const icon = document.createElement('file-body-icon');
		switch (file.type) {
			case 'actor': {
				const data = file.data;
				if (!data?.portrait) {
					icon.addClass('icon-file-actor');
					break;
				}
				const meta = (Data as any).manifest.guidMap[data.portrait];
				const [cx, cy, cw, ch] = data.clip;
				if (!meta || cw * ch === 0) break;
				const version = meta.mtimeMs;
				const path = `${File.getPath(data.portrait)}?ver=${version}`;
				(icon as any).isImageChanged = () => version !== meta.mtimeMs;
				this.setIconClip(icon, path, cx, cy, cw, ch);
				break;
			}
			case 'skill':
			case 'item':
			case 'equipment':
			case 'state': {
				const data = file.data;
				if (!data?.icon) {
					icon.addClass('icon-file-cube');
					break;
				}
				const meta = (Data as any).manifest.guidMap[data.icon];
				const [cx, cy, cw, ch] = data.clip;
				if (!meta || cw * ch === 0) break;
				const version = meta.mtimeMs;
				const path = `${File.getPath(data.icon)}?ver=${version}`;
				(icon as any).isImageChanged = () => version !== meta.mtimeMs;
				this.setIconClip(icon, path, cx, cy, cw, ch);
				break;
			}
			case 'trigger':
				icon.addClass('icon-file-trigger');
				break;
			case 'event':
				icon.addClass('icon-file-event');
				icon.textContent = 'EV';
				if (!file.data?.enabled) {
					icon.addClass('disabled');
				}
				break;
			case 'scene':
				icon.addClass('icon-file-scene');
				break;
			case 'tileset':
				icon.addClass('icon-file-tileset');
				break;
			case 'ui':
				icon.addClass('icon-file-ui');
				break;
			case 'animation':
				icon.addClass('icon-file-animation');
				break;
			case 'particle':
				icon.addClass('icon-file-particle');
				break;
			case 'image': {
				const version = file.stats.mtimeMs;
				const path = `${file.path}?ver=${version}`;
				(icon as HTMLElement).style.backgroundImage = CSS.encodeURL(File.route(path));
				(File as any)
					.getImageResolution(path)
					.then(({ width, height }: { width: number; height: number }) => {
						if (width <= 128 && height <= 128) {
							(icon as HTMLElement).style.imageRendering = 'pixelated';
						}
						if (Math.max(width, height) > GL.maxTexSize) {
							(FileItem as any).addOversizeImagePaths(file.path);
						}
					});
				break;
			}
			case 'audio':
				icon.addClass('icon-file-event');
				icon.addClass('icon-file-audio');
				icon.textContent = '\uf028';
				break;
			case 'video':
				icon.addClass('icon-file-event');
				icon.addClass('icon-file-video');
				icon.textContent = '\uf008';
				break;
			case 'font':
				icon.addClass('icon-file-font');
				break;
			case 'script':
				icon.addClass('icon-file-event');
				icon.addClass('icon-file-script');
				switch (file.extname) {
					case '.js':
						icon.textContent = 'JS';
						break;
					case '.ts':
						icon.textContent = 'TS';
						break;
				}
				break;
			default:
				icon.addClass('icon-file-other');
				icon.textContent = file.extname.slice(1);
				break;
		}
		return icon;
	}

	updateIcon(file: any): void {
		const { element } = file.getContext(this);
		if (element?.fileIcon) {
			const icon = this.createIcon(file);
			element.replaceChild(icon, element.fileIcon);
			element.fileIcon = icon;
		}
	}

	setIconClip(
		icon: HTMLElement,
		path: string,
		cx: number,
		cy: number,
		cw: number,
		ch: number
	): void {
		(File as any)
			.getImageResolution(path)
			.then(({ width, height }: { width: number; height: number }) => {
				if (cw < 0) {
					cw = Math.floor(width / -cw);
					ch = Math.floor(height / -ch);
					if (cw * ch === 0) {
						return;
					}
				}
				if (cw !== ch) {
					if (cw > ch) {
						const oy = (cw - ch) / 2;
						const t = (100 * oy) / cw;
						const b = 100 - t;
						cy -= oy;
						(icon as HTMLElement).style.clipPath =
							`polygon(0 ${t}%, 100% ${t}%, 100% ${b}%, 0 ${b}%)`;
					} else {
						const ox = (ch - cw) / 2;
						const l = (100 * ox) / ch;
						const r = 100 - l;
						cx -= ox;
						(icon as HTMLElement).style.clipPath =
							`polygon(${l}% 0, ${r}% 0, ${r}% 100%, ${l}% 100%)`;
					}
				}
				const size = Math.max(cw, ch);
				const sx = width / size;
				const sy = height / size;
				const px = sx !== 1 ? cx / size / (sx - 1) : 0;
				const py = sy !== 1 ? cy / size / (sy - 1) : 0;
				(icon as HTMLElement).style.backgroundImage = CSS.encodeURL(File.route(path));
				(icon as HTMLElement).style.backgroundPosition = `${px * 100}% ${py * 100}%`;
				(icon as HTMLElement).style.backgroundSize = `${sx * 100}% ${sy * 100}%`;
				if (size <= 128) {
					(icon as HTMLElement).style.imageRendering = 'pixelated';
				}
			});
	}

	activateFile(file: any): void {
		if (file instanceof FolderItem) {
			return this.select(file);
		}
		this.activeFile = file;
		if (!this.selections.includes(file)) {
			const context = file.getContext(this);
			context.element.addClass('selected');
			for (const file of this.selections) {
				const context = file.getContext(this);
				context.element?.removeClass('selected');
			}
		}
		const pointerup = (event: PointerEvent) => {
			if (this.pressing === pointerup) {
				this.pressing = null;
				this.selectActiveFile();
			}
		};
		this.pressing = pointerup;
		window.on('pointerup', pointerup, { once: true });
	}

	deactivateFile(): void {
		if (this.activeFile instanceof FileItem) {
			if (!this.selections.includes(this.activeFile)) {
				const context = this.activeFile.getContext(this);
				context.element.removeClass('selected');
				for (const file of this.selections) {
					const context = file.getContext(this);
					context.element?.addClass('selected');
				}
			}
			this.activeFile = null;
		}
	}

	selectActiveFile(): void {
		if (this.activeFile instanceof FileItem) {
			if (!this.selections.includes(this.activeFile)) {
				this.select(this.activeFile);
			}
			this.activeFile = null;
		}
	}

	select(...files: any[]): void {
		this.unselect();
		this.selections = files;
		for (const file of files) {
			const context = file.getContext(this);
			context.element?.addClass('selected');
		}
		if (this.selectEventEnabled) {
			const select: any = new Event('select');
			select.value = files;
			this.dispatchEvent(select);
		}
	}

	selectAll(): void {
		const { elements } = this;
		const { count } = elements;
		const files = new Array(count);
		for (let i = 0; i < count; i++) {
			files[i] = elements[i].file;
		}
		this.select(...files);
	}

	unselect(): void {
		const files = this.selections;
		if (files.length !== 0) {
			FileBodyPane.textBox.input.blur();
			for (const file of files) {
				const context = file.getContext(this);
				const element = context.element;
				if (element !== undefined) {
					element.removeClass('selected');
				}
			}
			this.selections = [];
			if (this.unselectEventEnabled) {
				const unselect: any = new Event('unselect');
				unselect.value = files;
				this.dispatchEvent(unselect);
			}
		}
	}

	selectByPath(path: string): void {
		const { elements } = this;
		const { count } = elements;
		for (let i = 0; i < count; i++) {
			const { file } = elements[i];
			if (file.path === path) {
				return this.select(file);
			}
		}
		this.unselect();
	}

	selectDefault(): void {
		const { elements } = this;
		const { count } = elements;
		for (let i = 0; i < count; i++) {
			if (elements[i].hasClass('selected')) {
				return;
			}
		}
		if (count !== 0) {
			this.select(elements[0].file);
		}
	}

	selectRelativeInGridMode(direction: 'prev' | 'next' | 'prev-line' | 'next-line'): void {
		const { elements } = this;
		const { count } = elements;
		if (count > 0) {
			let index: number;
			let start = Infinity;
			let end = -Infinity;
			const { selections } = this;
			for (const file of selections) {
				const { element } = file.getContext(this);
				const index = elements.indexOf(element);
				if (index !== -1) {
					start = Math.min(start, index);
					end = Math.max(end, index);
				}
			}
			if (start === Infinity) {
				switch (direction) {
					case 'prev':
					case 'prev-line':
						index = count - 1;
						break;
					case 'next':
					case 'next-line':
						index = 0;
						break;
				}
			} else {
				const { countPerLine } = this.content;
				switch (direction) {
					case 'prev':
						index = start - 1;
						break;
					case 'next':
						index = end + 1;
						break;
					case 'prev-line':
						index = start - countPerLine;
						break;
					case 'next-line':
						index = end + countPerLine;
						if (index >= count) {
							const line = Math.floor(index / countPerLine);
							const head = line * countPerLine;
							if (count > head) {
								index = count - 1;
							}
						}
						break;
				}
			}
			const file = elements[index]?.file;
			if (file === undefined) return;
			if (!(selections.length === 1 && selections[0] === file)) {
				this.select(file);
			}
			this.scrollToSelectionInGridMode();
		}
	}

	scrollToSelectionInGridMode(mode: string = 'active'): void {
		const { selections } = this;
		if (selections.length === 1 && (this as any).hasScrollBar()) {
			const selection = selections[0];
			const elements = this.elements;
			const count = elements.count;
			for (let i = 0; i < count; i++) {
				if (elements[i].file === selection) {
					const size = this.content.itemSize;
					const apl = this.content.countPerLine;
					const pos = Math.floor(i / apl) * size;
					const PADDING = 4;
					const GAP = 2;
					let property: 'scrollLeft' | 'scrollTop';
					let clientSize: number;
					switch (this.viewMode) {
						case 'list':
							property = 'scrollLeft';
							clientSize = this.clientWidth;
							break;
						default:
							property = 'scrollTop';
							clientSize = this.clientHeight;
							break;
					}
					let scroll = (this as any)[property];
					switch (mode) {
						case 'active':
							scroll = Math.clamp(
								scroll,
								pos + size + PADDING * 2 - GAP - clientSize,
								pos
							);
							break;
						default:
							return;
					}
					if ((this as any)[property] !== scroll) {
						(this as any)[property] = scroll;
					}
					break;
				}
			}
		}
	}

	getDirName(): string {
		let dirname = '';
		const files = this.selections;
		switch (files.length) {
			case 0: {
				const { nav } = this.links;
				const folders = nav.selections;
				if (folders.length === 1) {
					dirname = folders[0].path;
				}
				break;
			}
			case 1: {
				const file = files[0];
				dirname = file.path;
				if (file instanceof FileItem) {
					dirname = Path.dirname(dirname);
				}
				break;
			}
		}
		return dirname;
	}

	createFolder(): void {
		const dirname = this.getDirName();
		if (dirname) {
			const { path, route } = File.getFileName(dirname, 'New Folder');
			FSP.mkdir(route, { recursive: true })
				.then(() => {
					return Directory.update();
				})
				.then((changed: boolean) => {
					if (changed) {
						const folder = Directory.getFolder(path);
						if (folder.path === path) {
							this.links.nav.load(folder.parent);
							this.select(folder);
							this.rename(folder);
						}
					}
				});
		}
	}

	showInExplorer(): void {
		let length = 0;
		const elements = this.elements;
		for (const file of this.selections) {
			const { element } = file.getContext(this);
			if (elements.includes(element)) {
				File.showInExplorer(File.path(file.path));
				if (++length === 10) {
					break;
				}
			}
		}
	}

	openFileLocation(file: any): void {
		if (file) {
			const folder = Directory.getFolder(file.path);
			if (folder instanceof FolderItem) {
				const { nav } = this.links;
				nav.load(folder);
				nav.scrollToSelection('middle');
			}
		}
	}

	openFile(file: any): void {
		if (file instanceof FolderItem) {
			const { nav } = this.links;
			nav.load(file);
			nav.scrollToSelection('middle');
		}
		if (file instanceof FileItem && this.openEventEnabled) {
			const open: any = new Event('open');
			open.value = file;
			this.dispatchEvent(open);
		}
	}

	copyFiles(cut: boolean = false): void {
		const guids: string[] = [];
		for (const file of this.selections) {
			if (file instanceof FolderItem) return;
			if (file instanceof FileItem) {
				guids.push(file.meta.guid);
			}
		}
		if (guids.length !== 0) {
			(Clipboard as any).write('yami.files', { cut, guids });
		}
	}

	pasteFiles(targetPath?: string): void {
		const { browser, nav } = this.links;
		if (!targetPath && nav.selections.length === 1) {
			targetPath = nav.selections[0].path;
		}
		if (!targetPath) return;
		const copy = (Clipboard as any).read('yami.files');
		if (copy && Array.isArray(copy.guids)) {
			const files: any[] = [];
			for (const guid of copy.guids) {
				const meta = (Data as any).manifest.guidMap[guid];
				if (meta) files.push(meta.file);
			}
			if (files.length !== 0) {
				const { absolutePaths } = browser.getFilePaths(files);
				(Directory as any)
					.readdir(absolutePaths)
					.then((dir: any[]) => {
						const path = File.path(targetPath);
						return copy.cut
							? Directory.moveFiles(path, dir)
							: (Directory as any)
									.saveFiles(files)
									.then(() => Directory.copyFiles(path, dir));
					})
					.finally(() => {
						Directory.update();
					});
			}
			if (copy.cut) {
				(Clipboard as any).write('yami.no-files', null);
			}
		}
	}

	deleteFiles(): void {
		const files: any[] = [];
		const { selections } = this;
		if (!selections.includes(Directory.assets)) {
			const elements = this.elements;
			for (const file of selections) {
				const { element } = file.getContext(this);
				if (elements.includes(element)) {
					files.push(file);
				}
			}
		}
		const { length } = files;
		if (length === 0) {
			return;
		}
		const get = Local.createGetter('confirmation');
		if (length === 1 && files[0] instanceof FileItem) {
			const list = Reference.findRelated(files[0].meta.guid);
			if (!list.isEmpty) {
				Reference.openList(list);
				return Window.confirm(
					{
						message: get('deleteReferencedFile').replace(
							'<filename>',
							files[0].alias ?? files[0].name
						)
					},
					[
						{
							label: get('yes'),
							click: () => {
								(Directory as any).deleteFiles(files).then(() => {
									return Directory.update();
								});
							}
						},
						{
							label: get('no')
						}
					]
				);
			}
		}
		return Window.confirm(
			{
				message:
					length === 1
						? get('deleteSingleFile').replace(
								'<filename>',
								files[0].alias ?? files[0].name
							)
						: get('deleteMultipleFiles').replace('<number>', length)
			},
			[
				{
					label: get('yes'),
					click: () => {
						Directory.deleteFiles(files).then(() => {
							return Directory.update();
						});
					}
				},
				{
					label: get('no')
				}
			]
		);
	}

	rename(file: any): void {
		const { textBox } = FileBodyPane;
		if (
			document.activeElement === this.content &&
			file !== Directory.assets &&
			!textBox.parentNode
		) {
			const context = file.getContext(this);
			const element = context.element;
			if (element && element.parentNode) {
				element.nameBox.hide();
				element.appendChild(textBox as any);
				textBox.write(file.basename ?? file.name);
				textBox.getFocus('all');
				switch (this.viewMode) {
					case 'list':
						textBox.fitContent();
						break;
					default:
						textBox.style.width = '';
						break;
				}
			}
		}
	}

	cancelRenaming(): void {
		const { timer } = this;
		if (timer.target) {
			timer.target = null;
		}
		if (timer.running) {
			timer.running = false;
			timer.remove();
		}
	}

	importFiles(): void {
		const { nav } = this.links;
		const folders = nav.selections;
		if (folders.length !== 1) {
			return;
		}
		const folder = folders[0];
		const dialogs = Editor.config.dialogs;
		const location = Path.normalize(dialogs.import);
		const images = ['png', 'jpg', 'jpeg', 'cur', 'webp'];
		const audio = ['mp3', 'm4a', 'ogg', 'wav', 'flac'];
		const videos = ['mp4', 'mkv', 'webm'];
		const fonts = ['ttf', 'otf', 'woff', 'woff2'];
		(File as any)
			.showOpenDialog({
				defaultPath: location,
				filters: [
					{
						name: 'Resources',
						extensions: [...images, ...audio, ...videos, ...fonts]
					},
					{ name: 'Images', extensions: images },
					{ name: 'Audio', extensions: audio },
					{ name: 'Videos', extensions: videos },
					{ name: 'Fonts', extensions: fonts }
				],
				properties: ['multiSelections']
			})
			.then(({ filePaths }: { filePaths: string[] }) => {
				if (filePaths.length !== 0) {
					const dir = folder.path;
					const promises: Promise<void>[] = [];
					const length = filePaths.length;
					for (let i = 0; i < length; i++) {
						const src = Path.slash(filePaths[i]);
						const ext = Path.extname(src);
						const base = Path.basename(src, ext);
						const dst = File.getFileName(dir, base, ext).route;
						promises.push(FSP.copyFile(src, dst));
					}
					Promise.all(promises).then(() => {
						return Directory.update();
					});
					dialogs.import = Path.slash(Path.dirname(filePaths[0]));
				}
			});
	}

	exportFile(): void {
		const files = this.selections;
		const dialogs = Editor.config.dialogs;

		if (files.length === 1 && files[0] instanceof FileItem) {
			const file = files[0];
			const name = file.basename + file.extname;
			(File as any)
				.showSaveDialog({
					defaultPath: Path.resolve(dialogs.export, name)
				})
				.then(({ filePath }: { filePath?: string }) => {
					if (filePath) {
						dialogs.export = Path.slash(Path.dirname(filePath));
						return FSP.copyFile(File.path(file.path), filePath);
					}
				})
				.finally(() => {
					Directory.update();
				});
		} else {
			(File as any)
				.showOpenDialog({
					defaultPath: Path.normalize(dialogs.export),
					properties: ['openDirectory']
				})
				.then(({ filePaths }: { filePaths: string[] }) => {
					if (filePaths.length === 1) {
						const dirPath = filePaths[0];
						dialogs.export = Path.slash(dirPath);
						return (Directory as any)
							.readdir(files.map((file: any) => File.path(file.path)))
							.then((dir: any[]) => {
								return Directory.copyFiles(dirPath, dir, '');
							});
					}
				})
				.finally(() => {
					Directory.update();
				});
		}
	}

	clearElements(start: number): void {
		const { elements } = this;
		if (elements.length > 256 && elements.length !== start) {
			elements.length = start;
		}
		let i = start;
		while (elements[i] !== undefined) {
			elements[i++] = undefined;
		}
	}

	clear(): this {
		this.unselect();
		this.content.textContent = '';
		this.clearElements(0);
		this.elements.count = 0;
		this.elements.start = -1;
		this.elements.end = -1;
		this.resetContentStyle();
		return this;
	}

	on = (
		type: string,
		listener: (event: any) => void,
		options?: boolean | AddEventListenerOptions
	): void => {
		EventTarget.prototype.on.call(this, type, listener, options);
		switch (type) {
			case 'open':
				this.openEventEnabled = true;
				break;
			case 'select':
				this.selectEventEnabled = true;
				break;
			case 'unselect':
				this.unselectEventEnabled = true;
				break;
			case 'popup':
				this.popupEventEnabled = true;
				break;
		}
	};

	keydown(event: KeyboardEvent): void {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.scrollTop -= 20;
					break;
				case 'ArrowDown':
					this.scrollTop += 20;
					break;
				case 'KeyA':
					this.selectAll();
					break;
				default:
					return;
			}
			event.stopImmediatePropagation();
		} else if (event.altKey) {
			return;
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault();
					return;
				case 'Enter':
				case 'NumpadEnter': {
					const files = this.selections;
					if (files.length === 1) {
						const file = files[0];
						const { element } = file.getContext(this);
						if (this.elements.includes(element)) {
							this.openFile(file);
						}
					}
					break;
				}
				case 'Delete':
					this.deleteFiles();
					break;
				case 'Escape':
				case 'Backspace': {
					const { browser } = this.links;
					if (!browser.backToParentFolder()) return;
					break;
				}
				case 'ArrowLeft':
					event.preventDefault();
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('prev-line');
							break;
						default:
							this.selectRelativeInGridMode('prev');
							break;
					}
					break;
				case 'ArrowRight':
					event.preventDefault();
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('next-line');
							break;
						default:
							this.selectRelativeInGridMode('next');
							break;
					}
					break;
				case 'ArrowUp':
					event.preventDefault();
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('prev');
							break;
						default:
							this.selectRelativeInGridMode('prev-line');
							break;
					}
					break;
				case 'ArrowDown':
					event.preventDefault();
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('next');
							break;
						default:
							this.selectRelativeInGridMode('next-line');
							break;
					}
					break;
				case 'F2': {
					const files = this.selections;
					if (files.length === 1) {
						this.cancelRenaming();
						this.rename(files[0]);
					}
					break;
				}
				default:
					return;
			}
			event.stopImmediatePropagation();
		}
	}

	pointerdown(event: PointerEvent): void {
		this.cancelRenaming();
		switch (event.button) {
			case 0:
			case 2: {
				let element = event.target as HTMLElement;
				if (element === this.content) {
					element = this as any;
				}
				if (element === (this as any)) {
					if (
						this.contains(document.activeElement as Node) &&
						(this as any).isInContent(event)
					) {
						this.unselect();
					}
				} else {
					if (
						element.tagName === 'FILE-BODY-ICON' ||
						element.tagName === 'FILE-BODY-NAME'
					) {
						element = element.parentNode as HTMLElement;
					}
					if (element.tagName === 'FILE-BODY-ITEM') {
						if (event.altKey && (element as any).file instanceof FileItem) {
							Reference.openRelated((element as any).file.meta.guid);
							// 阻止focus后快捷键不被禁用的情况
							event.preventDefault();
							event.stopImmediatePropagation();
							return;
						}
						const selections = this.selections;
						const length = selections.length;
						if (event.cmdOrCtrlKey && length !== 0) {
							const elements = this.elements;
							const files = Array.from(selections);
							for (let i = length - 1; i >= 0; i--) {
								const { element } = (files[i] as any).getContext(this);
								if (!elements.includes(element)) {
									files.splice(i, 1);
								}
							}
							if (!selections.includes((element as any).file)) {
								(files as any).append((element as any).file);
								this.select(...files);
							} else if (event.button === 0) {
								(files as any).remove((element as any).file);
								const pointerup = (event: PointerEvent) => {
									if (this.pressing === pointerup) {
										this.pressing = null;
										if (element.contains(event.target as Node)) {
											this.select(...files);
										}
									}
								};
								this.pressing = pointerup;
								window.on('pointerup', pointerup, {
									once: true
								});
							}
							return;
						}
						if (event.shiftKey && length !== 0) {
							const elements = this.elements;
							let start = elements.indexOf(element);
							let end = start;
							for (let i = 0; i < length; i++) {
								const { element } = selections[i].getContext(this);
								const index = elements.indexOf(element);
								if (index !== -1) {
									start = Math.min(start, index);
									end = Math.max(end, index);
								}
							}
							if (start !== -1) {
								const slice = elements.slice(start, end + 1);
								this.select(...slice.map((element: any) => element.file));
								return;
							}
						}
						if (!element.hasClass('selected')) {
							switch (event.button) {
								case 0:
									this.activateFile((element as any).file);
									break;
								case 2:
									this.select((element as any).file);
									break;
							}
						} else if (event.button === 0) {
							if (length > 1) {
								const pointerup = (event: PointerEvent) => {
									if (this.pressing === pointerup) {
										this.pressing = null;
										if (element.contains(event.target as Node)) {
											this.select((element as any).file);
										}
									}
								};
								this.pressing = pointerup;
								window.on('pointerup', pointerup, {
									once: true
								});
							} else {
								this.activateFile((element as any).file);
								if (
									(Menu as any).state === 'closed' &&
									document.activeElement === this.content &&
									(event.target as HTMLElement).tagName === 'FILE-BODY-NAME'
								) {
									this.timer.target = event.target;
								}
							}
						}
					}
				}
				if (event.target === (this as any)) {
					event.preventDefault();
					this.content.focus();
				}
				break;
			}
			case 3: {
				const { browser } = this.links;
				browser.backToParentFolder();
				break;
			}
		}
	}

	pointerup(event: PointerEvent): void {
		switch (event.button) {
			case 0:
				if (document.activeElement === this.content && this.timer.target === event.target) {
					this.timer.running = true;
					this.timer.elapsed = 0;
					this.timer.add();
				}
				break;
			case 2:
				if (document.activeElement === this.content && this.popupEventEnabled) {
					const popup: any = new Event('popup');
					popup.raw = event;
					popup.clientX = event.clientX;
					popup.clientY = event.clientY;
					this.dispatchEvent(popup);
				}
				break;
		}
	}

	doubleclick(event: Event): void {
		let element = event.target as HTMLElement;
		if (element.tagName === 'FILE-BODY-ICON' || element.tagName === 'FILE-BODY-NAME') {
			element = element.parentNode as HTMLElement;
		}
		if (element.tagName === 'FILE-BODY-ITEM') {
			event.preventDefault();
			this.cancelRenaming();
			this.openFile((element as any).file);
		}
	}

	wheel(event: WheelEvent): void {
		const { deltaY } = event;
		if (deltaY !== 0) {
			if (event.cmdOrCtrlKey) {
				event.preventDefault();
				const index = this.viewIndex!;
				const delta = Math.sign(-deltaY);
				return this.setViewIndex(index + delta);
			}
			if (this.viewMode === 'list' && this.clientWidth < this.scrollWidth) {
				this.scrollLeft += deltaY < 0 ? -60 : 60;
			}
		}
	}

	static windowKeydown(this: FileBodyPane, event: KeyboardEvent): void {
		if (event.altKey) {
			switch (event.code) {
				case 'AltLeft':
					if (
						!(Window as any).getTopWindow() ||
						(Window as any).getTopWindow()?.id === 'selector'
					) {
						(this as any).content.addClass('alt');
						window.on('keyup', this.windowKeyup);
						window.on('pointermove', this.windowPointermove);
					}
					break;
			}
		}
	}

	static windowKeyup(this: FileBodyPane, event: KeyboardEvent): void {
		if (!event.altKey) {
			switch (event.code) {
				case 'AltLeft':
					(this as any).content.removeClass('alt');
					window.off('keyup', this.windowKeyup);
					window.off('pointermove', this.windowPointermove);
					break;
			}
		}
	}

	static windowPointermove(this: FileBodyPane, event: PointerEvent): void {
		if (!event.altKey) {
			(this as any).content.removeClass('alt');
			window.off('keyup', this.windowKeyup);
			window.off('pointermove', this.windowPointermove);
		}
	}

	static textBox = (function IIFE() {
		const textBox = new TextBox();
		textBox.setMaxLength(64);
		textBox.addClass('file-body-text-box');
		textBox.input.addClass('file-body-text-box-input');

		textBox.on('keydown', function (this: TextBox, event: KeyboardEvent) {
			event.stopPropagation();
			switch (event.code) {
				case 'Enter':
				case 'NumpadEnter':
				case 'Escape': {
					const item = this.parentNode as any;
					const content = item.parentNode as HTMLElement;
					this.input.blur();
					content.focus();
					break;
				}
			}
		});

		textBox.on('beforeinput', function (event: any) {
			if (event.inputType === 'insertText' && typeof event.data === 'string') {
				const regexp = /[\\/:*?"<>|]/;
				if (regexp.test(event.data)) {
					event.preventDefault();
					event.stopPropagation();
				}
			}
		});

		textBox.on('input', function (this: TextBox, event: Event) {
			if (this.style.width !== '') {
				this.fitContent();
			}
		});

		textBox.on('select', function (event: Event) {
			event.stopPropagation();
		});

		textBox.on('blur', function (this: TextBox, event: Event) {
			const item = this.parentNode as any;
			const file = item.file;
			const name = this.read().trim();
			let filename = name;
			this.remove();
			item.nameBox.show();
			if (!name) return;
			if (file instanceof FileItem) {
				const guid = file.meta?.guid;
				if (typeof guid === 'string') {
					filename += '.' + guid;
				}
				filename += file.extname;
			}
			if (filename !== file.name) {
				const dir = Path.dirname(file.path);
				const path = File.path(`${dir}/${filename}`);
				// 当目标文件不存在或就是自己时重命名
				FSP.stat(path, (FolderItem as any).bigint)
					.then((stats: any) => {
						if (stats.ino === file.stats.ino) {
							throw new Error('same file');
						}
					})
					.catch((error: any) => {
						return FSP.rename(File.path(file.path), path).then(() => {
							item.nameBox.textContent = name;
							return Directory.update();
						});
					});
			}
		});

		return textBox;
	})();

	connectedCallback(): void {
		if (this.childElementCount === 0) {
			setTimeout(() => {
				if (this.childElementCount !== 0) return;
				this.appendChild(this.content);
			});
		}
	}
}

customElements.define('file-body-pane', FileBodyPane);
