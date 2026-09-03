import { ipcRenderer, clipboard } from 'electron';
import { $ } from '@/util/dom.ts';
import { Command } from '@/command/command-object.ts';
import { Editor } from '@/main/editor.ts';
import { CommandSchema } from './schema.ts';
import { loadDtsFolder } from '@/module/global.ts';
import { Title } from '@/title/title-bar.ts';
import { Local } from '@/tools/localization.ts';
import { Window } from '@/tools/window-object.ts';
import { Path } from '@/util/config.ts';
import monaco from '@/util/monaco.ts';

Command.cases.script = new CommandSchema({
	name: 'script',
	editor: null,
	model: null,
	versionId: null,
	changed: false,
	fontSize: 14,
	lineHeight: 14,
	mark: $('#script-mark'),
	colorOptions: {
		mimeType: 'javascript',
		tabSize: 2,
		theme: ''
	},
	typesDispose: [],
	isMaximized() {
		return $('#script').hasClass('maximized');
	},
	resize() {
		const content = $('#script-script');
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
			content.style.width = parent.clientWidth - boundingRect.left * 2 + 'px';
			content.style.height = parent.clientHeight - 60 + 'px';
			this.editor.layout({
				width: parseFloat(content.style.width),
				height: parseFloat(content.style.height)
			});
		}
	},
	onInitialize() {
		$('#script-confirm').on('click', () => this.save());

		$('#script').on('close', (event) => {
			if (this.changed) {
				event.preventDefault();
				const get = Local.createGetter('confirmation');
				Window.confirm(
					{
						message: get('closeUnsavedScript'),
						close: () => {
							this.editor.getFocus();
						}
					},
					[
						{
							label: get('yes'),
							click: () => {
								this.setChangeState(false);
								Window.close('script');
							}
						},
						{
							label: get('no')
						}
					]
				);
			}
		});

		$('#script').on('resize', () => {
			this.resize();
		});

		$('#script').on('closed', () => {
			this.model.setValue('');
		});

		$('#script').on(
			'keydown',
			(event) => {
				const isEditor =
					this.editor?.hasTextFocus?.() ||
					$('#script-script').contains(document.activeElement) ||
					$('#script-script').contains(event.target);
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
	},
	customParse({ script }) {
		const contents: any[] = [{ script: script }];
		if (script.includes('\n')) {
			contents.unshift({ fold: true });
		}
		return contents;
	},
	customLoad({ script = '' }) {
		this.createEditor();
		this.model.setValue(script);
		this.versionId = this.model.getAlternativeVersionId();
		this.editor.setPosition(new monaco.Position(9999, 9999));
		this.editor.setScrollTop(0);
		this.editor.revealLine(9999);
		this.editor.getFocus();
		if (!this.typesDispose) {
			this.typesDispose.forEach((item) => item());
		}
		const projectDir = Path.dirname(Editor.config.project);
		this.typesDispose = loadDtsFolder(Path.join(projectDir, 'Script'), monaco, true);
	},
	async customSave() {
		let script = this.model.getValue();
		if (script === '') {
			return this.editor.getFocus();
		}
		try {
			const currentLanguage = this.editor.getModel().getLanguageId();
			if (currentLanguage === 'javascript') {
				new Function(script);
			} else {
				script = await ipcRenderer.invoke('tsc-file', script);
				if (script.error) {
					throw script.error;
				}
				script = script.res;
			}
		} catch (error: any) {
			const get = Local.createGetter('confirmation');
			let continued = false;
			return Window.confirm(
				{
					message: `${error.message}\n${get('compileError')}`,
					close: () => {
						if (!continued) {
							this.editor.getFocus();
						}
					}
				},
				[
					{
						label: get('yes'),
						click: () => {
							continued = true;
							this.setChangeState(false);
							Command.save({ script });
						}
					},
					{
						label: get('no')
					}
				]
			);
		}
		this.setChangeState(false);
		Command.save({ script });
	},
	setChangeState(changed: any) {
		if (this.changed !== changed) {
			this.changed = changed;
			if (changed) {
				this.mark.show();
			} else {
				this.mark.hide();
			}
		}
	},
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
	},
	createEditor() {
		const { theme } = Title;
		this.createTheme(theme);
		this.editor = monaco.editor.create($('#script-script'), {
			language: 'javascript',
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
			hover: { enabled: true } as any,
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
		$('#script-script').on('paste', (event: any) => {
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

		$('#script-change').on('click', () => {
			const currentLanguage = this.editor.getModel().getLanguageId();
			let languageId = currentLanguage === 'javascript' ? 'typescript' : 'javascript';
			const get = Local.createGetter('confirmation');
			$('#script-change').name =
				currentLanguage === 'javascript' ? 'script-change-ts' : 'script-change-js';
			$('#script-change').textContent = get(
				currentLanguage === 'javascript' ? 'script-change-js' : 'script-change-ts'
			);
			monaco.editor.setModelLanguage(this.model, languageId);
		});

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

		this.createEditor = Function.empty;
	},
	colorizeCodeLines(items: any, code: any) {
		const text = document.createElement('text');
		const options = this.colorOptions;
		text.textContent = code;
		options.theme = Title.theme;
		this.createTheme(Title.theme);
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
	},
	createTheme: (function IIFE() {
		const themeData = {
			light: {
				base: 'vs',
				inherit: true,
				rules: [
					{ token: '', foreground: '#000000' },
					{ token: 'comment', foreground: '#008e00' },
					{ token: 'string', foreground: '#d01515' },
					{ token: 'string-bracket', foreground: '#0000c0' },
					{ token: 'string-escape', foreground: '#a000e6' },
					{ token: 'string-invalid', foreground: '#ff0000' },
					{ token: 'number', foreground: '#f06000' },
					{ token: 'property', foreground: '#000000' },
					{ token: 'function', foreground: '#ff0080' },
					{ token: 'class', foreground: '#000000' },
					{ token: 'regexp', foreground: '#d01515' },
					{ token: 'regexp-bracket', foreground: '#0000c0' },
					{ token: 'regexp-escape', foreground: '#a000e6' },
					{ token: 'regexp-escape-control', foreground: '#585cf6' },
					{ token: 'regexp-escape-end', foreground: '#ff8000' },
					{ token: 'regexp-range', foreground: '#0060a0' },
					{ token: 'regexp-invalid', foreground: '#ff0000' },
					{ token: 'regexp-flag', foreground: '#40a0ff' },
					{ token: 'keyword', foreground: '#c800a4' },
					{ token: 'keyword-declaration', foreground: '#c800a4' },
					{ token: 'keyword-operation', foreground: '#c800a4' },
					{ token: 'keyword-constant', foreground: '#0020e0' },
					{ token: 'keyword-builtin', foreground: '#0020e0' },
					{ token: 'keyword-highlight', foreground: '#000000' },
					{ token: 'identifier', foreground: '#1818c0' },
					{ token: 'identifier-global', foreground: '#000000' },
					{ token: 'flag', foreground: '#585cf6' },
					{ token: 'operator', foreground: '#c800a4' },
					{ token: 'delimiter', foreground: '#000000' },
					{ token: 'delimiter-bracket', foreground: '#000000' },
					{
						token: 'delimiter-bracket-invalid',
						foreground: '#ff0000'
					}
				],
				colors: {
					'editor.background': '#ffffff',
					'editorWidget.background': '#f0f0f0',
					'editorWidget.border': '#00000000',
					'editorHoverWidget.background': '#f0f0f0',
					'editorHoverWidget.border': '#c0c0c0',
					'editorCursor.foreground': '#000000',
					'editor.wordHighlightStrongBackground': '#c0ffe080',
					'editor.lineHighlightBorder': '#00000000',
					'editor.selectionBackground': '#add6ff',
					'editor.inactiveSelectionBackground': '#e5ebf1',
					'editor.findMatchBackground': '#80ff80',
					'editor.findMatchHighlightBackground': '#00000000',
					'editorSuggestWidget.background': '#f0f0f0',
					'editorSuggestWidget.border': '#c0c0c0',
					'editorIndentGuide.background': '#f0f0f0',
					'editorIndentGuide.activeBackground': '#e0e0e0',
					'editorLineNumber.foreground': '#a0a0a0',
					'editorLineNumber.activeForeground': '#404040',
					'dropdown.background': '#ffffff',
					'menu.border': '#c0c0c0',
					'input.background': '#ffffff',
					'input.foreground': '#000000',
					'input.border': '#c0c0c0',
					'widget.shadow': '#00000000',
					focusBorder: '#0050a0',
					contrastBorder: '#c0c0c0',
					'list.activeSelectionBackground': '#e6f3ff',
					'list.activeSelectionForeground': '#000000',
					'list.highlightForeground': '#b00080',
					'list.focusHighlightForeground': '#b00080'
				}
			},
			dark: {
				base: 'vs-dark',
				inherit: true,
				rules: [
					{ token: '', foreground: '#dad6cd' },
					{ token: 'comment', foreground: '#608b4e' },
					{ token: 'string', foreground: '#a9d157' },
					{ token: 'string-bracket', foreground: '#e882b2' },
					{ token: 'string-escape', foreground: '#797be6' },
					{ token: 'string-invalid', foreground: '#f44747' },
					{ token: 'number', foreground: '#99cc66' },
					{ token: 'property', foreground: '#dad6cd' },
					{ token: 'function', foreground: '#e8dcaa' },
					{ token: 'class', foreground: '#4ec9b0' },
					{ token: 'regexp', foreground: '#a9d157' },
					{ token: 'regexp-bracket', foreground: '#e882b2' },
					{ token: 'regexp-escape', foreground: '#797be6' },
					{ token: 'regexp-escape-control', foreground: '#5bdbb1' },
					{ token: 'regexp-escape-end', foreground: '#cb6a27' },
					{ token: 'regexp-range', foreground: '#37aae4' },
					{ token: 'regexp-invalid', foreground: '#f44747' },
					{ token: 'regexp-flag', foreground: '#00d2e5' },
					{ token: 'keyword', foreground: '#569cd6' },
					{ token: 'keyword-declaration', foreground: '#569cd6' },
					{ token: 'keyword-operation', foreground: '#3e8f9a' },
					{ token: 'keyword-constant', foreground: '#3299cc' },
					{ token: 'keyword-builtin', foreground: '#6d9cbe' },
					{ token: 'keyword-highlight', foreground: '#7aca3c' },
					{ token: 'identifier', foreground: '#b0e0e6' },
					{ token: 'identifier-global', foreground: '#9ed34e' },
					{ token: 'flag', foreground: '#00d2e5' },
					{ token: 'operator', foreground: '#3e8f9a' },
					{ token: 'delimiter', foreground: '#dad6cd' },
					{ token: 'delimiter-bracket', foreground: '#dad6cd' },
					{
						token: 'delimiter-bracket-invalid',
						foreground: '#f44747'
					}
				],
				colors: {
					'editor.background': '#18191a',
					'editorWidget.background': '#242628',
					'editorWidget.border': '#00000000',
					'editorHoverWidget.background': '#1c1e20',
					'editorHoverWidget.border': '#101010',
					'editorCursor.foreground': '#ffffff',
					'editor.wordHighlightStrongBackground': '#0060a080',
					'editor.lineHighlightBorder': '#00000000',
					'editor.selectionBackground': '#5a286f',
					'editor.inactiveSelectionBackground': '#7e668a',
					'editor.findMatchBackground': '#4030c0',
					'editor.findMatchHighlightBackground': '#00000000',
					'editorSuggestWidget.background': '#1c1e20',
					'editorSuggestWidget.border': '#101010',
					'editorIndentGuide.background': '#2c2c2c',
					'editorIndentGuide.activeBackground': '#3c3c3c',
					'editorLineNumber.foreground': '#7d7b77',
					'editorLineNumber.activeForeground': '#bebcb8',
					'dropdown.background': '#1c1e20',
					'dropdown.foreground': '#d8d8d8',
					'menu.border': '#101010',
					'input.background': '#161718',
					'input.foreground': '#d8d8d8',
					'input.border': '#000000',
					'widget.shadow': '#00000000',
					focusBorder: '#0080ff',
					contrastBorder: '#101010',
					'list.activeSelectionBackground': '#303234',
					'list.activeSelectionForeground': '#d4d4d4',
					'list.highlightForeground': '#80e0e0',
					'list.focusHighlightForeground': '#80e0e0'
				}
			}
		};
		return function (theme) {
			const options = themeData[theme];
			if (options instanceof Object && monaco instanceof Object) {
				monaco.editor.defineTheme(theme, options);
				themeData[theme] = null;
			}
		};
	})()
});
