import { $, measureText } from '@/util/dom.ts';
import { Scene } from '@/scene/scene-window.ts';
import { UI } from '@/ui/ui-window.ts';
import { Animation } from '@/animation/animation-window.ts';
import { Layout } from '@/layout/layout.ts';
import { Particle } from '@/particle/particle-window.ts';
import { Menubar } from '@/title/menu-bar.ts';
import { Title } from '@/title/title-bar.ts';

export const Window = {
	ambient: $('#window-ambient'),
	frames: [],
	positionMode: 'center',
	absolutePos: { x: 0, y: 0 },
	overlapRoot: null,
	activeElement: null,
	initialize: null,
	open: null,
	close: null,
	closeAll: null,
	isWindowOpen: null,
	getTopWindow: null,
	setPositionMode: null,
	saveActiveElement: null,
	restoreActiveElement: null,
	refocus: null,
	confirm: null,
	keydown: null,
	cancel: null
};

Window.initialize = function () {
	const buttons = document.getElementsByName('cancel');
	const length = buttons.length;
	for (let i = 0; i < length; i++) {
		buttons[i].on('click', this.cancel);
	}
};

Window.open = function (id) {
	const frames = this.frames;
	const element = document.getElementById(id);
	if (!element) {
		return;
	}

	const { activeElement } = document;
	if (!frames.includes(element)) {
		if (frames.length > 0) {
			frames[frames.length - 1].blur();
		} else {
			Title.pointermove({ target: null });
			Window.saveActiveElement();
			Layout.disableFocusableElements();
			document.body.style.pointerEvents = 'none';
			document.activeElement.blur();
			window.off('keydown', Menubar.keydown);
			window.off('keydown', Scene.keydown);
			window.off('keydown', UI.keydown);
			window.off('keydown', Animation.keydown);
			window.off('keydown', Particle.keydown);
			window.on('keydown', Window.keydown);
		}

		// 解决失去焦点后还能使用键盘滚动的问题 延时获得焦点是为了解决鼠标按下瞬间焦点切换被阻止的问题
		Title.target.tabIndex = -1;
		Title.target.focus();
		setTimeout(() => {
			const active = document.activeElement;
			if (active === activeElement && frames[frames.length - 1] === element) {
				Title.target.focus();
			}
		});
		(element as any).open();
	}
};

Window.close = function (id = null) {
	const frames = this.frames;
	if (!frames.length) {
		return;
	}

	const element = frames[frames.length - 1];
	if (id && id !== element.id) {
		return;
	}

	if (element.close()) {
		if (frames.length > 0) {
			frames[frames.length - 1].focus();
		} else {
			Title.pointerenter();
			Window.restoreActiveElement();
			Layout.enableFocusableElements();
			document.body.style.pointerEvents = 'inherit';
			window.on('keydown', Menubar.keydown);
			window.on('keydown', Scene.keydown);
			window.on('keydown', UI.keydown);
			window.on('keydown', Animation.keydown);
			window.on('keydown', Particle.keydown);
			window.off('keydown', Window.keydown);
		}
		if (this.overlapRoot === element) {
			this.setPositionMode('center');
		}
	}
};

Window.closeAll = function () {
	const frames = this.frames;
	let i = frames.length;
	while (--i >= 0) {
		const frame = frames[i];
		const enabled = frame.closeEventEnabled;
		frame.closeEventEnabled = false;
		this.close(frame.id);
		frame.closeEventEnabled = enabled;
	}
};

Window.isWindowOpen = function (id) {
	for (const frame of this.frames) {
		if (frame.id === id) return true;
	}
	return false;
};

Window.getTopWindow = function () {
	const { frames } = this;
	if (frames.length !== 0) {
		return frames[frames.length - 1];
	}
	return undefined;
};

Window.setPositionMode = function (mode) {
	if (this.positionMode !== mode) {
		if (this.overlapRoot) {
			this.overlapRoot = null;
		}
		switch (mode) {
			case 'center':
				break;
			case 'absolute':
				break;
			case 'overlap': {
				const { frames } = this;
				const { length } = frames;
				if (length === 0) return;
				this.overlapRoot = frames[length - 1];
				break;
			}
		}
		this.positionMode = mode;
	}
};

Window.saveActiveElement = function () {
	const { activeElement } = document;
	if (activeElement !== document.body) {
		this.activeElement = activeElement;
		this.activeElement.blur();
	}
};

Window.restoreActiveElement = function () {
	if (this.activeElement) {
		this.activeElement.focus();
		this.activeElement = null;
	}
};

Window.refocus = function () {
	const active = document.activeElement;
	if (active !== document.body) {
		active.blur();
		active.focus();
	}
};

Window.confirm = (function IIFE() {
	const elWindow = $('#confirmation');
	const elMessage = $('#confirmation-message');
	const buttons = [
		$('#confirmation-button-0'),
		$('#confirmation-button-1'),
		$('#confirmation-button-2')
	];
	return function (options, items) {
		const message = options.message ?? '';
		const click = function (event) {
			Window.close('confirmation');
			const index = buttons.indexOf(this);
			const item = items[index];
			item.click?.();
		};
		for (let i = 0; i < buttons.length; i++) {
			const button = buttons[i];
			const item = items[i];
			if (item) {
				button.textContent = item.label;
				button.on('click', click);
				button.show();
			} else {
				button.hide();
			}
		}
		if (items.length > 0) {
			buttons[0].getFocus();
		}
		elMessage.textContent = message;
		elWindow.on(
			'closed',
			(event) => {
				for (const button of buttons) {
					button.off('click', click);
				}
				options.close?.();
			},
			{ once: true }
		);

		const measure = measureText(message);
		const textWidth = measure.width;
		const textHeight = measure.lines * 20;
		const buttonWidth = items.length * 98 - 10;
		const contentWidth = Math.max(textWidth, buttonWidth) + 20;
		const contentHeight = textHeight + 50;
		elWindow.style.width = `${contentWidth}px`;
		elWindow.style.height = `${contentHeight + 24}px`;
		Window.open('confirmation');
	};
})();

Window.keydown = function (event) {
	if (event.altKey) {
		switch (event.code) {
			case 'F4':
				event.preventDefault();
				Window.refocus();
				Window.close();
				break;
		}
	} else {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter': {
				const active = document.activeElement;
				if (
					(active instanceof HTMLButtonElement ||
						active instanceof HTMLTextAreaElement ||
						(active as HTMLElement)?.closest?.('.monaco-editor') ||
						(active as HTMLElement)?.closest?.('text-area') ||
						(active as HTMLElement)?.closest?.('#script-script') ||
						(active as HTMLElement)?.closest?.('#edit-data-current')) &&
					!event.cmdOrCtrlKey
				) {
					return;
				}
				const frames = Window.frames;
				const frame = frames[frames.length - 1];
				const selector = `#${frame.id} > content-frame > button[name=confirm]`;
				const button = document.querySelector(selector);
				if (button instanceof HTMLButtonElement) {
					event.preventDefault();
					if (active !== document.body) {
						active.blur();
					}
					button.click();
				}
				break;
			}
			case 'KeyS': {
				if (!event.cmdOrCtrlKey) return;
				const frames = Window.frames;
				const frame = frames[frames.length - 1];
				const selector = `#${frame.id} > content-frame > button[name=apply]`;
				const button = document.querySelector(selector);
				if (button instanceof HTMLButtonElement) {
					const active = document.activeElement;
					if (active !== document.body) {
						// 调用blur来触发change事件
						active.blur();
						active.focus();
					}
					button.click();
				}
				break;
			}
			case 'Escape':
				Window.refocus();
				Window.close();
				break;
		}
	}
};

Window.cancel = function (event) {
	let element = event.target.parentNode;
	while (element) {
		if (element.tagName === 'WINDOW-FRAME') {
			return Window.close(element.id);
		} else {
			element = element.parentNode;
		}
	}
};

Window.ambient.update = function () {
	const frames = Window.frames;
	let i = frames.length;
	while (--i >= 0) {
		const frame = frames[i];
		if (frame.enableAmbient) {
			this.addClass('open');
			this.style.zIndex = i + 1;
			return;
		}
	}
	this.removeClass('open');
};
