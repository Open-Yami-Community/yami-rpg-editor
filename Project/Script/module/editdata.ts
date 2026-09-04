import { clipboard } from 'electron';
import { $ } from '@/util/dom.ts';
import { Command } from '@/command/command-object.ts';
import { Title } from '@/title/title-bar.ts';
import { Local } from '@/tools/localization.ts';
import { Window } from '@/tools/window-object.ts';
import monaco from '@/util/monaco';

export const EditDataInstance = new (class {
	editor = null;
	model = null;
	versionId = null;
	commandList = null;
	changed = false;
	fontSize = 14;
	lineHeight = 14;
	colorOptions = {
		mimeType: 'json',
		tabSize: 2,
		theme: ''
	};
	isCreated = false;
	mark = $('#edit-data-mark');
	editorParent = $('#edit-data');
	editorDom = $('#edit-data-current');
	eventListDom = $('#event-commands');
	currentContent = null;
	constructor() {
		$('#edit-data').on('resize', () => {
			this.resize();
		});
		$('#edit-data-confirm').on('click', this.save.bind(this));

		this.editorParent.on('close', (event) => {
			if (this.changed) {
				event.preventDefault();
				const get = Local.createGetter('confirmation');
				Window.confirm(
					{
						message: get('closeUnsavedData'),
						close: () => {
							this.editor.getFocus();
						}
					},
					[
						{
							label: get('yes'),
							click: () => {
								this.setChangeState(false);
								Window.close('edit-data');
							}
						},
						{
							label: get('no')
						}
					]
				);
			}
		});

		this.editorParent.on(
			'keydown',
			(event) => {
				const isEditor =
					this.editor?.hasTextFocus?.() ||
					this.editorDom.contains(document.activeElement) ||
					this.editorDom.contains(event.target);
				if (isEditor) {
					switch (event.code) {
						case 'Enter':
						case 'NumpadEnter':
							if (!event.ctrlKey && !event.metaKey) {
								event.stopPropagation();
							}
							break;
					}
				}
			},
			{ capture: true }
		);

		this.editorParent.on('closed', () => {
			this.model.setValue('');
		});
	}
	isMaximized() {
		return $('#edit-data').hasClass('maximized');
	}
	resize() {
		const content = this.editorDom;
		const parent = content.parentElement;
		if (!this.isMaximized()) {
			content.style.width = '';
			content.style.height = '';
			const boundingRect = content.getBoundingClientRect();
			this.editor.layout({
				width: boundingRect.width,
				height: parent.clientHeight - 60
			});
		} else {
			const boundingRect = content.getBoundingClientRect();
			// 保持content左右间距相同
			content.style.width = parent.clientWidth - boundingRect.left * 2 + 'px';
			content.style.height = parent.clientHeight - 60 + 'px';
			this.editor.layout({
				width: parseFloat(content.style.width),
				height: parseFloat(content.style.height)
			});
		}
	}
	parseJSON(text: any) {
		try {
			const vaild = JSON.parse(text);
			if (vaild.id && vaild.params) {
				const result = new (class {
					id = vaild.id;
					params = vaild.params;
					commands = vaild.commands;
				})();
				return result;
			}
			if (Array.isArray(vaild) && vaild.every((v) => v.id && v.params)) {
				return vaild.map((v) => {
					const result = new (class {
						id = v.id;
						params = v.params;
						commands = v.commands;
					})();
					return result;
				});
			}
			return null;
		} catch {
			return null;
		}
	}

	pasteText() {
		const text = clipboard.readText();
		if (!text || !this.editor) return;
		const selection = this.editor.getSelection();
		if (selection) {
			this.editor.executeEdits('clipboard-paste', [
				{
					range: selection,
					text: text,
					forceMoveMarkers: true
				}
			]);
			this.editor.pushUndoStop();
		}
	}

	save() {
		const modelValue = this.model.getValue();
		const parse = this.parseJSON(modelValue);
		if (!parse) return;
		const originalStart = this.eventListDom.start;
		const originalEnd = this.eventListDom.end;

		let hasChanges = false;

		if (Array.isArray(this.currentContent)) {
			for (const ind in this.currentContent) {
				const { node, value } = this.currentContent[ind];
				if (!(ind in parse)) continue;
				const changeContent = parse[ind];
				if (JSON.stringify(value) === JSON.stringify(changeContent)) continue;

				const list = node.dataList;
				const dataIndex = node.dataIndex;

				if (list[dataIndex].buffer !== undefined) {
					delete list[dataIndex].buffer;
				}

				list[dataIndex] = changeContent;
				hasChanges = true;
			}
		} else if (JSON.stringify(this.currentContent.value) !== JSON.stringify(parse)) {
			const node = this.currentContent.node;

			const list = node.dataList;
			const dataIndex = node.dataIndex;

			if (list[dataIndex].buffer !== undefined) {
				delete list[dataIndex].buffer;
			}

			list[dataIndex] = parse;
			hasChanges = true;
		}

		// 如果有修改，触发 change 事件以标记数据需要保存
		if (hasChanges) {
			this.eventListDom.dispatchEvent(new Event('change', { bubbles: true }));
		}

		this.eventListDom.update();
		this.eventListDom.select(originalStart, originalEnd);

		this.currentContent = null;
		this.setChangeState(false);
		Window.close('edit-data');
	}
	colorizeCodeLines(items: any, code: any) {
		const text = document.createElement('text');
		const options = this.colorOptions;
		text.textContent = code;
		options.theme = Title.theme;
		(this as any).createTheme(Title.theme);
		monaco.editor.colorizeElement(text, options);
		let index = setInterval(() => {
			if (text.children.length !== 0) {
				clearInterval(index);
				const nodes = text.childNodes;
				const nLength = nodes.length;
				const sLength = nLength >> 1;
				const spans = new Array(sLength);
				for (let i = 0; i < nLength; i += 2) {
					spans[i >> 1] = nodes[i];
				}
				for (let i = 0; i < sLength; i++) {
					items[i].appendChild(spans[i]);
				}
			}
		});
	}
	open(current: any) {
		if (!this.isCreated) {
			this.isCreated = true;
			const { theme } = Title;
			(Command.cases as any).script.createTheme(theme);
			this.editor = monaco.editor.create(this.editorDom, {
				language: 'json',
				theme: theme,
				tabSize: 2,
				fontSize: this.fontSize,
				lineHeight: this.lineHeight,
				mouseWheelScrollSensitivity: (this.lineHeight * 3) / 50,
				fastScrollSensitivity: 5,
				wordWrap: 'on',
				matchBrackets: 'never',
				folding: true,
				formatOnType: false,
				showDeprecated: false,
				selectionHighlight: true,
				detectIndentation: false,
				insertSpaces: true,
				roundedSelection: false,
				overviewRulerBorder: false,
				hideCursorInOverviewRuler: true,
				automaticLayout: false,
				hover: false as any,
				lightbulb: {
					enabled: false as any
				},
				minimap: {
					enabled: false
				},
				scrollbar: {
					useShadows: false,
					horizontalScrollbarSize: 12,
					verticalScrollbarSize: 12
				}
			});

			this.model = this.editor.getModel();

			// 拦截原生 paste 事件保证粘贴有效
			this.editorDom.on('paste', (event: any) => {
				event.preventDefault();
				event.stopPropagation();
				this.pasteText();
			});

			// 注册 Monaco 粘贴 Action（支持快捷键与右键菜单）
			this.editor.addAction({
				id: 'editor.action.clipboardPasteAction',
				label: 'Paste',
				keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
				run: () => {
					this.pasteText();
				}
			});

			// 编辑器 - 获得焦点
			this.editor.getFocus = function () {
				setTimeout(() => this.focus());
			};

			this.editor.onKeyDown((event) => {
				const browserEvent = event.browserEvent;
				if (browserEvent.ctrlKey || browserEvent.metaKey) {
					switch (browserEvent.code) {
						case 'Enter':
						case 'NumpadEnter':
							browserEvent.preventDefault();
							browserEvent.stopPropagation();
							this.save();
							break;
						case 'KeyV':
							browserEvent.preventDefault();
							browserEvent.stopPropagation();
							this.pasteText();
							break;
					}
				} else {
					switch (browserEvent.code) {
						case 'Enter':
						case 'NumpadEnter':
							browserEvent.stopPropagation();
							break;
					}
				}
			});

			this.editor.onDidChangeModelContent((event) => {
				if (event.isFlush) return;
				if (event.isUndoing || event.isRedoing) {
					const versionId = this.model.getAlternativeVersionId();
					const changed = this.versionId !== versionId;
					if (this.changed !== changed) {
						this.setChangeState(changed);
					}
				} else if (!this.changed) {
					this.setChangeState(true);
				}
			});
		}
		this.model.setValue('');
		this.versionId = this.model.getAlternativeVersionId();
		this.editor.setPosition(new monaco.Position(9999, 9999));
		this.editor.setScrollTop(0);
		this.editor.revealLine(9999);
		this.editor.getFocus();
		this.commandList = current;
		this.loadData();
	}
	loadData() {
		this.currentContent = null;
		const { elements, start, end } = this.commandList;
		const sElement = elements[start];
		if (start === end) {
			const sData = sElement.dataItem;
			this.currentContent = {
				node: sElement,
				value: {
					id: sData.id,
					params: sData.params,
					commands: sData.commands
				}
			};
			this.model.setValue(JSON.stringify(this.currentContent.value, null, 2));
		} else {
			const value = [];
			const includeArr = [];
			for (let index = start; index <= end; index++) {
				const elem = elements[index];
				const eData = elem.dataItem;
				if (eData && !includeArr.includes(elem.dataParent) && elem.mark !== 'footer')
					value.push({
						node: elem,
						value: {
							id: eData.id,
							params: eData.params,
							commands: eData.commands
						}
					});
				if (elem.mark === 'header') includeArr.push(eData); // 将buffer也存储，这样能保证有唯一性
			}
			this.currentContent = value;
			this.model.setValue(
				JSON.stringify(
					value.map((v) => v.value),
					null,
					2
				)
			);
		}
	}
	setChangeState(changed: any) {
		if (this.changed !== changed) {
			this.changed = changed;
			if (changed) {
				this.mark.show();
			} else {
				this.mark.hide();
			}
		}
	}
})();
