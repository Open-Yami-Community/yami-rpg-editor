import { FileNavPane } from './file-nav-pane.ts';
import { FileBodyPane } from './file-body-pane.ts';
import { Menu } from './menu-list.ts';
import { Directory } from '@/file/directory-object.ts';
import { FileItem } from '@/file/file-item.ts';
import { File } from '@/file/file-system-core.ts';
import { FolderItem } from '@/file/folder-item.ts';
import { Local } from '@/tools/localization.ts';
import { Path } from '@/util/config.ts';
import { FileBrowserLinks } from '@/types/file-browser-links.ts';

export class FileBrowser extends HTMLElement {
	display: 'normal' | 'search';
	directory: string | null;
	keyword: RegExp | null;
	dragging: DragEvent | PointerEvent | null;
	filters: any[] | null;
	backupFolders: any[];
	searchResults: any[];
	nav: FileNavPane & {
		selections: any[];
		unselect(): void;
		load(...folders: any[]): void;
		contains(node: Node): boolean;
		clear(): void;
	};
	head: HTMLElement & {
		updateAddress(): void;
		searcher: {
			write(content: string): void;
			deleteInputContent(): void;
		};
		address: { clear(): void };
	};
	body: FileBodyPane & {
		selections: any[];
		select(...files: any[]): void;
		contains(node: Node): boolean;
		clear(): void;
	};
	links: FileBrowserLinks;
	declare _built: boolean;

	constructor() {
		super();

		this.display = 'normal';
		this.directory = null;
		this.dragging = null;
		this.filters = null;
		this.keyword = null;
		this.backupFolders = [];
		this.searchResults = [];

		this.on('pointerdown', this.pointerdown);
		this.on('dragstart', this.dragstart);
		this.on('dragend', this.dragend);
		window.on('os-dragstart', this.osDragstart.bind(this));
		window.on('os-dragend', this.osDragend.bind(this));
		window.on('dirchange', this.dirchange.bind(this));
	}

	update(): void {
		this.body.updateFiles();
		(this.head as any).updateAddress();
	}

	searchFiles(keyword: RegExp | string): void {
		const { nav } = this;
		if (keyword instanceof RegExp || keyword.length !== 0) {
			if (this.display === 'normal') {
				this.display = 'search';
				this.backupFolders = (nav as any).selections;
				(nav as any).unselect();
			}
			if (typeof keyword === 'string') {
				keyword = keyword.replace(/[(){}\\^$*+?.|[\]]/g, '\\$&');
				keyword = new RegExp(keyword, 'i');
			}
			(Directory as any).searchFiles(
				this.filters,
				(this.keyword = keyword as RegExp),
				this.directory,
				(this.searchResults = [])
			);
			this.update();
		} else {
			if (this.display === 'search') {
				this.display = 'normal';
				(nav as any).load(...this.backupFolders);
				this.keyword = null;
				this.backupFolders = [];
				this.searchResults = [];
			}
		}
	}

	restoreDisplay(): void {
		switch (this.display) {
			case 'normal':
				break;
			case 'search':
				this.display = 'normal';
				this.backupFolders = [];
				this.searchResults = [];
				(this.head as any).searcher.write('');
				break;
		}
	}

	backToParentFolder(): boolean {
		switch (this.display) {
			case 'normal': {
				const { nav } = this;
				const folders = (nav as any).selections;
				if (folders.length === 1) {
					const path = folders[0].path;
					const index = path.lastIndexOf('/');
					if (index !== -1) {
						(nav as any).load((Directory as any).getFolder(path.slice(0, index)));
						return true;
					}
				}
				return false;
			}
			case 'search': {
				const active = document.activeElement as HTMLElement;
				(this.head as any).searcher.deleteInputContent();
				active.focus();
				return true;
			}
		}
		return false;
	}

	dirchange(event: Event): void {
		switch (this.display) {
			case 'normal':
				break;
			case 'search':
				this.searchFiles(this.keyword!);
				break;
		}
		const body = this.body;
		const files = Array.from((body as any).selections);
		if (files.length !== 0) {
			const { inoMap } = Directory as any;
			let modified = false;
			let i = files.length;
			while (--i >= 0) {
				const sFile = files[i];
				const ino = (sFile as any).stats.ino;
				const dFile = inoMap[ino];
				if (sFile !== dFile) {
					modified = true;
					if (dFile) {
						files[i] = dFile;
					} else {
						files.splice(i, 1);
					}
				}
			}
			if (modified) {
				(body as any).select(...files);
			}
		}
	}

	close(): void {
		if (this.directory) {
			this.directory = null;
			this.restoreDisplay();
			(this.nav as any).clear();
			(this.head as any).address.clear();
			(this.body as any).clear();
		}
	}

	getActivePage(event: Event): HTMLElement | null {
		const { nav, body } = this;
		return (nav as any).contains(event.target as Node)
			? nav
			: (body as any).contains(event.target as Node)
				? body
				: null;
	}

	getFilePaths(files: FileItem[]): {
		relativePaths: string[];
		absolutePaths: string[];
	} {
		const relativePaths = files.map((file) => file.path);
		const absolutePaths = relativePaths.map((path) => File.path(path));
		return { relativePaths, absolutePaths };
	}

	pointerdown(event: PointerEvent): void {
		switch ((this.dragging as any)?.mode) {
			case 'drag':
				this.dragend();
				return;
			case 'os-drag':
				this.osDragend();
				return;
		}
	}

	dragstart(event: DragEvent): void {
		const page = this.getActivePage(event) as any;
		if (page && !this.dragging) {
			if (page.pressing) {
				page.pressing = null;
			}
			const files = page.activeFile ? [page.activeFile] : page.selections;
			if (!files.includes((Directory as any).assets) && !page.textBox.parentNode) {
				const { relativePaths, absolutePaths } = this.getFilePaths(files as FileItem[]);
				this.dragging = event;
				(event as any).mode = 'drag';
				event.preventDefault = Function.empty as any;
				(event as any).allowMove = false;
				(event as any).allowCopy = false;
				(event as any).dragLeaved = false;
				(event as any).dropTarget = null;
				(event as any).dropPath = null;
				(event as any).dropMode = null;
				(event as any).page = page;
				(event as any).files = files;
				(event as any).filePaths = relativePaths;
				(event as any).promise = (Directory as any).readdir(absolutePaths);
				(event as any).promise.then((dir: any[]) => {
					if (dir.length === 0) {
						this.dragend();
					}
				});
				(event as any).dataTransfer.effectAllowed = 'copyMove';
				(event as any).dataTransfer.hideDragImage();
				this.on('dragenter', this.dragover);
				this.on('dragleave', this.dragleave);
				this.on('dragover', this.dragover);
				this.on('drop', this.drop);
				if (files.length === 1 && files[0] instanceof FileItem) {
					const name = files[0].basename + files[0].extname;
					(event as any).dataTransfer.setData(
						'DownloadURL',
						`application/octet-stream:${name}:${absolutePaths[0]}`
					);
				}
			}
		}
	}

	dragend(event?: DragEvent): void {
		if (this.dragging) {
			const { dropTarget, page } = this.dragging as any;
			if (dropTarget instanceof HTMLElement) {
				dropTarget.removeClass('drop-target');
			}
			if ((this.dragging as any).dragLeaved) {
				page.deactivateFile?.();
			} else {
				page.selectActiveFile?.();
			}
			this.dragging = null;
			(this as any).off('dragenter', this.dragover);
			(this as any).off('dragleave', this.dragleave);
			(this as any).off('dragover', this.dragover);
			(this as any).off('drop', this.drop);
		}
	}

	dragleave(event: DragEvent): void {
		const { dragging } = this;
		if ((dragging as any)?.dropTarget && !this.contains(event.relatedTarget as Node)) {
			(dragging as any).dropTarget.removeClass('drop-target');
			(dragging as any).dropTarget = null;
			if (event.relatedTarget) {
				(dragging as any).dragLeaved = true;
			}
		}
	}

	dragover(event: DragEvent): void {
		const { dragging } = this;
		if (dragging) {
			const { dropTarget } = dragging as any;
			let element = event.target as HTMLElement;
			if (!(dragging as any).allowCopy && !(dragging as any).target.contains(element)) {
				(dragging as any).allowCopy = true;
			}
			while (
				!(
					element instanceof FileBrowser ||
					element instanceof FileNavPane ||
					element instanceof FileBodyPane ||
					(element as any).file instanceof FolderItem
				)
			) {
				element = element.parentNode as HTMLElement;
			}
			if (dropTarget !== element) {
				if (dropTarget instanceof HTMLElement) {
					dropTarget.removeClass('drop-target');
				}
				(dragging as any).allowMove = false;
				(dragging as any).dropTarget = element;
				if ((element as any).file instanceof FolderItem) {
					element.addClass('drop-target');
					(dragging as any).dropPath = (element as any).file.path;
					(dragging as any).promise
						.then((dir: any[]) => {
							const { path } = (element as any).file;
							const { filePaths } = dragging as any;
							for (const filePath of filePaths) {
								if (
									path === filePath ||
									(path.indexOf(filePath) === 0 && path[filePath.length] === '/')
								) {
									return true;
								}
							}
							return (Directory as any).existFiles(path, dir);
						})
						.then((existed: boolean) => {
							if (!existed && (dragging as any).dropTarget === element) {
								(dragging as any).allowMove = true;
							}
						});
				} else {
					if (element instanceof FileBodyPane) {
						const { selections } = this.nav as any;
						(dragging as any).dropPath =
							selections.length === 1 ? selections[0].path : null;
					} else {
						(dragging as any).dropPath = null;
					}
				}
			}
			if (!(dragging as any).dropPath) {
				return;
			}
			if ((event as any).cmdOrCtrlKey) {
				if ((dragging as any).allowCopy) {
					(dragging as any).dropMode = 'copy';
					(event as any).dataTransfer.dropEffect = 'copy';
					event.preventDefault();
				}
			} else {
				if ((dragging as any).allowMove) {
					(dragging as any).dropMode = 'move';
					(event as any).dataTransfer.dropEffect = 'move';
					event.preventDefault();
				}
			}
		}
	}

	drop(event: DragEvent): void {
		const { dragging } = this;
		if (dragging) {
			event.stopPropagation();
			if (!(dragging as any).dropPath) return;
			const dropPath = File.path((dragging as any).dropPath);
			const dropName = Path.basename(dropPath);
			const get = (Local as any).createGetter('menuFileOnDrop');

			const menuItems: any[] = [];
			switch ((dragging as any).dropMode) {
				case 'move':
					menuItems.push({
						label: get('moveTo').replace('<dirName>', dropName),
						click: () => {
							(dragging as any).promise
								.then((dir: any[]) => (Directory as any).moveFiles(dropPath, dir))
								.finally(() => {
									(Directory as any).update();
								});
						}
					});
					break;
				case 'copy':
					menuItems.push({
						label: get('copyTo').replace('<dirName>', dropName),
						click: () => {
							(dragging as any).promise
								.then((dir: any[]) =>
									(Directory as any)
										.saveFiles((dragging as any).files)
										.then(() => (Directory as any).copyFiles(dropPath, dir))
								)
								.finally(() => {
									(Directory as any).update();
								});
						}
					});
					break;
			}

			(Menu as any).popup(
				{
					x: event.clientX,
					y: event.clientY
				},
				menuItems
			);

			this.dragend();
		}
	}

	osDragstart(event: DragEvent): void {
		if (!this.dragging) {
			this.dragging = event;
			(event as any).mode = 'os-drag';
			(event as any).dropTarget = null;
			(event as any).dropPath = null;
			this.on('dragenter', this.osDragover);
			this.on('dragleave', this.osDragleave);
			this.on('dragover', this.osDragover);
			this.on('drop', this.osDrop);
		}
	}

	osDragend(event?: DragEvent): void {
		if (this.dragging) {
			const { dropTarget } = this.dragging as any;
			if (dropTarget instanceof HTMLElement) {
				dropTarget.removeClass('drop-target');
			}
			this.dragging = null;
			(this as any).off('dragenter', this.osDragover);
			(this as any).off('dragleave', this.osDragleave);
			(this as any).off('dragover', this.osDragover);
			(this as any).off('drop', this.osDrop);
		}
	}

	osDragleave(event: DragEvent): void {
		return this.dragleave(event);
	}

	osDragover(event: DragEvent): void {
		const { dragging } = this;
		if (dragging) {
			const { dropTarget } = dragging as any;
			let element = event.target as HTMLElement;
			while (
				!(
					element instanceof FileBrowser ||
					element instanceof FileNavPane ||
					element instanceof FileBodyPane ||
					(element as any).file instanceof FolderItem
				)
			) {
				element = element.parentNode as HTMLElement;
			}
			if (dropTarget !== element) {
				if (dropTarget instanceof HTMLElement) {
					dropTarget.removeClass('drop-target');
				}
				(dragging as any).dropTarget = element;
				if ((element as any).file instanceof FolderItem) {
					element.addClass('drop-target');
					(dragging as any).dropPath = (element as any).file.path;
				} else {
					if (element instanceof FileBodyPane) {
						const { selections } = this.nav as any;
						(dragging as any).dropPath =
							selections.length === 1 ? selections[0].path : null;
					} else {
						(dragging as any).dropPath = null;
					}
				}
			}
			if ((dragging as any).dropPath) {
				event.preventDefault();
				(event as any).dataTransfer.dropEffect = 'copy';
			}
		}
	}

	osDrop(event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		const { files } = (event as any).dataTransfer;
		if (files.length === 0) {
			return;
		}
		const { dragging } = this;
		if (dragging) {
			let { dropPath } = dragging as any;
			if (!dropPath) return;
			dropPath = File.path(dropPath);
			const map = Array.prototype.map;
			const paths = map.call(files, (file: any) => {
				return (
					file.path ||
					(require('electron').webUtils?.getPathForFile
						? require('electron').webUtils.getPathForFile(file)
						: '')
				);
			});
			(Directory as any)
				.readdir(paths)
				.then((dir: any[]) => {
					return (Directory as any).copyFiles(dropPath, dir, '');
				})
				.finally(() => {
					(Directory as any).update();
				});
		}
	}

	connectedCallback(): void {
		if (this._built) return;
		this._built = true;
		if (!this.nav) {
			this.nav = document.createElement('file-nav-pane') as unknown as FileNavPane;
			this.head = document.createElement('file-head-pane') as unknown as HTMLElement & {
				updateAddress(): void;
				searcher: {
					write(content: string): void;
					deleteInputContent(): void;
				};
				address: { clear(): void };
			};
			this.body = document.createElement('file-body-pane') as unknown as FileBodyPane;
			this.appendChild(this.nav);
			this.appendChild(this.head);
			this.appendChild(this.body);
			const links = {
				browser: this,
				nav: this.nav,
				head: this.head,
				body: this.body
			};
			this.links = links;
			(this.nav as any).links = links;
			(this.head as any).links = links;
			(this.body as any).links = links;
		}
	}
}

customElements.define('file-browser', FileBrowser);
