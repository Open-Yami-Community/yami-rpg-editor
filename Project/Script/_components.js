'use strict'

// ******************************** 元素访问器 ********************************

// 元素访问器 - 名称
Object.defineProperty(HTMLElement.prototype, 'name', {
	get: function () {
		return this.getAttribute('name')
	},
	set: function (value) {
		this.setAttribute('name', value)
	}
})

// 元素访问器 - 内部高度
Object.defineProperty(HTMLElement.prototype, 'innerHeight', {
	get: function () {
		let padding = this._padding
		if (padding === undefined) {
			const css = this.css()
			const pt = parseInt(css.paddingTop)
			const pb = parseInt(css.paddingBottom)
			padding = this._padding = pt + pb
		}
		const outerHeight = this.clientHeight
		const innerHeight = outerHeight - padding
		return Math.max(innerHeight, 0)
	}
})

// ******************************** 元素方法 ********************************

// 元素方法 - 读取数据
HTMLElement.prototype.read = function () {
	return this.dataValue
}

// 元素方法 - 写入数据
HTMLElement.prototype.write = function (value) {
	this.dataValue = value
}

// 元素方法 - 清除子元素
HTMLElement.prototype.clear = function () {
	this.textContent = ''
	return this
}

// 元素方法 - 启用元素
HTMLElement.prototype.enable = function () {
	this.removeClass('disabled')
}

// 元素方法 - 禁用元素
HTMLElement.prototype.disable = function () {
	this.addClass('disabled')
}

// 元素方法 - 检查类名
HTMLElement.prototype.hasClass = function (className) {
	return this.classList.contains(className)
}

// 元素方法 - 添加类名
HTMLElement.prototype.addClass = function (className) {
	if (!this.classList.contains(className)) {
		this.classList.add(className)
		return true
	}
	return false
}

// 元素方法 - 删除 Class
HTMLElement.prototype.removeClass = function (className) {
	if (this.classList.contains(className)) {
		this.classList.remove(className)
		return true
	}
	return false
}

// 元素方法 - 往上搜索目标元素
HTMLElement.prototype.seek = function (tagName, count = 1) {
	let element = this
	while (count-- > 0) {
		if (
			element.tagName !== tagName.toUpperCase() &&
			element.parentNode instanceof HTMLElement
		) {
			element = element.parentNode
			continue
		}
		break
	}
	return element
}

// 元素方法 - 返回计算后的 CSS 对象
HTMLElement.prototype.css = function () {
	return getComputedStyle(this)
}

// 元素方法 - 返回边框矩形对象
HTMLElement.prototype.rect = function () {
	return this.getBoundingClientRect()
}

// 元素方法 - 隐藏
HTMLElement.prototype.hide = function () {
	this.addClass('hidden')
	return this
}

// 元素方法 - 显示
HTMLElement.prototype.show = function () {
	this.removeClass('hidden')
	return this
}

// 元素方法 - 隐藏子元素
HTMLElement.prototype.hideChildNodes = function () {
	for (const childNode of this.childNodes) {
		childNode.hide()
	}
}

// 元素方法 - 显示子元素
HTMLElement.prototype.showChildNodes = function () {
	for (const childNode of this.childNodes) {
		childNode.show()
	}
}

// 元素方法 - 获得焦点
// 异步执行可以避免与指针按下行为起冲突
HTMLElement.prototype.getFocus = function (mode = null) {
	setTimeout(() => {
		this.focus()
		switch (mode) {
			case 'all':
				if (this.select) {
					this.select()
					this.scrollLeft = 0
				}
				break
			case 'end':
				if (typeof this.selectionStart === 'number') {
					const endIndex = this.value.length
					this.selectionStart = endIndex
					this.selectionEnd = endIndex
				}
				break
		}
	})
}

// 元素方法 - 设置工具提示
HTMLElement.prototype.setTooltip = (function IIFE() {
	const tooltip = $('#tooltip')
	const capture = { capture: true }
	const timer = new Timer({
		duration: 0,
		callback: () => {
			if (state === 'waiting') {
				let tip = target.tip ?? ''
				if (!tip) {
					state = 'closed'
					window.off('keydown', close, capture)
					window.off('pointerdown', close, capture)
					return
				}
				// 添加快捷键信息
				const hotkey = target.getAttribute('hotkey')
				if (hotkey) {
					if (tip.includes('\n')) {
						tip = tip.replace('\n', ` (${hotkey})\n`)
					} else {
						tip += ` (${hotkey})`
					}
				}
				state = 'open'
				tooltip.addClass('open')
				tooltip.innerHTML = tip
				const { width, height } = tooltip.rect()
				const right = window.innerWidth - width
				const bottom = window.innerHeight - height
				const x = Math.min(clientX + 10, right)
				const y = Math.min(clientY + 15, bottom)
				tooltip.style.left = `${x}px`
				tooltip.style.top = `${y}px`
				rect = tooltip.rect()
			}
		}
	})
	let state = 'closed'
	let target = null
	let rect = null
	let timeStamp = 0
	let clientX = 0
	let clientY = 0

	// 关闭
	const close = function () {
		switch (state) {
			case 'waiting':
			case 'open':
				state = 'closed'
				rect = null
				timer.remove()
				tooltip.removeClass('open')
				window.off('keydown', close, capture)
				window.off('pointerdown', close, capture)
				break
		}
	}

	// 指针移动事件
	const pointermove = function (event) {
		// 两个重叠元素时执行最上层的那个
		if (timeStamp === event.timeStamp) {
			return
		}
		timeStamp = event.timeStamp
		switch (state) {
			case 'closed':
				if (target !== this) {
					state = 'waiting'
					target = this
					timer.elapsed = 0
					timer.duration = 250
					timer.add()
					clientX = event.clientX
					clientY = event.clientY
					window.on('keydown', close, capture)
					window.on('pointerdown', close, capture)
				}
				break
			case 'waiting':
				if (target === this) {
					timer.elapsed = 0
					clientX = event.clientX
					clientY = event.clientY
				} else {
					close()
				}
				break
			case 'open':
				if (target === this) {
					const x = event.clientX
					const y = event.clientY
					const l = rect.left
					const r = rect.right
					const t = rect.top
					const b = rect.bottom
					if (x >= l && x < r && y >= t && y < b) {
						close()
					}
				} else {
					close()
				}
				break
		}
	}

	// 指针离开事件
	const pointerleave = function (event) {
		target = null
		close()
	}

	return function (tip) {
		if ('tip' in this === false) {
			this.on('pointermove', pointermove)
			this.on('pointerleave', pointerleave)
		}
		switch (typeof tip) {
			case 'string':
				this.tip = tip
				break
			case 'function':
				Object.defineProperty(this, 'tip', {
					configurable: true,
					get: tip
				})
				break
		}
	}
})()

// 元素方法 - 添加滚动条
HTMLElement.prototype.addScrollbars = function () {
	const hBar = document.createElement('scroll-bar')
	const vBar = document.createElement('scroll-bar')
	const corner = document.createElement('scroll-corner')
	const parent = this.parentNode
	const next = this.nextSibling
	if (next) {
		parent.insertBefore(hBar, next)
		parent.insertBefore(vBar, next)
		parent.insertBefore(corner, next)
	} else {
		parent.appendChild(hBar)
		parent.appendChild(vBar)
		parent.appendChild(corner)
	}
	hBar.bind(this, 'horizontal')
	vBar.bind(this, 'vertical')

	// 鼠标滚轮事件
	const wheel = (event) => {
		this.dispatchEvent(new WheelEvent('wheel', event))
	}
	hBar.on('wheel', wheel)
	vBar.on('wheel', wheel)
	corner.on('wheel', wheel)

	// 用户滚动事件
	// 使用自定义的userscroll代替内置的scroll有以下原因:
	// scroll是异步的，触发时机是在Promise后Animation前
	// 如果在Animation中滚动会推迟到下一帧触发事件
	// userscroll由于手动调用可以避免不需要触发的情况
	const userscroll = new Event('userscroll')

	// 添加方法 - 开始滚动
	this.beginScrolling = function () {
		hBar.addClass('dragging')
		vBar.addClass('dragging')
	}

	// 添加方法 - 结束滚动
	this.endScrolling = function () {
		hBar.removeClass('dragging')
		vBar.removeClass('dragging')
	}

	// 添加方法 - 设置滚动条位置
	this.setScroll = function (left, top) {
		const sl = this.scrollLeft
		const st = this.scrollTop
		this.scroll(left, top)
		if (this.scrollLeft !== sl || this.scrollTop !== st) {
			this.dispatchEvent(userscroll)
		}
	}

	// 添加方法 - 设置滚动条左侧位置
	this.setScrollLeft = function (left) {
		const sl = this.scrollLeft
		this.scrollLeft = left
		if (this.scrollLeft !== sl) {
			this.dispatchEvent(userscroll)
		}
	}

	// 添加方法 - 设置滚动条顶部位置
	this.setScrollTop = function (top) {
		const st = this.scrollTop
		this.scrollTop = top
		if (this.scrollTop !== st) {
			this.dispatchEvent(userscroll)
		}
	}

	// 添加方法 - 更新滚动条
	let withCorner = false
	this.updateScrollbars = function () {
		if (
			this.clientWidth < this.scrollWidth &&
			this.clientHeight < this.scrollHeight
		) {
			if (!withCorner) {
				withCorner = true
				hBar.addClass('with-corner')
				vBar.addClass('with-corner')
				corner.addClass('visible')
			}
		} else {
			if (withCorner) {
				withCorner = false
				hBar.removeClass('with-corner')
				vBar.removeClass('with-corner')
				corner.removeClass('visible')
			}
		}
		hBar.updateHorizontalBar()
		vBar.updateVerticalBar()
	}
}

// 元素方法 - 添加设置滚动方法
HTMLElement.prototype.addSetScrollMethod = function () {
	// 用户滚动事件
	const userscroll = new Event('userscroll')

	// 添加方法 - 设置滚动条位置
	this.setScroll = function (left, top) {
		const sl = this.scrollLeft
		const st = this.scrollTop
		this.scroll(left, top)
		if (this.scrollLeft !== sl || this.scrollTop !== st) {
			this.dispatchEvent(userscroll)
		}
	}
}

// 元素方法 - 检查是否出现滚动条
// 缩放率不是 100% 有可能出现
// clientWidth > scrollWidth
HTMLElement.prototype.hasScrollBar = function () {
	return (
		this.clientWidth < this.scrollWidth ||
		this.clientHeight < this.scrollHeight
	)
}

// 元素方法 - 判断事件坐标在内容区域上
HTMLElement.prototype.isInContent = function (event) {
	const coords = event.getRelativeCoords(this)
	const x = coords.x - this.scrollLeft
	const y = coords.y - this.scrollTop
	return x >= 0 && x < this.clientWidth && y >= 0 && y < this.clientHeight
}

// 元素方法 - 发送改变事件
HTMLElement.prototype.dispatchChangeEvent = (function IIFE() {
	const changes = [
		new Event('change', { bubbles: true }),
		new Event('change', { bubbles: true })
	]
	return function (index = 0) {
		this.dispatchEvent(changes[index])
	}
})()

// 元素方法 - 发送调整事件
HTMLElement.prototype.dispatchResizeEvent = (function IIFE() {
	const resize = new Event('resize')
	return function () {
		this.dispatchEvent(resize)
	}
})()

// 元素方法 - 发送更新事件
HTMLElement.prototype.dispatchUpdateEvent = (function IIFE() {
	const update = new Event('update')
	return function () {
		this.dispatchEvent(update)
	}
})()

// 元素方法 - 侦听拖拽滚动条事件
HTMLElement.prototype.listenDraggingScrollbarEvent = (function IIFE() {
	// 默认指针按下事件
	const defaultPointerdown = function (event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 0:
				if (event.altKey) {
					event.preventDefault()
					event.stopImmediatePropagation()
					this.dragging = event
					event.mode = 'scroll'
					event.scrollLeft = this.scrollLeft
					event.scrollTop = this.scrollTop
					Cursor.open('cursor-grab')
					window.on('pointerup', this.scrollPointerup)
					window.on('pointermove', this.scrollPointermove)
				}
				break
		}
	}

	// 指针弹起事件
	const pointerup = function (event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'scroll':
					Cursor.close('cursor-grab')
					break
			}
			this.dragging = null
			window.off('pointerup', this.scrollPointerup)
			window.off('pointermove', this.scrollPointermove)
		}
	}

	// 指针移动事件
	const pointermove = function (event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'scroll':
					this.scrollLeft =
						dragging.scrollLeft + dragging.clientX - event.clientX
					this.scrollTop =
						dragging.scrollTop + dragging.clientY - event.clientY
					break
			}
		}
	}

	return function (pointerdown = defaultPointerdown, options) {
		this.scrollPointerup = pointerup.bind(this)
		this.scrollPointermove = pointermove.bind(this)
		this.on('pointerdown', pointerdown, options)
	}
})()

// ******************************** 滚动侦听器 ********************************

namespace: {
	let target = null
	let highSpeed = 0
	let lowSpeed = 0
	let scrollHorizontal = false
	let scrollVertical = false
	let scrollUpdater = null

	// 计算滚动距离
	const computeScrollDelta = (speed) => {
		let delta = speed * Timer.deltaTime
		const dpr = window.devicePixelRatio
		const tolerance = 0.0001
		// 修正数值让正反方向每帧的滚动距离相等
		if (delta > 0) {
			return Math.max(Math.floor(delta), 1) / dpr + tolerance
		}
		if (delta < 0) {
			return Math.min(Math.ceil(delta), -1) / dpr + tolerance
		}
		return 0
	}

	// 滚动检测计时器
	const timer = new Timer({
		duration: Infinity,
		update: (timer) => {
			const { speedX, speedY } = timer
			const { scrollLeft, scrollTop } = target
			if (speedX !== 0) {
				target.scrollLeft += computeScrollDelta(speedX)
			}
			if (speedY !== 0) {
				target.scrollTop += computeScrollDelta(speedY)
			}
			if (
				target.scrollLeft !== scrollLeft ||
				target.scrollTop !== scrollTop
			) {
				scrollUpdater()
			}
		}
	})

	// 指针移动事件
	const pointermove = (event) => {
		const dpr = window.devicePixelRatio
		const rect = target.rect()
		const x = event.clientX
		const y = event.clientY
		const l = rect.left
		const t = rect.top
		const cr = target.clientWidth + l
		const cb = target.clientHeight + t
		// 对于非100%像素分辨率cr和cb偏大
		const r = Math.min(rect.right, cr) - dpr
		const b = Math.min(rect.bottom, cb) - dpr
		const scrollSpeedX = scrollHorizontal
			? x <= l
				? l - x < 100 / dpr
					? -lowSpeed
					: -highSpeed
				: x >= r
					? x - r < 100 / dpr
						? +lowSpeed
						: +highSpeed
					: 0
			: 0
		const scrollSpeedY = scrollVertical
			? y <= t
				? t - y < 100 / dpr
					? -lowSpeed
					: -highSpeed
				: y >= b
					? y - b < 100 / dpr
						? +lowSpeed
						: +highSpeed
					: 0
			: 0
		if (scrollSpeedX !== 0 || scrollSpeedY !== 0) {
			if (
				timer.speedX !== scrollSpeedX ||
				timer.speedY !== scrollSpeedY
			) {
				timer.speedX = scrollSpeedX
				timer.speedY = scrollSpeedY
				timer.add()
			}
		} else if (timer) {
			timer.speedX = 0
			timer.speedY = 0
			timer.remove()
		}
	}

	// 添加滚动侦听器
	HTMLElement.prototype.addScrollListener = function (
		mode,
		speed,
		shift,
		updater
	) {
		target?.removeScrollListener()
		target = this
		switch (mode) {
			case 'horizontal':
				scrollHorizontal = true
				scrollVertical = false
				break
			case 'vertical':
				scrollHorizontal = false
				scrollVertical = true
				break
			case 'both':
				scrollHorizontal = true
				scrollVertical = true
				break
		}
		highSpeed = speed
		lowSpeed = shift ? speed / 4 : speed
		scrollUpdater = updater ?? Function.empty
		window.on('pointermove', pointermove)
	}

	// 移除滚动侦听器
	HTMLElement.prototype.removeScrollListener = function () {
		if (target !== this) return
		if (timer.speedX || timer.speedY) {
			timer.speedX = 0
			timer.speedY = 0
			timer.remove()
		}
		target = null
		scrollUpdater = null
		window.off('pointermove', pointermove)
	}
}

// ******************************** 按钮扩展 ********************************

// 启用元素
HTMLButtonElement.prototype.enable = function () {
	if (this.disabled) {
		this.disabled = false
	}
}

// 禁用元素
HTMLButtonElement.prototype.disable = function () {
	if (!this.disabled) {
		this.disabled = true
	}
}

// ******************************** 窗口框架 ********************************

class WindowFrame extends HTMLElement {
	enableAmbient //:boolean
	activeElement //:element
	focusableElements //:array
	windowResize //:function
	openEventEnabled //:boolean
	closeEventEnabled //:boolean
	closedEventEnabled //:boolean
	resizeEventEnabled //:boolean
	maximizeEventEnabled //:boolean
	unmaximizeEventEnabled //:boolean

	constructor() {
		super()

		// 设置属性
		this.enableAmbient = true
		this.activeElement = null
		this.focusableElements = null
		this.windowResize = null
		this.openEventEnabled = false
		this.closeEventEnabled = false
		this.closedEventEnabled = false
		this.resizeEventEnabled = false
		this.maximizeEventEnabled = false
		this.unmaximizeEventEnabled = false
	}

	// 打开窗口
	open() {
		if (Window.frames.append(this)) {
			Window.ambient.update()
			this.addClass('open')
			this.computePosition()
			this.style.zIndex = Window.frames.length
			if (this.openEventEnabled) {
				this.dispatchEvent(new Event('open'))
			}
			if (this.resizeEventEnabled && this.hasClass('maximized')) {
				this.dispatchEvent(new Event('resize'))
				window.on('resize', this.windowResize)
			}
		}
	}

	// 关闭窗口
	close() {
		if (
			this.closeEventEnabled &&
			!this.dispatchEvent(
				new Event('close', {
					cancelable: true
				})
			)
		) {
			return false
		}
		if (Window.frames.remove(this)) {
			Window.ambient.update()
			this.removeClass('open')
			if (this.closedEventEnabled) {
				this.dispatchEvent(new Event('closed'))
			}
			if (this.resizeEventEnabled && this.hasClass('maximized')) {
				window.off('resize', this.windowResize)
			}
			// 快捷键操作不会触发 blur
			if (document.activeElement !== document.body) {
				document.activeElement.blur()
			}
			return true
		}
		return false
	}

	// 最大化窗口
	maximize() {
		if (this.addClass('maximized')) {
			this.style.left = '0'
			this.style.top = '0'
			if (this.maximizeEventEnabled) {
				this.dispatchEvent(new Event('maximize'))
			}
			if (this.resizeEventEnabled) {
				this.dispatchEvent(new Event('resize'))
				window.on('resize', this.windowResize)
			}
		}
	}

	// 取消最大化窗口
	unmaximize() {
		if (this.removeClass('maximized')) {
			this.computePosition()
			if (this.unmaximizeEventEnabled) {
				this.dispatchEvent(new Event('unmaximize'))
			}
			if (this.resizeEventEnabled) {
				this.dispatchEvent(new Event('resize'))
				window.off('resize', this.windowResize)
			}
		}
	}

	// 获得焦点
	focus() {
		if (this.removeClass('blur')) {
			this.removeClass('translucent')
			const elements = this.focusableElements
			for (const element of elements) {
				element.tabIndex += 1
			}
			this.focusableElements = null
			if (this.activeElement) {
				this.activeElement.focus()
				this.activeElement = null
			}
		}
	}

	// 失去焦点
	blur() {
		if (this.addClass('blur')) {
			if (!this.hasClass('opaque') && !this.hasClass('maximized')) {
				this.addClass('translucent')
			}
			const selector = Layout.focusableSelector
			const elements = this.querySelectorAll(selector)
			for (const element of elements) {
				element.tabIndex -= 1
			}
			this.focusableElements = elements
			if (document.activeElement !== document.body) {
				this.activeElement = document.activeElement
				this.activeElement.blur()
			}
		}
	}

	// 计算位置
	computePosition() {
		const mode = this.getAttribute('mode')
		switch (mode ?? Window.positionMode) {
			case 'center':
				this.center()
				break
			case 'absolute': {
				const pos = Window.absolutePos
				this.absolute(pos.x, pos.y)
				break
			}
			case 'overlap': {
				const frames = Window.frames
				const parent = frames[frames.length - 2]
				this.overlap(parent)
				break
			}
		}
	}

	// 居中位置
	center() {
		const rect = this.rect()
		const x = CSS.rasterize((window.innerWidth - rect.width) / 2)
		const y = CSS.rasterize((window.innerHeight - rect.height) / 2)
		this.setPosition(x, y, rect)
	}

	// 绝对位置
	absolute(left, top) {
		const rect = this.rect()
		const x = CSS.rasterize(left)
		const y = CSS.rasterize(top)
		this.setPosition(x, y, rect)
	}

	// 堆叠位置
	overlap(parent) {
		const rect = this.rect()
		const { left, top } = parent.style
		const x = CSS.rasterize(parseFloat(left) + 24)
		const y = CSS.rasterize(parseFloat(top) + 24)
		this.setPosition(x, y, rect)
	}

	// 设置位置
	setPosition(x, y, rect) {
		// 应用窗口带边框需要减去1px的margin
		if (document.body.hasClass('border')) {
			const dpx = 1 / window.devicePixelRatio
			x -= dpx
			y -= dpx
		}
		const xMax = window.innerWidth - rect.width
		const yMax = window.innerHeight - rect.height
		this.style.left = `${Math.clamp(x, 0, xMax)}px`
		this.style.top = `${Math.clamp(y, 0, yMax)}px`
	}

	// 设置标题
	setTitle(text) {
		const titleBar = this.firstElementChild
		if (titleBar instanceof TitleBar) {
			for (const childNode of titleBar.childNodes) {
				if (childNode instanceof Text) {
					childNode.nodeValue = text
					return
				}
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'open':
				this.openEventEnabled = true
				break
			case 'close':
				this.closeEventEnabled = true
				break
			case 'closed':
				this.closedEventEnabled = true
				break
			case 'resize':
				this.resizeEventEnabled = true
				this.windowResize = (event) => {
					this.dispatchEvent(new Event('resize'))
				}
				break
			case 'maximize':
				this.maximizeEventEnabled = true
				break
			case 'unmaximize':
				this.unmaximizeEventEnabled = true
				break
		}
	}
}

customElements.define('window-frame', WindowFrame)

// ******************************** 标题栏 ********************************

class TitleBar extends HTMLElement {
	dragging //:event

	constructor() {
		super()

		// 设置属性
		this.dragging = null

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
		this.on('click', this.mouseclick)
		this.on('doubleclick', this.doubleclick)
	}

	// 指针按下事件
	pointerdown(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 0:
				if (event.target instanceof TitleBar) {
					const windowFrame = this.parentNode
					const rect = windowFrame.rect()
					const startX = event.clientX
					const startY = event.clientY
					const { left, top, width, height } = rect
					const pointermove = (event) => {
						if (this.dragging.relate(event)) {
							let right = window.innerWidth - width
							let bottom = window.innerHeight - height
							if (document.body.hasClass('border')) {
								// left和top的偏移由css:margin来填充
								const dpx = 1 / window.devicePixelRatio
								right -= dpx * 2
								bottom -= dpx * 2
							}
							const x = CSS.rasterize(
								left - startX + event.clientX
							)
							const y = CSS.rasterize(
								top - startY + event.clientY
							)
							windowFrame.style.left = `${Math.clamp(x, 0, right)}px`
							windowFrame.style.top = `${Math.clamp(y, 0, bottom)}px`
						}
					}
					const pointerup = (event) => {
						if (this.dragging.relate(event)) {
							cancel()
						}
					}
					const cancel = (event) => {
						this.dragging = null
						window.off('pointermove', pointermove)
						window.off('pointerup', pointerup)
						window.off('blur', cancel)
					}
					this.dragging = event
					event.cancel = cancel
					window.on('pointermove', pointermove)
					window.on('pointerup', pointerup)
					window.on('blur', cancel)
				}
				break
		}
	}

	// 鼠标点击事件
	mouseclick(event) {
		switch (event.target.tagName) {
			case 'MAXIMIZE': {
				const windowFrame = this.parentNode
				if (!windowFrame.hasClass('maximized')) {
					windowFrame.maximize()
				} else {
					windowFrame.unmaximize()
				}
				break
			}
			case 'CLOSE': {
				const windowFrame = this.parentNode
				Window.close(windowFrame.id)
				break
			}
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		if (
			event.target instanceof TitleBar &&
			event.target.querySelector('maximize')
		) {
			this.dragging?.cancel()
			const windowFrame = this.parentNode
			if (!windowFrame.hasClass('maximized')) {
				windowFrame.maximize()
			} else {
				windowFrame.unmaximize()
			}
		}
	}
}

customElements.define('title-bar', TitleBar)

// ******************************** 页面管理器 ********************************

class PageManager extends HTMLElement {
	index //:string
	active //:element
	switchEventEnabled //:boolean

	constructor() {
		super()

		// 处理子元素
		const elements = this.childNodes
		if (elements.length > 0) {
			let i = elements.length
			while (--i >= 0) {
				const element = elements[i]
				if (element.tagName === 'PAGE-FRAME') {
					element.dataValue = element.getAttribute('value')
				} else {
					this.removeChild(element)
				}
			}
		}

		// 设置属性
		this.index = null
		this.active = null
		this.switchEventEnabled = false
	}

	// 切换页面
	switch(value) {
		const last = this.index
		if (last !== value) {
			let target = null
			if (value !== null) {
				for (const element of this.childNodes) {
					if (element.dataValue === value) {
						target = element
						break
					}
				}
			}
			const active = this.active
			if (active !== target) {
				this.index = value
				this.active = target
				active?.removeClass('visible')
				target?.addClass('visible')
				// if (target) {
				//   this.scrollLeft = 0
				//   this.scrollTop = 0
				// }
				if (this.switchEventEnabled) {
					const event = new Event('switch')
					event.last = last
					event.value = value
					this.dispatchEvent(event)
				}
				active?.dispatchResizeEvent()
				target?.dispatchResizeEvent()
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'switch':
				this.switchEventEnabled = true
				break
		}
	}
}

customElements.define('page-manager', PageManager)

// ******************************** 选框区域 ********************************

class MarqueeArea extends HTMLElement {
	selection //:element
	x //:number
	y //:number
	width //:number
	height //:number
	scaleX //:number
	scaleY //:number
	visible //:boolean
	saveData //:object

	constructor() {
		super()

		// 创建选框
		const selection = document.createElement('selection')
		this.appendChild(selection.hide())

		// 设置属性
		this.selection = selection
		this.x = 0
		this.y = 0
		this.width = 0
		this.height = 0
		this.scaleX = 1
		this.scaleY = 1
		this.visible = false
		this.saveData = {}
	}

	// 保存状态
	save(key = 'default') {
		this.saveData[key] = {
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			scaleX: this.scaleX,
			scaleY: this.scaleY
		}
	}

	// 恢复状态
	restore(key = 'default') {
		const data = this.saveData[key]
		if (data) {
			for (const key of Object.keys(data)) {
				this[key] = data[key]
			}
			this.saveData[key] = null
		}
	}

	// 调整大小
	resize({ width, height }) {
		this.style.width = `${width}px`
		this.style.height = `${height}px`
	}

	// 擦除矩形
	clear() {
		if (this.visible) {
			this.visible = false
			this.selection.hide()
		}
	}

	// 选取矩形
	select(x = this.x, y = this.y, width = this.width, height = this.height) {
		// 记录属性
		this.x = x
		this.y = y
		this.width = width
		this.height = height
		this.visible = true

		// 设置矩形
		const selection = this.selection
		const scaleX = this.scaleX
		const scaleY = this.scaleY
		const realX = x * scaleX
		const realY = y * scaleY
		const realWidth = width * scaleX
		const realHeight = height * scaleY
		selection.show()
		selection.style.left = `${realX}px`
		selection.style.top = `${realY}px`
		selection.style.width = `${realWidth}px`
		selection.style.height = `${realHeight}px`
	}
}

customElements.define('marquee-area', MarqueeArea)

// ******************************** 细节框 ********************************

// 默认 details 的子元素无法正确获得 css 百分比高度属性
class DetailBox extends HTMLElement {
	toggleEventEnabled //:boolean

	constructor() {
		super()

		// 设置属性
		this.toggleEventEnabled = false
	}

	// 开关窗口
	toggle() {
		if (this.hasAttribute('open')) {
			this.close()
		} else {
			this.open()
		}
	}

	// 打开窗口
	open() {
		if (!this.hasAttribute('open')) {
			this.setAttribute('open', '')
			for (const node of this.children) {
				if (!(node instanceof DetailSummary)) {
					node.show()
				}
			}
			if (this.toggleEventEnabled) {
				const toggle = new Event('toggle')
				toggle.value = 'open'
				this.dispatchEvent(toggle)
			}
		}
	}

	// 关闭窗口
	close() {
		if (this.hasAttribute('open')) {
			this.removeAttribute('open')
			for (const node of this.children) {
				if (!(node instanceof DetailSummary)) {
					node.hide()
				}
			}
			if (this.toggleEventEnabled) {
				const toggle = new Event('toggle')
				toggle.value = 'closed'
				this.dispatchEvent(toggle)
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'toggle':
				this.toggleEventEnabled = true
				break
		}
	}
}

customElements.define('detail-box', DetailBox)

// ******************************** 细节概要 ********************************

class DetailSummary extends HTMLElement {
	constructor() {
		super()

		// 设置属性
		// this.tabIndex = -1

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 开关父元素
	toggle() {
		const parent = this.parentNode
		if (parent instanceof DetailBox) {
			parent.toggle()
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey && !event.altKey) {
					this.toggle()
				}
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (event.target === this) {
					this.toggle()
				}
				break
		}
	}
}

customElements.define('detail-summary', DetailSummary)

// ******************************** 文本操作历史 ********************************

class TextHistory {
	input //:element
	stack //:array
	index //:number
	inputType //:string
	deleted //:string
	inserted //:string
	lastInsert //:string
	lastStart //:number
	lastEnd //:number
	editingStart //:number
	selectionStart //:number
	selectionEnd //:number

	constructor(input) {
		this.input = input
		this.stack = []
		this.index = -1
		this.inputType = ''
		this.deleted = ''
		this.inserted = ''
		this.lastInsert = ''
		this.lastStart = 0
		this.lastEnd = 0
		this.editingStart = 0
		this.selectionStart = 0
		this.selectionEnd = 0

		// 扩展方法 - 替换文本
		input.replace = TextHistory.inputReplace

		// 侦听事件
		input.on('keydown', this.inputKeydown)
		input.on('beforeinput', this.inputBeforeinput)
		input.on('input', this.inputInput)
		input.on('blur', this.inputBlur)
		input.on('compositionstart', this.inputCompositionstart)
		input.on('compositionend', this.inputCompositionEnd)
	}

	// 重置历史
	reset() {
		if (this.stack.length !== 0) {
			this.stack = []
			this.index = -1
		}
		this.inputType = ''
		this.lastInsert = ''
	}

	// 保存数据
	save() {
		if (this.inputType) {
			this.inputType = ''
		} else {
			return
		}
		if (!this.deleted && !this.inserted) {
			return
		}

		const data = {
			deleted: this.deleted,
			inserted: this.inserted,
			lastStart: this.lastStart,
			lastEnd: this.lastEnd,
			editingStart: this.editingStart
		}

		// 删除多余的栈
		const stack = this.stack
		const length = this.index + 1
		if (length < stack.length) {
			stack.length = length
		}

		// 堆栈上限: 20
		if (stack.length < 20) {
			this.index++
			stack.push(data)
		} else {
			stack.shift()
			stack.push(data)
		}
	}

	// 恢复数据
	restore(operation) {
		if (operation === 'undo') {
			this.save()
		}
		let index = this.index
		if (operation === 'redo') {
			index++
		}
		if (index >= 0 && index < this.stack.length) {
			const input = this.input
			const data = this.stack[index]
			const { deleted, inserted, lastStart, lastEnd, editingStart } = data

			// 撤销或重做
			let inputType
			TextHistory.restoring = true
			switch (operation) {
				case 'undo':
					inputType = 'historyUndo'
					if (inserted.length > 0) {
						input.selectionStart = editingStart
						input.selectionEnd = editingStart + inserted.length
						document.execCommand('delete')
					}
					if (deleted.length > 0) {
						input.selectionStart = editingStart
						input.selectionEnd = editingStart
						document.execCommand('insertText', false, deleted)
						input.selectionStart = lastStart
						input.selectionEnd = lastEnd
					}
					this.index--
					break
				case 'redo':
					inputType = 'historyRedo'
					if (deleted.length > 0) {
						input.selectionStart = editingStart
						input.selectionEnd = editingStart + deleted.length
						document.execCommand('delete')
					}
					if (inserted.length > 0) {
						input.selectionStart = editingStart
						input.selectionEnd = editingStart
						document.execCommand('insertText', false, inserted)
					}
					this.index++
					break
			}
			TextHistory.restoring = false
			HistoryTimer.finish()
			input.dispatchEvent(
				new InputEvent('input', {
					inputType: inputType,
					bubbles: true
				})
			)
		}
	}

	// 撤销条件判断
	canUndo() {
		return this.index >= 0 || !!this.inputType
	}

	// 重做条件判断
	canRedo() {
		return this.index + 1 < this.stack.length
	}

	// 更新状态
	updateStates(event) {
		const { input } = this
		const inputType = event.inputType
		if (this.inputType !== inputType) {
			this.inputType = inputType ?? 'unknown'
			this.inserted = ''
			this.deleted = ''
			this.lastStart = input.selectionStart
			this.lastEnd = input.selectionEnd
			this.editingStart = input.selectionStart
			if (input.selectionStart !== input.selectionEnd) {
				this.deleted = input.value.slice(
					input.selectionStart,
					input.selectionEnd
				)
			}
		}
		switch (inputType) {
			case 'insertLineBreak':
				this.inserted += '\n'
				break
			case 'insertText':
				if (event.data) {
					this.inserted += event.data
				}
				break
			case 'deleteContentForward':
				if (
					input.selectionStart < input.value.length &&
					input.selectionStart === input.selectionEnd
				) {
					const char = input.value[input.selectionStart]
					this.deleted = this.deleted + char
				}
				break
			case 'deleteContentBackward':
				if (
					input.selectionStart > 0 &&
					input.selectionStart === input.selectionEnd
				) {
					const char = input.value[input.selectionStart - 1]
					this.deleted = char + this.deleted
					this.editingStart--
				}
				break
			case 'replaceText':
				this.inserted = event.data
				break
			default:
				if (event.data) {
					this.inserted =
						event.data.indexOf('\r') !== -1
							? event.data.replace(/\r/g, '')
							: event.data
				}
				break
		}
	}

	// 更新选择区域
	updateSelection(event) {
		const { input } = this
		this.lastInsert = event.data
		this.selectionStart = input.selectionStart
		this.selectionEnd = input.selectionEnd
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'KeyZ':
					if (!event.macRedoKey) {
						this.history.canUndo() && this.history.restore('undo')
						break
					}
				case 'KeyY':
					this.history.canRedo() && this.history.restore('redo')
					break
			}
		}
	}

	// 输入框 - 输入前事件
	inputBeforeinput(event) {
		const { history } = this
		switch (event.inputType) {
			case 'insertCompositionText':
				return
			case 'insertLineBreak':
				if (this instanceof HTMLInputElement) {
					return
				}
			case 'insertText':
				switch (event.data) {
					case ' ':
					case '<':
						if (history.lastInsert !== event.data) {
							HistoryTimer.finish()
						}
						break
				}
			case 'deleteContentForward':
			case 'deleteContentBackward':
				if (
					history.inputType !== '' &&
					(HistoryTimer.complete ||
						HistoryTimer.type !== event.inputType ||
						history.selectionStart !== this.selectionStart ||
						history.selectionEnd !== this.selectionEnd)
				) {
					history.save()
				}
				HistoryTimer.start(event.inputType)
				switch (event.data) {
					case ':':
					case '>':
						if (history.lastInsert !== event.data) {
							HistoryTimer.finish()
						}
						break
				}
				break
			case 'replaceText':
				if (
					history.inputType !== null &&
					(HistoryTimer.complete ||
						HistoryTimer.type !== event.inputType)
				) {
					history.save()
				}
				HistoryTimer.start(event.inputType)
				break
			case 'inputCompositionText':
			default:
				history.save()
				HistoryTimer.finish()
				break
		}
		history.updateStates(event)
	}

	// 输入框 - 输入事件
	inputInput(event) {
		switch (event.inputType) {
			case 'insertCompositionText':
				break
			default:
				if (TextHistory.restoring) {
					event.stopImmediatePropagation()
				} else {
					this.history.updateSelection(event)
				}
				break
		}
	}

	// 输入框 - 失去焦点事件
	inputBlur(event) {
		HistoryTimer.finish()
	}

	// 输入框 - 文本合成开始事件
	inputCompositionstart(event) {
		const { history } = this
		const struct = TextHistory.eventStruct
		struct.data = null
		history.save()
		history.inputBeforeinput.call(this, struct)
		history.updateSelection(event)
	}

	// 输入框 - 文本合成结束事件
	inputCompositionEnd(event) {
		const { history } = this
		if (event.data || history.deleted) {
			const struct = TextHistory.eventStruct
			struct.data = event.data
			history.updateStates(struct)
			history.updateSelection(event)
		} else {
			history.inputType = ''
		}
	}
}

// 文本操作历史恢复中状态开关
TextHistory.restoring = false

// 模拟事件结构
TextHistory.eventStruct = {
	inputType: 'inputCompositionText',
	data: null
}

// 输入框 - 替换文本
TextHistory.inputReplace = (function IIFE() {
	const eventStruct = {
		inputType: 'replaceText',
		data: null
	}
	return function (value) {
		if (typeof value === 'number') {
			value = value.toString()
		}
		eventStruct.data = value
		this.select()
		this.history.inputBeforeinput.call(this, eventStruct)
		this.value = value
	}
})()

// ******************************** 数值操作历史 ********************************

class NumberHistory {
	input //:element
	stack //:array
	index //:number
	lastValue //:string

	constructor(input) {
		this.input = input
		this.stack = []
		this.index = -1
		this.lastValue = ''

		// 侦听事件
		input.on('keydown', this.inputKeydown)
		input.on('input', this.inputInput)
		input.on('blur', this.inputBlur)
	}

	// 重置历史
	reset() {
		if (this.stack.length !== 0) {
			this.stack = []
			this.index = -1
		}
		this.lastValue = this.input.value
	}

	// 保存数据
	save() {
		const data = {
			value: this.lastValue
		}

		// 删除多余的栈
		const stack = this.stack
		const length = this.index + 1
		if (length < stack.length) {
			stack.length = length
		}

		// 堆栈上限: 20
		if (stack.length < 20) {
			this.index++
			stack.push(data)
		} else {
			stack.shift()
			stack.push(data)
		}
	}

	// 恢复数据
	restore(operation) {
		let index = this.index
		if (operation === 'redo') {
			index++
		}
		if (index >= 0 && index < this.stack.length) {
			const input = this.input
			const data = this.stack[index]
			const { value } = data
			data.value = this.lastValue
			NumberHistory.restoring = true
			input.select()
			document.execCommand('insertText', false, value)
			operation === 'undo' && input.select()
			NumberHistory.restoring = false
			HistoryTimer.finish()

			// 改变指针
			switch (operation) {
				case 'undo':
					this.index--
					break
				case 'redo':
					this.index++
					break
			}
		}
	}

	// 撤销条件判断
	canUndo() {
		return this.index >= 0
	}

	// 重做条件判断
	canRedo() {
		return this.index + 1 < this.stack.length
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'KeyZ':
					if (!event.macRedoKey) {
						this.history.canUndo() && this.history.restore('undo')
						break
					}
				case 'KeyY':
					this.history.canRedo() && this.history.restore('redo')
					break
			}
		}
	}

	// 输入框 - 输入事件
	inputInput(event) {
		if (!NumberHistory.restoring) {
			switch (event.inputType) {
				case 'insertCompositionText':
					break
				case 'insertText':
				case 'deleteContentForward':
				case 'deleteContentBackward':
					if (
						HistoryTimer.complete ||
						HistoryTimer.type !== event.inputType
					) {
						this.history.save()
					}
					HistoryTimer.start(event.inputType)
					break
				case undefined:
					if (
						HistoryTimer.complete ||
						HistoryTimer.type !== 'quickInput'
					) {
						this.history.save()
					}
					HistoryTimer.start('quickInput')
					break
				default:
					this.history.save()
					HistoryTimer.finish()
					break
			}
		}
		switch (event.inputType) {
			case 'insertCompositionText':
				break
			default:
				this.history.lastValue = this.value
				break
		}
	}

	// 输入框 - 失去焦点事件
	inputBlur(event) {
		HistoryTimer.finish()
	}
}

// 数值操作历史恢复中状态开关
NumberHistory.restoring = false

// ******************************** 历史操作计时器 ********************************

const HistoryTimer = new Timer({
	duration: 2000,
	callback: (timer) => {
		timer.complete = true
	}
})

// 初始状态
HistoryTimer.complete = true

// 开始计时
HistoryTimer.start = function (type) {
	if (this.complete) {
		this.complete = false
		this.add()
	}
	this.type = type
	this.elapsed = 0
}

// 完成计时
HistoryTimer.finish = function () {
	if (!this.complete) {
		this.complete = true
		this.remove()
	}
}

// ******************************** 文本框 ********************************

class TextBox extends HTMLElement {
	input //:element
	focusEventEnabled //:boolean
	blurEventEnabled //:boolean

	constructor() {
		super()

		// 创建输入框
		const input = document.createElement('input')
		input.addClass('text-box-input')
		input.type = 'text'
		input.history = new TextHistory(input)
		this.appendChild(input)

		// 设置属性
		this.input = input
		this.focusEventEnabled = false
		this.blurEventEnabled = false

		// 添加事件侦听器 - Mac
		if (process.platform === 'darwin') {
			input.on('keydown', TextBox.macInputKeydown)
		}
	}

	// 读取数据
	read() {
		return this.input.value
	}

	// 写入数据
	write(value) {
		this.input.value = value
		this.input.history.reset()
	}

	// 插入数据
	insert(value) {
		this.input.dispatchEvent(
			new InputEvent('beforeinput', {
				inputType: 'insertFromPaste',
				data: value,
				bubbles: true
			})
		)
		document.execCommand('insertText', false, value)
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 获得焦点
	getFocus(mode) {
		return this.input.getFocus(mode)
	}

	// 设置占位符
	setPlaceholder(placeholder) {
		this.input.placeholder = placeholder
	}

	// 设置最大长度
	setMaxLength(length) {
		this.input.maxLength = length
	}

	// 调整输入框大小来适应内容
	fitContent() {
		const parent = this.parentNode
		this.style.width = '0'
		this.style.width = `${Math.clamp(
			this.input.scrollWidth + 2,
			0,
			parent.rect().right - this.rect().left
		)}px`
	}

	// 删除输入框内容
	deleteInputContent() {
		if (this.read() !== '') {
			this.input.select()
			this.input.dispatchEvent(
				new InputEvent('beforeinput', {
					inputType: 'deleteContentForward',
					bubbles: true
				})
			)
			document.execCommand('delete')
		}
	}

	// 添加关闭按钮
	addCloseButton() {
		return TextBox.addCloseButton(this)
	}

	// 添加键盘按下过滤器
	addKeydownFilter() {
		return TextBox.addKeydownFilter(this)
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'focus':
				if (!this.focusEventEnabled) {
					this.focusEventEnabled = true
					this.input.on('focus', (event) => {
						this.dispatchEvent(new FocusEvent('focus'))
					})
				}
				break
			case 'blur':
				if (!this.blurEventEnabled) {
					this.blurEventEnabled = true
					this.input.on('blur', (event) => {
						this.dispatchEvent(new FocusEvent('blur'))
					})
				}
				break
		}
	}

	// 静态 - 添加关闭按钮
	static addCloseButton = (function IIFE() {
		// 重写写入方法
		const write = function (value) {
			TextBox.prototype.write.call(this, value)
			updateCloseButton(this)
		}
		// 更新关闭按钮
		const updateCloseButton = function (textBox) {
			return textBox.read() !== ''
				? textBox.closeButton.show()
				: textBox.closeButton.hide()
		}
		// 键盘按下事件
		const keydown = function (event) {
			switch (event.code) {
				case 'Escape':
					if (this.read() !== '') {
						event.stopPropagation()
						this.deleteInputContent()
					}
					break
			}
		}
		// 输入事件
		const input = function (event) {
			updateCloseButton(this)
		}
		// 关闭按钮 - 鼠标按下事件
		const closeButtonPointerdown = function (event) {
			// 阻止默认的失去焦点行为并停止传递事件
			event.preventDefault()
			event.stopPropagation()
		}
		// 关闭按钮 - 鼠标点击事件
		const closeButtonClick = function (event) {
			this.parentNode.deleteInputContent()
		}
		return (textBox) => {
			textBox.write = write
			textBox.on('keydown', keydown)
			textBox.on('input', input)
			textBox.closeButton = document.createElement('box')
			textBox.closeButton.addClass('close-button')
			textBox.closeButton.textContent = '\u2716'
			textBox.closeButton.on('pointerdown', closeButtonPointerdown)
			textBox.closeButton.on('click', closeButtonClick)
			textBox.appendChild(textBox.closeButton.hide())
		}
	})()

	// 静态 - 添加键盘按下过滤器
	static addKeydownFilter = (function IIFE() {
		const keydown = function (event) {
			if (event.altKey) {
				return
			} else if (!event.cmdOrCtrlKey && !event.shiftKey) {
				switch (event.code) {
					case 'Escape':
					case 'F1':
					case 'F3':
					case 'F4':
					case 'F9':
						return
				}
			}
			event.stopImmediatePropagation()
		}
		return (textBox) => {
			textBox.on('keydown', keydown)
		}
	})()

	// 静态 - 输入框键盘按下事件
	// Mac版不存在默认的复制/粘贴/剪切操作
	static macInputKeydown(event) {
		if (event.metaKey) {
			switch (event.code) {
				case 'KeyC':
					document.execCommand('copy')
					break
				case 'KeyV':
					document.execCommand('paste')
					break
				case 'KeyX':
					document.execCommand('cut')
					break
			}
		}
	}
}

customElements.define('text-box', TextBox)

// ******************************** 文本区域 ********************************

class TextArea extends HTMLElement {
	input //:element
	focusEventEnabled //:boolean
	blurEventEnabled //:boolean

	constructor() {
		super()

		// 创建输入框
		const input = document.createElement('textarea')
		input.history = new TextHistory(input)
		input.on('keydown', this.inputKeydown)
		input.on('input', this.inputInput)
		input.listenDraggingScrollbarEvent()
		this.appendChild(input)

		// 设置属性
		this.input = input
		this.focusEventEnabled = false
		this.blurEventEnabled = false

		// 添加事件侦听器 - Mac
		if (process.platform === 'darwin') {
			input.on('keydown', TextBox.macInputKeydown)
		}
	}

	// 读取数据
	read() {
		return this.input.value
	}

	// 写入数据
	write(value) {
		this.input.value = value
		this.input.history.reset()
	}

	// 插入数据
	insert(value) {
		this.input.dispatchEvent(
			new InputEvent('beforeinput', {
				inputType: 'insertFromPaste',
				data: value,
				bubbles: true
			})
		)
		document.execCommand('insertText', false, value)
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 获得焦点
	getFocus(mode) {
		return this.input.getFocus(mode)
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey) {
					event.stopPropagation()
				}
				break
		}
		// 文本区域有内边距时滚动条行为有缺陷
		// 在输入时临时改变内边距
		// 让滚动条滑动到正确的位置
		if (!TextArea.target) {
			TextArea.target = this
			TextArea.timer.add()
			this.addClass('inputting')
		}
	}

	// 输入框 - 输入事件
	inputInput(event) {
		if (!TextArea.target) {
			TextArea.target = this
			TextArea.timer.add()
			this.addClass('inputting')
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'focus':
				if (!this.focusEventEnabled) {
					this.focusEventEnabled = true
					this.input.on('focus', (event) => {
						this.dispatchEvent(new FocusEvent('focus'))
					})
				}
				break
			case 'blur':
				if (!this.blurEventEnabled) {
					this.blurEventEnabled = true
					this.input.on('blur', (event) => {
						this.dispatchEvent(new FocusEvent('blur'))
					})
				}
				break
		}
	}

	// 静态 - 文本区域目标元素
	static target = null

	// 静态 - 文本区域计时器
	static timer = new Timer({
		duration: 0,
		callback: (timer) => {
			TextArea.target.removeClass('inputting')
			TextArea.target = null
		}
	})
}

customElements.define('text-area', TextArea)

// ******************************** 键盘按键框 ********************************

class KeyboardBox extends HTMLElement {
	input //:element
	dataValue //:number
	inputEventEnabled //:boolean
	focusEventEnabled //:boolean
	blurEventEnabled //:boolean

	constructor() {
		super()

		// 创建输入框
		const input = document.createElement('input')
		input.addClass('keyboard-box-input')
		input.type = 'text'
		input.on('keydown', this.inputKeydown)
		this.appendChild(input)

		// 设置属性
		this.input = input
		this.dataValue = 0
		this.inputEventEnabled = false
		this.focusEventEnabled = false
		this.blurEventEnabled = false
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(code) {
		this.dataValue = code
		this.input.value = code
	}

	// 输入键值
	inputCode(code) {
		if (this.dataValue !== code) {
			this.write(code)
			if (this.inputEventEnabled) {
				const input = new InputEvent('input')
				input.value = this.dataValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 获得焦点
	getFocus(mode) {
		return this.input.getFocus(mode)
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'input':
				this.inputEventEnabled = true
				break
			case 'focus':
				if (!this.focusEventEnabled) {
					this.focusEventEnabled = true
					this.input.on('focus', (event) => {
						this.dispatchEvent(new FocusEvent('focus'))
					})
				}
				break
			case 'blur':
				if (!this.blurEventEnabled) {
					this.blurEventEnabled = true
					this.input.on('blur', (event) => {
						this.dispatchEvent(new FocusEvent('blur'))
					})
				}
				break
		}
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		event.stopPropagation()
		event.preventDefault()
		switch (event.code) {
			case 'Backspace':
				this.parentNode.inputCode('')
				break
			case 'Enter':
			case 'NumpadEnter':
				event.stopImmediatePropagation()
			default:
				this.parentNode.inputCode(event.code)
				break
		}
	}
}

customElements.define('keyboard-box', KeyboardBox)

// ******************************** 手柄按键框 ********************************

class GamepadBox extends HTMLElement {
	// 属性声明
	input //:element
	dataValue //:array

	// 构造函数
	constructor() {
		super()

		// 创建输入框
		const input = document.createElement('input')
		input.addClass('gamepad-box-input')
		input.type = 'text'
		input.on('keydown', this.inputKeydown)
		input.on('focus', this.inputFocus)
		input.on('blur', this.inputBlur)
		this.appendChild(input)

		// 设置属性
		this.input = input
		this.dataValue = null
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(button) {
		this.dataValue = button
		this.input.value = GamepadBox.getButtonName(button)
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 获得焦点
	getFocus(mode) {
		return this.input.getFocus(mode)
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		switch (event.code) {
			case 'Tab':
				break
			case 'Backspace':
				event.preventDefault()
				this.parentNode.write(-1)
				this.parentNode.dispatchChangeEvent()
				break
			default:
				event.preventDefault()
				break
		}
	}

	// 输入框 - 获得焦点事件
	inputFocus(event) {
		let lastPad = null

		// 输入键值
		const inputKeyCode = () => {
			const pads = navigator.getGamepads()
			const pad = pads[0] || pads[1] || pads[2] || pads[3] || null
			if (pad !== null) {
				if (lastPad === null) {
					lastPad = Object.clone(pad)
					for (const button of lastPad.buttons) {
						button.pressed = false
						button.value = 0
					}
				}
				if (lastPad.id === pad.id) {
					const lastButtons = lastPad.buttons
					const buttons = pad.buttons
					const length = buttons.length
					for (let code = 0; code < length; code++) {
						if (
							buttons[code].pressed &&
							!lastButtons[code].pressed
						) {
							this.parentNode.write(code)
							this.parentNode.dispatchChangeEvent()
							break
						}
					}
				}
				lastPad = Object.clone(pad)
			}
		}

		GamepadBox.intervalIndex = setInterval(inputKeyCode)
	}

	// 输入框 - 失去焦点事件
	inputBlur(event) {
		clearInterval(GamepadBox.intervalIndex)
		GamepadBox.intervalIndex = null
	}

	// 获取按键名称
	static getButtonName = (function IIFE() {
		// 键值 -> 键名
		const codeToName = {
			0: 'A',
			1: 'B',
			2: 'X',
			3: 'Y',
			4: 'LB',
			5: 'RB',
			6: 'LT',
			7: 'RT',
			8: 'View',
			9: 'Menu',
			10: 'LS',
			11: 'RS',
			12: 'Up',
			13: 'Down',
			14: 'Left',
			15: 'Right'
		}

		// 返回函数
		return function (code) {
			return code === -1 ? '' : (codeToName[code] ?? `Button_${code}`)
		}
	})()
}

customElements.define('gamepad-box', GamepadBox)

// ******************************** 颜色框 ********************************

class ColorBox extends HTMLElement {
	dataValue //:string
	foreground //:element
	inputEventEnabled //:boolean

	constructor() {
		super()

		// 创建背景区域
		const background = document.createElement('box')
		background.addClass('color-box-background')
		this.appendChild(background)

		// 创建前景区域
		const foreground = document.createElement('box')
		foreground.addClass('color-box-foreground')
		this.appendChild(foreground)

		// 设置属性
		this.tabIndex = 0
		this.dataValue = ''
		this.foreground = foreground
		this.inputEventEnabled = false

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('click', this.mouseclick)
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(color) {
		this.dataValue = color

		// 更新样式
		const r = parseInt(color.slice(0, 2), 16)
		const g = parseInt(color.slice(2, 4), 16)
		const b = parseInt(color.slice(4, 6), 16)
		const a = parseInt(color.slice(6, 8), 16) / 255
		this.foreground.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`
	}

	// 输入数据
	input(color) {
		if (this.dataValue !== color) {
			this.write(color)
			if (this.inputEventEnabled) {
				const input = new Event('input')
				input.value = this.dataValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey) {
					event.stopPropagation()
					this.mouseclick(event)
				}
				break
		}
	}

	// 鼠标点击事件
	mouseclick(event) {
		Color.open(this)
	}
}

customElements.define('color-box', ColorBox)

// ******************************** 复选框 ********************************

class CheckBox extends HTMLElement {
	dataValue //:boolean
	relations //:array
	writeEventEnabled //:boolean
	inputEventEnabled //:boolean

	constructor(standard) {
		super()

		// 设置属性
		this.dataValue = false
		this.relations = []
		this.writeEventEnabled = false
		this.inputEventEnabled = false

		// 侦听事件
		this.on('keydown', this.keydown)

		// 差异化处理
		switch (standard ?? this.hasClass('standard')) {
			case true: {
				// 标准复选框
				const mark = document.createElement('check-mark')
				this.tabIndex = 0
				this.insertBefore(mark, this.childNodes[0])
				this.on('click', this.mouseclick)
				break
			}
			case false: // 自定义复选框
				this.on('pointerdown', this.pointerdown)
				break
		}
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(value) {
		this.dataValue = !!value
		this.dataValue
			? this.addClass('selected')
			: this.removeClass('selected')
		if (!this.hasClass('disabled')) {
			this.toggleRelatedElements()
		}
		if (this.writeEventEnabled) {
			const write = new Event('write')
			write.value = this.dataValue
			this.dispatchEvent(write)
		}
	}

	// 输入数据
	input(value) {
		if (this.dataValue !== value) {
			this.write(value)
			if (this.inputEventEnabled) {
				const input = new Event('input', {
					bubbles: true
				})
				input.value = this.dataValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.toggleRelatedElements()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.toggleRelatedElements()
		}
	}

	// 添加相关元素
	relate(elements) {
		this.relations = elements
	}

	// 启用或禁用相关元素
	toggleRelatedElements() {
		if (!this.hasClass('disabled') && this.dataValue) {
			for (const element of this.relations) {
				element.enable()
			}
		} else {
			for (const element of this.relations) {
				element.disable()
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey && !this.hasClass('disabled')) {
					event.stopPropagation()
					this.mouseclick(event)
				}
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (document.activeElement !== document.body) {
					document.activeElement.blur()
				}
				this.input(!this.read())
				break
		}
	}

	// 鼠标点击事件
	mouseclick(event) {
		this.input(!this.read())
	}
}

customElements.define('check-box', CheckBox)

// ******************************** 单选框代理 ********************************

class RadioProxy extends HTMLElement {
	dataValue //:any
	relations //:array
	cancelable //:boolean
	writeEventEnabled //:boolean
	inputEventEnabled //:boolean

	constructor() {
		super()

		// 设置属性
		this.dataValue = null
		this.relations = []
		this.cancelable = false
		this.writeEventEnabled = false
		this.inputEventEnabled = false
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(value) {
		const elements = document.getElementsByName(this.id)
		for (const element of elements) {
			if (element.dataValue === value) {
				element.addClass('selected')
				this.dataValue = value
			} else {
				element.removeClass('selected')
			}
		}
		if (!this.hasClass('disabled')) {
			this.toggleRelatedElements()
		}
		if (this.writeEventEnabled) {
			const write = new Event('write')
			write.value = this.dataValue
			this.dispatchEvent(write)
		}
	}

	// 输入数据
	input(value) {
		const lastValue = this.dataValue
		if (lastValue !== value) {
			this.write(value)
			if (this.inputEventEnabled) {
				const input = new Event('input')
				input.value = this.dataValue
				input.lastValue = lastValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		}
	}

	// 重置数据
	reset() {
		if (this.dataValue !== null) {
			const elements = document.getElementsByName(this.id)
			for (const element of elements) {
				if (element.dataValue === this.dataValue) {
					element.removeClass('selected')
					break
				}
			}
			this.dataValue = null
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			const elements = document.getElementsByName(this.id)
			for (const element of elements) {
				element.removeClass('disabled')
			}
			this.toggleRelatedElements()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			const elements = document.getElementsByName(this.id)
			for (const element of elements) {
				element.addClass('disabled')
			}
			this.toggleRelatedElements()
		}
	}

	// 添加相关元素
	relate(entries) {
		this.relations = entries
	}

	// 启用或禁用相关元素
	toggleRelatedElements() {
		if (this.relations.length !== 0) {
			if (!this.hasClass('disabled')) {
				const entries = this.relations
				const selection = entries.find(
					(entry) => entry.case === this.dataValue
				)
				for (const entry of entries) {
					if (entry.case === this.dataValue) {
						for (const element of entry.targets) {
							element.enable()
						}
					} else {
						for (const element of selection
							? Array.subtract(entry.targets, selection.targets)
							: entry.targets) {
							element.disable()
						}
					}
				}
			} else {
				const entries = this.relations
				for (const entry of entries) {
					for (const element of entry.targets) {
						element.disable()
					}
				}
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 静态 - 代理映射表
	static map = {}
}

customElements.define('radio-proxy', RadioProxy)

// ******************************** 单选框 ********************************

class RadioBox extends HTMLElement {
	proxy //:element
	dataValue //:any

	constructor() {
		super()

		// 获取集合节点
		let proxy = RadioProxy.map[this.name]
		if (proxy === undefined) {
			proxy = document.createElement('radio-proxy')
			proxy.id = this.name
			proxy.style.display = 'none'
			this.appendChild(proxy)
			RadioProxy.map[proxy.id] = proxy
		}

		const string = this.getAttribute('value')
		const isNumber = RegExp.number.test(string)
		const value = isNumber
			? parseFloat(string)
			: string === 'false'
				? false
				: string === 'true'
					? true
					: string

		// 设置属性
		this.proxy = proxy
		this.dataValue = value

		// 侦听事件
		this.on('keydown', this.keydown)

		// 差异化处理
		switch (this.hasClass('standard')) {
			case true: {
				// 标准单选框
				const mark = document.createElement('radio-mark')
				this.tabIndex = 0
				this.insertBefore(mark, this.childNodes[0])
				this.on('click', this.mouseclick)
				break
			}
			case false: // 自定义单选框
				this.on('pointerdown', this.pointerdown)
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey && !this.hasClass('disabled')) {
					event.stopPropagation()
					this.mouseclick(event)
				}
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('selected')) {
					if (document.activeElement !== document.body) {
						document.activeElement.blur()
					}
					this.proxy.input(this.dataValue)
				} else if (this.proxy.cancelable) {
					if (document.activeElement !== document.body) {
						document.activeElement.blur()
					}
					this.proxy.reset()
				}
				break
		}
	}

	// 鼠标点击事件
	mouseclick(event) {
		if (!this.hasClass('selected')) {
			this.proxy.input(this.dataValue)
		} else if (this.proxy.cancelable) {
			this.proxy.reset()
		}
	}
}

customElements.define('radio-box', RadioBox)

// ******************************** 开关选项 ********************************

class SwitchItem extends HTMLElement {
	dataValue //:number
	class //:string
	length //:number
	inputEventEnabled //:boolean

	constructor() {
		super()

		const length = Math.clamp(parseInt(this.getAttribute('length')), 1, 4)

		// 设置属性
		this.dataValue = 0
		this.class = ''
		this.length = length
		this.inputEventEnabled = false

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(value) {
		this.dataValue = value
		this.update()
	}

	// 更新样式
	update() {
		this.removeClass(this.class)
		this.addClass((this.class = SwitchItem.classes[this.dataValue]))
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0: {
				this.write((this.dataValue + 1) % this.length)
				if (this.inputEventEnabled) {
					const input = new Event('input')
					input.value = this.dataValue
					this.dispatchEvent(input)
				}
				break
			}
		}
	}

	// 静态 - 类型列表
	static classes = ['zero', 'one', 'two', 'three']
}

customElements.define('switch-item', SwitchItem)

// ******************************** 滑动框 ********************************

class SliderBox extends HTMLElement {
	filler //:element
	input //:element
	synchronizer //:element
	activeWheel //:boolean
	focusEventEnabled //:boolean
	blurEventEnabled //:boolean

	constructor() {
		super()

		const min = this.getAttribute('min') ?? '0'
		const max = this.getAttribute('max') ?? '0'
		const step = this.getAttribute('step') ?? '1'

		// 创建进度条
		const bar = document.createElement('slider-bar')
		this.appendChild(bar)

		// 创建填充物
		const filler = document.createElement('slider-filler')
		bar.appendChild(filler)

		// 创建输入框
		const input = document.createElement('input')
		input.addClass('slider-input')
		input.type = 'range'
		input.min = min
		input.max = max
		input.step = step
		input.tabIndex = -1
		input.on('wheel', this.inputWheel)
		this.appendChild(input)

		// 设置属性
		this.filler = filler
		this.input = input
		this.synchronizer = null
		this.activeWheel = this.hasAttribute('active-wheel')
		this.focusEventEnabled = false
		this.blurEventEnabled = false

		// 侦听事件
		this.on('input', this.sliderInput)
	}

	// 读取数据
	read() {
		return parseFloat(this.input.value)
	}

	// 写入数据
	write(value) {
		this.input.value = value
		this.updateFiller()
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 更新装填物
	updateFiller() {
		const filler = this.filler
		const value = this.read()
		if (filler.value !== value) {
			filler.value = value
			const input = this.input
			const min = parseFloat(input.min)
			const max = parseFloat(input.max)
			if (min !== max) {
				const p = Math.roundTo(((value - min) * 100) / (max - min), 6)
				filler.style.width = `${p}%`
			}
		}
	}

	// 与数字框元素同步数值
	synchronize(target) {
		const slider = this
		const number = target
		if (slider.synchronizer) {
			return
		}

		// 设置新的同步关系
		if (number instanceof NumberBox) {
			const writeSlider = slider.write
			const writeNumber = number.write

			// 滑动框 - 指针按下事件
			// 在输入事件之前获得焦点
			// 触发focus事件时可获取到旧的值
			const sliderPointerdown = () => {
				slider.input.focus()
			}

			// 滑动框 - 输入事件
			const sliderInput = (event) => {
				writeNumber.call(number, slider.read())
				event && number.dispatchEvent(new Event('input'))
			}

			// 数字框 - 输入事件
			const numberInput = (event) => {
				writeSlider.call(slider, number.read())
				event && slider.dispatchEvent(new Event('input'))
			}

			// 设置同步对象
			slider.synchronizer = target

			// 侦听事件
			slider.input.on('pointerdown', sliderPointerdown)
			slider.input.on('input', sliderInput)
			number.input.on('input', numberInput)

			// 重写滑动框写入方法
			slider.write = (value) => {
				writeSlider.call(slider, value)
				sliderInput()
			}

			// 重写数字框写入方法
			number.write = (value) => {
				writeNumber.call(number, value)
				numberInput()
			}
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'focus':
				if (!this.focusEventEnabled) {
					this.focusEventEnabled = true
					this.input.on('focus', (event) => {
						this.dispatchEvent(new FocusEvent('focus'))
					})
				}
				break
			case 'blur':
				if (!this.blurEventEnabled) {
					this.blurEventEnabled = true
					this.input.on('blur', (event) => {
						this.dispatchEvent(new FocusEvent('blur'))
					})
				}
				break
		}
	}

	// 滑动框 - 输入事件
	sliderInput(event) {
		this.updateFiller()
	}

	// 输入框 - 鼠标滚轮事件
	inputWheel(event) {
		if (event.deltaY === 0) return
		if (this.parentNode.activeWheel) {
			// 阻止滚动页面的默认行为
			event.preventDefault()
			const input = this
			const last = input.value
			input.value = Math.roundTo(
				parseFloat(input.value) +
					parseFloat(input.step) * (event.deltaY > 0 ? -1 : 1),
				2
			)
			if (input.value !== last) {
				input.dispatchEvent(
					new Event('input', {
						bubbles: true
					})
				)
			}
		}
	}
}

customElements.define('slider-box', SliderBox)

// ******************************** 数字框 ********************************

class NumberBox extends HTMLElement {
	input //:element
	decimals //:number
	focusEventEnabled //:boolean
	blurEventEnabled //:boolean

	constructor(dom) {
		super()

		// 获取参数
		dom = dom ?? this
		const min = dom.getAttribute('min') ?? '0'
		const max = dom.getAttribute('max') ?? '0'
		const step = dom.getAttribute('step') ?? '1'
		const unit = dom.getAttribute('unit')
		const decimals = parseInt(dom.getAttribute('decimals')) || 0

		// 创建输入框
		// 设置title为空可避免数值不匹配step时弹出提示
		const input = document.createElement('input')
		input.addClass('number-box-input')
		input.type = 'number'
		input.min = min
		input.max = max
		input.step = step
		input.title = ''
		input.history = new NumberHistory(input)
		input.on('keydown', this.inputKeydown)
		input.on('change', this.inputChange)
		this.appendChild(input)

		// 检查标签元素
		if (this.childNodes.length > 1) {
			const label = this.childNodes[0].textContent
			const font = 'var(--font-family-mono)'
			const padding = measureText(label, font).width + 8
			input.style.paddingLeft = `${padding}px`
		}

		// 创建单位文本
		if (unit !== null) {
			const unitText = document.createElement('text')
			const font = 'var(--font-family-mono)'
			const padding = measureText(unit, font).width + 8
			unitText.addClass('unit')
			unitText.textContent = unit
			this.insertBefore(unitText, input)
			input.style.paddingRight = `${padding}px`
		}

		// 设置属性
		this.input = input
		this.decimals = decimals
		this.focusEventEnabled = false
		this.blurEventEnabled = false
	}

	// 读取数据
	read() {
		const min = parseFloat(this.input.min)
		const max = parseFloat(this.input.max)
		let value = parseFloat(this.input.value) || 0
		value = Math.clamp(value, min, max)
		value = Math.roundTo(value, this.decimals)
		return value
	}

	// 写入数据
	write(value) {
		const { input } = this
		input.value = value
		input.value = this.read()
		input.history.reset()
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.hideChildNodes()
		}
	}

	// 获得焦点
	getFocus(mode) {
		return this.input.getFocus(mode)
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'focus':
				if (!this.focusEventEnabled) {
					this.focusEventEnabled = true
					this.input.on('focus', (event) => {
						this.dispatchEvent(new FocusEvent('focus'))
					})
				}
				break
			case 'blur':
				if (!this.blurEventEnabled) {
					this.blurEventEnabled = true
					this.input.on('blur', (event) => {
						this.dispatchEvent(new FocusEvent('blur'))
					})
				}
				break
		}
	}

	// 输入框 - 键盘按下事件
	inputKeydown(event) {
		!NumberBox.whiteList.includes(event.code) &&
			!event.cmdOrCtrlKey &&
			event.preventDefault()
	}

	// 输入框 - 内容改变事件
	inputChange(event) {
		// 如果小数位数达到8位使用上下键调整
		// 可能精度不足等效于先取近似值再操作
		this.value = this.parentNode.read()
	}

	// 静态 - 按键白名单
	static whiteList = [
		'Digit0',
		'Digit1',
		'Digit2',
		'Digit3',
		'Digit4',
		'Digit5',
		'Digit6',
		'Digit7',
		'Digit8',
		'Digit9',
		'Minus',
		'Period',
		'Numpad0',
		'Numpad1',
		'Numpad2',
		'Numpad3',
		'Numpad4',
		'Numpad5',
		'Numpad6',
		'Numpad7',
		'Numpad8',
		'Numpad9',
		'NumpadSubtract',
		'NumpadDecimal',
		'Backspace',
		'Delete',
		'Tab',
		'Enter',
		'ArrowLeft',
		'ArrowUp',
		'ArrowRight',
		'ArrowDown',
		'Home',
		'End',
		'NumpadEnter'
	]
}

customElements.define('number-box', NumberBox)

// ******************************** 选择框 ********************************

class SelectBox extends HTMLElement {
	info //:element
	dataItems //:array
	dataValue //:any
	relations //:array
	invalid //:boolean
	hideUnrelated //:boolean
	writeEventEnabled //:boolean
	inputEventEnabled //:boolean

	constructor() {
		super()

		// 创建文本
		const text = document.createElement('text')
		text.addClass('select-box-text')
		this.appendChild(text)

		// 设置属性
		this.tabIndex = 0
		this.info = text
		this.dataItems = []
		this.dataValue = null
		this.relations = []
		this.invalid = false
		this.hideUnrelated = false
		this.writeEventEnabled = false
		this.inputEventEnabled = false

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(value) {
		this.dataValue = value
		this.update()
		if (!this.hasClass('disabled')) {
			this.toggleRelatedElements()
		}
		if (this.writeEventEnabled) {
			const write = new Event('write')
			write.value = this.dataValue
			this.dispatchEvent(write)
		}
	}

	// 写入数据(无效时写入默认值)
	write2(value) {
		for (const item of this.dataItems) {
			if (item.value === value) {
				this.write(value)
				return
			}
		}
		this.writeDefault()
	}

	// 写入默认值
	writeDefault() {
		this.write(this.dataItems[0].value)
	}

	// 输入数据
	input(value) {
		const last = this.dataValue
		if (last !== value) {
			this.write(value)
			if (this.inputEventEnabled) {
				const input = new Event('input', { bubbles: true })
				input.last = last
				input.value = this.dataValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		}
	}

	// 更新信息
	update() {
		const info = this.info
		const value = this.dataValue
		const items = this.dataItems
		const length = items.length
		let name
		for (let i = 0; i < length; i++) {
			const item = items[i]
			if (item.value === value) {
				name = item.name
				break
			}
		}
		if (name !== undefined) {
			this.invalid = false
			info.removeClass('invalid')
			info.textContent = name
		} else {
			this.invalid = true
			info.addClass('invalid')
			info.textContent = value
		}
	}

	// 重新选择
	reselect(offset) {
		const value = this.dataValue
		const items = this.dataItems
		const length = items.length
		for (let i = 0; i < length; i++) {
			if (items[i].value === value) {
				const index = i + offset
				if (index >= 0 && index < length) {
					this.input(items[index].value)
				}
				return
			}
		}
		const index = offset > 0 ? 0 : length - 1
		this.input(items[index].value)
	}

	// 保存值
	save() {
		this.savedValue = this.read()
	}

	// 恢复值
	restore() {
		if (this.savedValue !== undefined) {
			this.input(this.savedValue)
			delete this.savedValue
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.tabIndex += 1
			this.showChildNodes()
			this.toggleRelatedElements()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.tabIndex -= 1
			this.hideChildNodes()
			this.toggleRelatedElements()
		}
	}

	// 加载选项
	loadItems(items) {
		this.dataItems = items
	}

	// 设置选项名称
	setItemNames(options) {
		for (const item of this.dataItems) {
			const key = item.value
			const option = options[key]
			switch (typeof option) {
				case 'string':
					item.name = option
					continue
				case 'object':
					if ('name' in option) {
						item.name = option.name
					}
					if ('tip' in option) {
						item.tip = Local.parseTip(option.tip, option.name)
					}
					continue
			}
		}
		if (this.dataValue !== null) {
			this.update()
		}

		// 创建工具提示
		this.createTooltip()
	}

	// 重写方法 - 设置工具提示
	setTooltip(tip) {
		this.originalTip = tip
		super.setTooltip(tip)
	}

	// 创建工具提示
	createTooltip() {
		let tip = this.originalTip ?? ''
		let options = ''
		// 添加选项的工具提示
		for (const item of this.dataItems) {
			if (item.tip) {
				options += item.tip + '\n'
			}
		}
		// 如果不存在选择框工具提示但是存在选项工具提示，添加标签名称
		if (tip === '' && options !== '') {
			const prev = this.previousElementSibling
			if (prev?.tagName === 'TEXT') {
				tip += `<b>${prev.textContent}</b>`
			}
		}
		// 添加换行符
		if (tip !== '' && options !== '') {
			tip += '<tooltip-line></tooltip-line>'
		}
		// 合并工具提示
		tip += options
		if (tip !== '') {
			super.setTooltip(tip.trim())
		}
	}

	// 清除选项
	clear() {
		this.dataItems = null
		this.dataValue = null
		this.info.textContent = ''
		return this
	}

	// 启用隐藏模式
	enableHiddenMode() {
		this.hideUnrelated = true
		return this
	}

	// 添加相关元素
	relate(entries) {
		this.relations = entries
	}

	// 启用或禁用相关元素
	toggleRelatedElements() {
		if (this.relations.length !== 0) {
			if (!this.hasClass('disabled')) {
				const entries = this.relations
				const value = this.dataValue
				const selection = entries.find((entry) =>
					entry.case instanceof Array
						? entry.case.includes(value)
						: entry.case === value
				)
				const deferredList = []
				for (const entry of entries) {
					if (
						entry.case instanceof Array
							? entry.case.includes(value)
							: entry.case === value
					) {
						deferredList.push(entry)
					} else {
						for (const element of selection
							? Array.subtract(entry.targets, selection.targets)
							: entry.targets) {
							this.disableElement(element)
						}
					}
				}
				// 延后启用元素避免可能被禁用的情况
				for (const entry of deferredList) {
					for (const element of entry.targets) {
						this.enableElement(element)
					}
				}
			} else {
				const entries = this.relations
				for (const entry of entries) {
					for (const element of entry.targets) {
						this.disableElement(element)
					}
				}
			}
		}
	}

	// 启用元素
	enableElement(element) {
		element.enable()
		if (this.hideUnrelated) {
			let node = element.previousSibling
			while (node instanceof Text) {
				node = node.previousSibling
			}
			if (node.tagName === 'TEXT') {
				node.show()
			}
			element.show()
		}
	}

	// 禁用元素
	disableElement(element) {
		element.disable()
		if (this.hideUnrelated) {
			let node = element.previousSibling
			while (node instanceof Text) {
				node = node.previousSibling
			}
			if (node.tagName === 'TEXT') {
				node.hide()
			}
			element.hide()
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey) {
					event.stopPropagation()
					Select.open(this)
				}
				break
			case 'ArrowUp':
				event.preventDefault()
				event.stopPropagation()
				this.reselect(-1)
				break
			case 'ArrowDown':
				event.preventDefault()
				event.stopPropagation()
				this.reselect(1)
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				Select.open(this)
				break
		}
	}
}

customElements.define('select-box', SelectBox)

// ******************************** 选择列表 ********************************

class SelectList extends HTMLElement {
	state //:string
	target //:element
	elements //:array
	selection //:element
	windowKeydown //:function
	windowPointerdown //:function
	windowResize //:function
	windowBlur //:function

	constructor() {
		super()

		// 设置属性
		this.state = 'closed'
		this.target = null
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.selection = null
		this.windowKeydown = SelectList.windowKeydown.bind(this)
		this.windowPointerdown = SelectList.windowPointerdown.bind(this)
		this.windowResize = SelectList.windowResize.bind(this)
		this.windowBlur = SelectList.windowBlur.bind(this)
		this.listenDraggingScrollbarEvent()

		// 侦听事件
		this.on('scroll', this.resize)
	}

	// 读取数据
	read() {
		return this.selection?.dataValue
	}

	// 写入数据
	write(value) {
		const elements = this.elements
		const count = elements.count
		if (count !== 0) {
			let target = elements[0]
			for (let i = 0; i < count; i++) {
				if (elements[i].dataValue === value) {
					target = elements[i]
					break
				}
			}
			this.select(target)
		}
	}

	// 选择项目
	select(element) {
		if (element instanceof HTMLElement && this.selection !== element) {
			this.unselect()
			this.selection = element
			element.addClass('selected')
		}
	}

	// 取消选择
	unselect() {
		if (this.selection) {
			this.selection.removeClass('selected')
			this.selection = null
		}
	}

	// 重新选择
	reselect(offset) {
		const elements = this.elements
		const selection = this.selection
		const index = elements.indexOf(selection) + offset
		if (index >= 0 && index < elements.count) {
			this.select(elements[index])
		}
	}

	// 打开下拉列表
	open(target) {
		this.close()
		this.state = 'open'

		// 设置目标元素
		this.target = target

		// 创建选项
		this.createItems(target.dataItems)

		// 设置位置
		this.windowResize()

		// 添加列表到文档树
		document.body.appendChild(this)

		// 重新调整
		this.resize()

		// 写入数据
		this.write(target.dataValue)
		this.scrollToSelection()

		// 侦听事件
		this.on('pointermove', this.pointermove)
		window.on('keydown', this.windowKeydown, { capture: true })
		window.on('pointerdown', this.windowPointerdown, { capture: true })
		window.on('resize', this.windowResize)
		window.on('blur', this.windowBlur)
	}

	// 关闭下拉列表
	close() {
		if (this.state === 'closed') {
			return
		}

		this.state = 'closed'
		this.target = null
		this.clear()
		document.body.removeChild(this)

		// 取消侦听事件
		this.off('pointermove', this.pointermove)
		window.off('keydown', this.windowKeydown, { capture: true })
		window.off('pointerdown', this.windowPointerdown, { capture: true })
		window.off('resize', this.windowResize)
		window.off('blur', this.windowBlur)
	}

	// 重新调整
	resize() {
		return CommonList.resize(this)
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize() {}

	// 创建选项
	createItems(items) {
		const { elements } = this
		elements.start = -1
		elements.count = 0

		for (const item of items) {
			const li = document.createElement('select-item')
			li.dataValue = item.value
			li.textContent = item.name
			if (item.tip) {
				li.setTooltip(item.tip)
			}
			elements[elements.count++] = li
		}

		// 清除多余的元素
		this.clearElements(elements.count)
	}

	// 向上翻页
	pageUp(select) {
		const scrollLines = Math.floor(this.clientHeight / 20) - 1
		if (select) {
			const bottom = this.scrollTop + this.clientHeight
			const bottomIndex = Math.floor(bottom / 20) - 1
			let index = this.getElementIndexOfSelection(Infinity)
			index = Math.min(index, bottomIndex) - scrollLines
			index = Math.max(index, 0)
			this.select(this.elements[index])
		}
		this.scrollBy(0, -scrollLines * 20)
	}

	// 向下翻页
	pageDown(select) {
		const scrollLines = Math.floor(this.clientHeight / 20) - 1
		if (select) {
			const count = this.elements.count
			const topIndex = Math.floor(this.scrollTop / 20)
			let index = this.getElementIndexOfSelection(0)
			index = Math.max(index, topIndex) + scrollLines
			index = Math.min(index, count - 1)
			this.select(this.elements[index])
		}
		this.scrollBy(0, +scrollLines * 20)
	}

	// 获取选中项的元素索引
	getElementIndexOfSelection(defIndex) {
		const selection = this.selection
		if (selection instanceof HTMLElement) {
			return this.elements.indexOf(selection)
		}
		return defIndex
	}

	// 滚动到选中项
	scrollToSelection() {
		if (this.hasScrollBar()) {
			const elements = this.elements
			const selection = this.selection
			const index = elements.indexOf(selection)
			if (index !== -1) {
				const scrollTop = Math.clamp(
					this.scrollTop,
					index * 20 + 20 - this.innerHeight,
					index * 20
				)
				if (this.scrollTop !== scrollTop) {
					this.scrollTop = scrollTop
				}
			}
		}
	}

	// 清除元素
	clearElements(start) {
		return CommonList.clearElements(this, start)
	}

	// 清除列表
	clear() {
		this.unselect()
		this.textContent = ''
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 指针移动事件
	pointermove(event) {
		const element = event.target.seek('select-item')
		if (
			element.tagName === 'SELECT-ITEM' &&
			!element.hasClass('selected')
		) {
			this.write(element.dataValue)
		}
	}

	// 窗口 - 键盘按下事件
	static windowKeydown(event) {
		event.preventDefault()
		event.stopPropagation()
		switch (event.code) {
			case 'Escape':
				this.close()
				break
			case 'Enter':
			case 'NumpadEnter': {
				const value = this.read()
				if (value !== undefined) {
					this.target.input(value)
				}
				this.close()
				break
			}
			case 'ArrowUp':
				this.reselect(-1)
				this.scrollToSelection()
				break
			case 'ArrowDown':
				this.reselect(1)
				this.scrollToSelection()
				break
			case 'Home': {
				const elements = this.elements
				this.scroll(0, 0)
				this.select(elements[0])
				break
			}
			case 'End': {
				const elements = this.elements
				const last = elements.count - 1
				this.scroll(0, this.scrollHeight)
				this.select(elements[last])
				break
			}
			case 'PageUp':
				this.pageUp(true)
				break
			case 'PageDown':
				this.pageDown(true)
				break
		}
	}

	// 窗口 - 指针按下事件
	static windowPointerdown(event) {
		switch (event.button) {
			case 0: {
				const target = this.target
				let element = event.target
				if (element instanceof SelectList) {
					event.preventDefault()
					return
				}
				if (element.seek('select-box') === target) {
					event.stopImmediatePropagation()
					return this.close()
				}
				element = element.seek('select-item')
				if (
					element.tagName === 'SELECT-ITEM' &&
					element.parentNode === this
				) {
					event.preventDefault()
					if (event.altKey) {
						return
					}
					target.input(element.dataValue)
				}
				return this.close()
			}
			case 2:
				return this.close()
		}
	}

	// 窗口 - 调整大小事件
	static windowResize(event) {
		const MAX_LINES = 30
		const rect = this.target.rect()
		const rl = rect.left
		const rt = rect.top
		const rb = rect.bottom
		const rw = rect.width
		const count = this.elements.count
		const space = window.innerHeight - rb
		const below = space >= Math.min(count, 10) * 20
		const capacity = below ? Math.floor(space / 20) : Math.floor(rt / 20)
		const lines = Math.min(count, capacity, MAX_LINES)
		const top = below ? rb : rt - lines * 20
		this.style.left = `${rl}px`
		this.style.top = `${top}px`
		this.style.width = `calc(${rw}px - var(--2dpx))`
		this.style.height = `${lines * 20}px`
		this.style.zIndex = Window.frames.length + 1
	}

	// 窗口 - 失去焦点事件
	static windowBlur(event) {
		this.close()
	}
}

customElements.define('select-list', SelectList)

// 创建选择列表实例
const Select = new SelectList()

// ******************************** 菜单列表 ********************************

class MenuList extends HTMLElement {
	state //:string
	callback //:function
	dataItems //:array
	selection //:element
	popupTimer //:object
	closeTimer //:object
	parent //:element
	submenu //:element
	buttonPressed //:boolean
	minWidth //:number
	parentMenuItem //:element
	windowBlur //:function
	windowKeydown //:function
	windowPointerdown //:function
	windowPointerup //:function
	windowPointerover //:function
	windowPointerout //:function

	constructor() {
		super()

		// 设置属性
		this.state = 'closed'
		this.callback = null
		this.dataItems = null
		this.selection = null
		this.popupTimer = null
		this.closeTimer = null
		this.parent = null
		this.submenu = null
		this.buttonPressed = false
		this.minWidth = 0
		this.windowBlur = MenuList.windowBlur.bind(this)
		this.windowKeydown = MenuList.windowKeydown.bind(this)
		this.windowPointerdown = MenuList.windowPointerdown.bind(this)
		this.windowPointerup = MenuList.windowPointerup.bind(this)
		this.windowPointerover = MenuList.windowPointerover.bind(this)
		this.windowPointerout = MenuList.windowPointerout.bind(this)
	}

	// 弹出菜单
	popup(options, items) {
		this.close()
		this.state = 'open'
		this.dataItems = items
		this.callback = options.close ?? null
		this.parent = options.parent ?? null
		this.minWidth = options.minWidth ?? 180
		for (let i = 0; i < items.length; i++) {
			this.appendChild(this.createItem(items[i]))
		}

		document.body.appendChild(this)
		this.computeMenuWidth()
		const { width, height } = this.rect()
		const dpx = 1 / window.devicePixelRatio
		const right = window.innerWidth - width - dpx
		const bottom = window.innerHeight - height - dpx
		const x = options.x ?? 0
		const y = options.y ?? 0
		this.style.left = `${Math.min(x + dpx, right)}px`
		this.style.top = `${Math.min(y + dpx, bottom)}px`
		this.style.zIndex = Window.frames.length + 1

		// 侦听事件
		window.event?.stopPropagation()
		window.on('blur', this.windowBlur)
		window.on('pointerdown', this.windowPointerdown)
		window.on('pointerup', this.windowPointerup)
		window.on('pointerover', this.windowPointerover)
		window.on('pointerout', this.windowPointerout)
		window.on('keydown', this.windowKeydown, { capture: true })
		// window.on('keyup', this.windowKeyup, {capture: true})
		this.on('pointerenter', this.pointerenter)
	}

	// 计算菜单宽度
	computeMenuWidth() {
		let labelWidth = 0
		let acceleratorWidth = 0
		for (const li of this.childNodes) {
			const { label, accelerator } = li
			if (label !== undefined) {
				labelWidth = Math.max(labelWidth, label.offsetWidth)
			}
			if (accelerator !== undefined) {
				acceleratorWidth = Math.max(
					acceleratorWidth,
					accelerator.offsetWidth
				)
			}
		}
		let padding = 48
		if (labelWidth > 0 && acceleratorWidth > 0) {
			padding += 10
		}
		const width = labelWidth + acceleratorWidth + padding
		this.style.width = `${Math.max(width, this.minWidth)}px`
	}

	// 关闭菜单
	close() {
		if (this.state === 'open') {
			this.state = 'closed'
			this.unselect()
			this.callback?.()
			this.callback = null
			this.submenu?.close()
			this.dataItems = null
			this.parent = null
			this.buttonPressed = false
			document.body.removeChild(this.clear())

			// 取消侦听事件
			window.off('blur', this.windowBlur)
			window.off('pointerdown', this.windowPointerdown)
			window.off('pointerup', this.windowPointerup)
			window.off('pointerover', this.windowPointerover)
			window.off('pointerout', this.windowPointerout)
			window.off('keydown', this.windowKeydown, { capture: true })
			// window.off('keyup', this.windowKeyup, {capture: true})
			this.off('pointerenter', this.pointerenter)
		}
	}

	// 创建项目
	createItem(item) {
		switch (item.type) {
			case 'separator':
				return document.createElement('menu-separator')
			default: {
				// 创建列表项
				const li = document.createElement('menu-item')
				li.dataValue = item

				// 禁用列表项
				if (item.enabled === false) {
					li.addClass('disabled')
				}

				// 创建勾选标记
				if (item.checked === true) {
					const mark = document.createElement('menu-checked')
					mark.textContent = '✓'
					li.appendChild(mark)
				}

				// 添加图标元素
				if (item.icon !== undefined) {
					li.appendChild(item.icon)
				}

				// 创建标签元素
				if (item.label !== undefined) {
					const label = document.createElement('menu-label')
					label.textContent = item.label
					li.label = label
					li.appendChild(label)
				}

				// 创建快捷键元素
				if (item.accelerator !== undefined) {
					const accelerator =
						document.createElement('menu-accelerator')
					accelerator.textContent = item.accelerator
					li.accelerator = accelerator
					li.appendChild(accelerator)
				}

				// 设置样式
				if (item.style !== undefined) {
					li.addClass(item.style)
				}

				// 创建子菜单标记
				if (item.submenu !== undefined) {
					const accelerator = document.createElement('menu-sub-mark')
					accelerator.textContent = '>'
					li.appendChild(accelerator)
				}
				return li
			}
		}
	}

	// 选择选项
	select(element) {
		if (this.selection !== element) {
			this.unselect()
			this.selection = element
			this.selection.addClass('selected')
		}
	}

	// 取消选择
	unselect() {
		if (this.selection) {
			this.selection.removeClass('selected')
			this.selection = null
			if (this.popupTimer) {
				this.popupTimer.remove()
				this.popupTimer = null
			}
		}
	}

	// 重新选择
	reselect(offset) {
		const elements = []
		for (const element of this.childNodes) {
			if (
				element.tagName === 'MENU-ITEM' &&
				!element.hasClass('disabled')
			) {
				elements.push(element)
			}
		}
		const length = elements.length
		if (length === 0) {
			return
		}
		if (this.selection) {
			const last = elements.indexOf(this.selection)
			const index = (last + offset + length) % length
			this.select(elements[index])
		} else {
			switch (offset) {
				case 1:
					this.select(elements[0])
					break
				case -1:
					this.select(elements[length - 1])
					break
			}
		}
	}

	// 弹出子菜单
	popupSubmenu(delay) {
		const element = this.selection
		if (
			element instanceof HTMLElement &&
			element !== this.submenu?.parentMenuItem
		) {
			const node = element.dataValue
			if (node.submenu) {
				if (!this.popupTimer) {
					this.popupTimer = new Timer({
						duration: delay,
						callback: () => {
							this.popupTimer = null
							if (element === this.selection) {
								const rect = element.rect()
								let x = rect.right
								let y = rect.top - 5
								let width = rect.width + 2
								if (x + width > window.innerWidth) {
									x = rect.left - width
								}
								this.submenu?.close()
								this.submenu = new MenuList()
								this.submenu.parentMenuItem = element
								this.submenu.popup(
									{
										x: x,
										y: y,
										parent: this,
										close: () => {
											this.submenu = null
										}
									},
									node.submenu
								)
							}
						}
					}).add()
				}
				if (delay === 0) {
					this.popupTimer.finish()
				}
			}
		}
	}

	// 关闭子菜单
	closeSubmenu(delay) {
		const { submenu, selection } = this
		if (submenu?.parentMenuItem === selection) {
			if (!this.closeTimer) {
				this.closeTimer = new Timer({
					duration: delay,
					callback: () => {
						this.closeTimer = null
						if (
							submenu === this.submenu &&
							selection !== this.selection
						) {
							submenu.close()
						}
					}
				}).add()
			}
		}
	}

	// 指针进入事件
	pointerenter(event) {
		this.parent?.select(this.parentMenuItem)
	}

	// 窗口 - 失去焦点事件
	static windowBlur(event) {
		this.close()
	}

	// 窗口 - 键盘按下事件
	static windowKeydown(event) {
		if (!this.submenu) {
			event.preventDefault()
			event.stopPropagation()
			switch (event.code) {
				case 'Escape':
					this.close()
					break
				case 'Enter':
				case 'NumpadEnter':
					if (this.selection) {
						const node = this.selection.dataValue
						if (node.submenu) {
							this.popupSubmenu(0)
							this.submenu && this.submenu.reselect(1)
						} else {
							node.click && node.click()
							let menu = this
							while (menu.parent) {
								menu = menu.parent
							}
							menu.close()
						}
					}
					break
				case 'ArrowUp':
					this.reselect(-1)
					break
				case 'ArrowDown':
					this.reselect(1)
					break
				case 'ArrowLeft':
					if (this.parent) {
						this.close()
					}
					break
				case 'ArrowRight':
					this.popupSubmenu(0)
					this.submenu && this.submenu.reselect(1)
					break
			}
		}
	}

	// 窗口 - 键盘弹起事件
	// static windowKeyup(event) {
	//   event.preventDefault()
	//   event.stopPropagation()
	// }

	// 窗口 - 指针按下事件
	static windowPointerdown(event) {
		// 阻止 activeElement blur 行为
		const element = event.target.seek('menu-list')
		if (
			element instanceof MenuList ||
			((document.activeElement instanceof HTMLInputElement ||
				document.activeElement instanceof HTMLTextAreaElement) &&
				document.activeElement !== event.target &&
				!(
					event.target instanceof HTMLInputElement ||
					event.target instanceof HTMLTextAreaElement
				))
		) {
			event.preventDefault()
		}
		switch (event.button) {
			case 0:
				if (element.tagName !== 'MENU-LIST') {
					this.close()
				} else if (element === this) {
					this.buttonPressed = true
				}
				break
			case 2:
				if (element.tagName !== 'MENU-LIST') {
					this.close()
				}
				break
		}
	}

	// 窗口 - 指针弹起事件
	static windowPointerup(event) {
		switch (event.button) {
			case 0: {
				const element = event.target
				switch (element.tagName) {
					case 'MENU-ITEM':
						if (this.buttonPressed) {
							this.buttonPressed = false
							if (!element.hasClass('disabled')) {
								const node = element.dataValue
								if (node.submenu) {
									this.popupSubmenu(0)
								} else if (node.click) {
									let root = this
									while (root.parent) {
										root = root.parent
									}
									node.click()
									root.close()
								}
							}
						}
						break
					case 'MENU-LIST':
						break
					default:
						this.close()
						break
				}
				break
			}
		}
	}

	// 窗口 - 指针进入事件
	static windowPointerover(event) {
		const element = event.target
		if (
			element !== this.selection &&
			element.parentNode === this &&
			element.tagName === 'MENU-ITEM' &&
			!element.hasClass('disabled')
		) {
			// 取消关闭子菜单的计时器
			if (this.closeTimer && this.submenu?.parentMenuItem === element) {
				this.closeTimer.remove()
				this.closeTimer = null
			}
			// 因为逆序更新计时器
			// 弹出比关闭先执行
			this.closeSubmenu(400)
			this.select(element)
			this.popupSubmenu(400)
		}
	}

	// 窗口 - 指针离开事件
	static windowPointerout(event) {
		const element = event.target
		if (this.selection === element) {
			if (this.submenu !== null) {
				this.closeSubmenu(400)
			}
			this.unselect()
		}
	}
}

customElements.define('menu-list', MenuList)

// 创建菜单列表实例
const Menu = new MenuList()

// ******************************** 自定义框 ********************************

class CustomBox extends HTMLElement {
	info //:element
	dataValue //:any
	writeEventEnabled //:boolean
	inputEventEnabled //:boolean

	constructor() {
		super()

		// 创建文本
		const text = document.createElement('text')
		text.addClass('custom-box-text')
		this.appendChild(text)

		// 设置属性
		this.tabIndex = 0
		this.info = text
		this.dataValue = null
		this.writeEventEnabled = false
		this.inputEventEnabled = false

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('click', this.click)
		this.on('dragenter', this.dragenter)
		this.on('dragleave', this.dragleave)
		this.on('dragover', this.dragover)
		this.on('drop', this.drop)
	}

	// 获取类型属性
	get type() {
		return this.getAttribute('type')
	}

	set type(value) {
		this.setAttribute('type', value)
	}

	// 获取过滤属性
	get filter() {
		return this.getAttribute('filter')
	}

	set filter(value) {
		this.setAttribute('filter', value)
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(value) {
		this.dataValue = value
		this.update()
		if (this.writeEventEnabled) {
			const write = new Event('write')
			write.value = this.dataValue
			this.dispatchEvent(write)
		}
	}

	// 输入数据
	input(value) {
		if (this.dataValue !== value) {
			this.write(value)
			if (this.inputEventEnabled) {
				const input = new Event('input')
				input.value = this.dataValue
				this.dispatchEvent(input)
			}
			this.dispatchChangeEvent()
		} else {
			if (this.type === 'file') {
				this.update()
			}
		}
	}

	// 更新信息
	update() {
		this.info.removeClass('invalid')
		const value = this.dataValue
		switch (this.type) {
			case 'file':
				return this.updateFile(value)
			case 'dialog-dir':
				return this.updateDialogDir(value)
			case 'clip':
				return this.updateClip(value)
			case 'variable':
				return this.updateVariable(value)
			case 'global-variable':
				return this.updateGlobalVariable(value)
			case 'actor':
				return this.updateActor(value)
			case 'skill':
				return this.updateSkill(value)
			case 'state':
				return this.updateState(value)
			case 'equipment':
				return this.updateEquipment(value)
			case 'item':
				return this.updateItem(value)
			case 'position':
				return this.updatePosition(value)
			case 'angle':
				return this.updateAngle(value)
			case 'trigger':
				return this.updateTrigger(value)
			case 'light':
				return this.updateLight(value)
			case 'region':
				return this.updateRegion(value)
			case 'tilemap':
				return this.updateTilemap(value)
			case 'object':
				return this.updateObject(value)
			case 'element':
			case 'ancestor-element':
				return this.updateElement(value)
			case 'preset-object':
				return this.updatePresetObject(value)
			case 'preset-element':
				return this.updatePresetElement(value)
			case 'array':
				return this.updateArray(value)
			case 'attribute':
				return this.updateAttribute(value)
			case 'attribute-group':
				return this.updateAttributeGroup(value)
			case 'enum-group':
				return this.updateEnumGroup(value)
			case 'enum-string':
				return this.updateEnumString(value)
		}
	}

	// 更新文件信息
	updateFile(guid) {
		Command.invalid = false
		this.info.textContent = Command.removeTextTags(
			Command.parseFileName(guid)
		)
		if (Command.invalid) this.info.addClass('invalid')
	}

	// 更新对话框目录
	updateDialogDir(path) {
		this.info.textContent = path
	}

	// 打开对话框目录
	openDialogDir(input) {
		File.showOpenDialog({
			defaultPath: input.read(),
			properties: ['openDirectory']
		}).then(({ filePaths }) => {
			if (filePaths.length === 1) {
				input.write(filePaths[0])
			}
		})
	}

	// 更新图像剪辑信息
	updateClip(clip) {
		this.info.textContent = clip.join(', ')
	}

	// 更新变量信息
	updateVariable(variable) {
		// 类型是独立变量，或存在变量键，则判定为有效变量
		if (variable.type === 'self' || variable.key) {
			this.info.textContent = Command.removeTextTags(
				Command.parseVariable(variable)
			)
		} else {
			this.info.textContent = Local.get('common.none')
		}
	}

	// 更新全局变量信息
	updateGlobalVariable(id) {
		this.info.textContent = Command.removeTextTags(
			Command.parseGlobalVariable(id)
		)
	}

	// 更新角色信息
	updateActor(actor) {
		this.info.textContent = Command.removeTextTags(
			Command.parseActor(actor)
		)
	}

	// 更新技能信息
	updateSkill(skill) {
		this.info.textContent = Command.removeTextTags(
			Command.parseSkill(skill)
		)
	}

	// 更新状态信息
	updateState(state) {
		this.info.textContent = Command.removeTextTags(
			Command.parseState(state)
		)
	}

	// 更新装备信息
	updateEquipment(equipment) {
		this.info.textContent = Command.removeTextTags(
			Command.parseEquipment(equipment)
		)
	}

	// 更新物品信息
	updateItem(item) {
		this.info.textContent = Command.removeTextTags(Command.parseItem(item))
	}

	// 更新位置信息
	updatePosition(point) {
		this.info.textContent = Command.removeTextTags(
			Command.parsePosition(point)
		)
	}

	// 更新角度信息
	updateAngle(angle) {
		this.info.textContent = Command.removeTextTags(
			Command.parseAngle(angle)
		)
	}

	// 更新触发器信息
	updateTrigger(trigger) {
		this.info.textContent = Command.removeTextTags(
			Command.parseTrigger(trigger)
		)
	}

	// 更新光源信息
	updateLight(light) {
		this.info.textContent = Command.removeTextTags(
			Command.parseLight(light)
		)
	}

	// 更新区域信息
	updateRegion(region) {
		this.info.textContent = Command.removeTextTags(
			Command.parseRegion(region)
		)
	}

	// 更新瓦片地图信息
	updateTilemap(tilemap) {
		this.info.textContent = Command.removeTextTags(
			Command.parseTilemap(tilemap)
		)
	}

	// 更新场景对象信息
	updateObject(object) {
		this.info.textContent = Command.removeTextTags(
			Command.parseObject(object)
		)
	}

	// 更新元素信息
	updateElement(element) {
		Command.invalid = false
		this.info.textContent = Command.removeTextTags(
			Command.parseElement(element)
		)
		if (Command.invalid) this.info.addClass('invalid')
	}

	// 更新预设对象信息
	updatePresetObject(preset) {
		this.info.textContent = Command.removeTextTags(
			Command.parsePresetObject(preset)
		)
	}

	// 更新预设元素信息
	updatePresetElement(preset) {
		this.info.textContent = Command.removeTextTags(
			Command.parsePresetElement(preset)
		)
		if (Command.invalid) this.info.addClass('invalid')
	}

	// 更新数组信息
	updateArray(array) {
		this.info.textContent =
			array.length !== 0
				? Command.parseMultiLineString(array.join(', '))
				: Local.get('common.empty')
	}

	// 更新属性群组信息
	updateAttributeGroup(groupId) {
		Command.invalid = false
		this.info.textContent = Command.removeTextTags(
			Command.parseAttributeGroup(groupId)
		)
		if (Command.invalid) this.info.addClass('invalid')
	}

	// 更新属性信息
	updateAttribute(attrId) {
		if (attrId === '') {
			this.info.textContent = Local.get('common.none')
			return
		}
		const attribute = Attribute.getAttribute(attrId)
		if (attribute) {
			this.info.textContent = GameLocal.replace(attribute.name)
		} else {
			this.info.textContent = Command.parseUnlinkedId(attrId)
			this.info.addClass('invalid')
		}
	}

	// 更新枚举群组信息
	updateEnumGroup(groupId) {
		Command.invalid = false
		this.info.textContent = Command.removeTextTags(
			Command.parseEnumGroup(groupId)
		)
		if (Command.invalid) this.info.addClass('invalid')
	}

	// 更新枚举字符串信息
	updateEnumString(stringId) {
		if (stringId === '') {
			this.info.textContent = Local.get('common.none')
			return
		}
		const string = Enum.getString(stringId)
		if (string) {
			this.info.textContent = GameLocal.replace(string.name)
		} else {
			this.info.textContent = Command.parseUnlinkedId(stringId)
			this.info.addClass('invalid')
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.tabIndex += 1
			this.showChildNodes()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.tabIndex -= 1
			this.hideChildNodes()
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'input':
				this.inputEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Enter':
			case 'NumpadEnter':
				if (!event.cmdOrCtrlKey) {
					event.stopPropagation()
					this.click(event)
				}
				break
		}
	}

	// 鼠标点击事件
	click(event) {
		switch (this.type) {
			case 'file':
				return Selector.open(this)
			case 'dialog-dir':
				return this.openDialogDir(this)
			case 'clip':
				return ImageClip.open(this)
			case 'variable':
				return VariableGetter.open(this)
			case 'global-variable':
				return Variable.open(this)
			case 'actor':
				return ActorGetter.open(this)
			case 'skill':
				return SkillGetter.open(this)
			case 'state':
				return StateGetter.open(this)
			case 'equipment':
				return EquipmentGetter.open(this)
			case 'item':
				return ItemGetter.open(this)
			case 'position':
				return PositionGetter.open(this)
			case 'angle':
				return AngleGetter.open(this)
			case 'trigger':
				return TriggerGetter.open(this)
			case 'light':
				return LightGetter.open(this)
			case 'region':
				return RegionGetter.open(this)
			case 'tilemap':
				return TilemapGetter.open(this)
			case 'object':
				return ObjectGetter.open(this)
			case 'element':
				return ElementGetter.open(this)
			case 'ancestor-element':
				return AncestorGetter.open(this)
			case 'preset-object':
				return PresetObject.open(this)
			case 'preset-element':
				return PresetElement.open(this)
			case 'array':
				return ArrayList.open(this)
			case 'attribute':
				return Attribute.open(this, 'attribute')
			case 'attribute-group':
				return Attribute.open(this, 'group')
			case 'enum-group':
				return Enum.open(this, 'group')
			case 'enum-string':
				return Enum.open(this, 'string')
		}
	}

	// 拖拽进入事件
	dragenter(event) {
		return this.dragover(event)
	}

	// 拖拽离开事件
	dragleave(event) {
		if (!this.contains(event.relatedTarget)) {
			this.removeClass('dragover')
		}
	}

	// 拖拽悬停事件
	dragover(event) {
		if (this.type === 'file' && Browser.dragging) {
			const file = Browser.body.activeFile
			if (
				file instanceof FileItem &&
				(!this.filter || this.filter.indexOf(file.type) !== -1)
			) {
				event.dataTransfer.dropEffect = 'move'
				event.preventDefault()
				this.addClass('dragover')
			}
		}
	}

	// 拖拽释放事件
	drop(event) {
		const file = Browser.body.activeFile
		if (file instanceof FileItem) {
			this.focus()
			this.input(file.meta.guid)
			this.removeClass('dragover')
		}
	}
}

customElements.define('custom-box', CustomBox)

// ******************************** 数字变量框 ********************************

class NumberVar extends HTMLElement {
	mode //:string
	numBox //:element
	varBox //:element

	constructor() {
		super()

		// 设置属性
		this.mode = null
		this.numBox = new NumberBox(this)
		this.varBox = new CustomBox()
		this.varBox.type = 'variable'
		this.varBox.filter = 'number'

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		switch (this.mode) {
			case 'constant':
				return this.numBox.read()
			case 'variable':
				return this.varBox.read()
		}
	}

	// 写入数据
	write(value) {
		switch (typeof value) {
			case 'number':
				this.switch('constant')
				this.numBox.write(value)
				// 暂时这么写，不是很理想
				this.varBox.write(
					this.varBox.isPluginInput
						? NumberVar.defVarForPlugin
						: NumberVar.defVar
				)
				break
			case 'object':
				this.switch('variable')
				this.numBox.write(0)
				this.varBox.write(value)
				break
		}
	}

	// 切换模式
	switch(mode) {
		const focus = !mode && !this.hasClass('disabled')
		if (mode === undefined) {
			switch (this.mode) {
				case 'constant':
					mode = 'variable'
					break
				case 'variable':
					mode = 'constant'
					break
			}
		}
		if (this.mode !== mode) {
			this.removeClass(this.mode)
			this.addClass(mode)
			this.mode = mode
			switch (mode) {
				case 'constant':
					this.varBox.remove()
					this.appendChild(this.numBox)
					if (focus) {
						this.numBox.input.focus()
						this.numBox.input.select()
					}
					break
				case 'variable':
					this.numBox.remove()
					this.appendChild(this.varBox)
					if (focus) {
						this.varBox.focus()
					}
					break
			}
			this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.numBox.enable()
			this.varBox.enable()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.numBox.disable()
			this.varBox.disable()
		}
	}

	// 获得焦点
	getFocus(mode) {
		switch (this.mode) {
			case 'constant':
				return this.numBox.getFocus(mode)
			case 'variable':
				return this.varBox.getFocus(mode)
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Slash':
				// 切换输入框导致已侦听的事件失效
				// 因此在这里阻止输入行为
				event.preventDefault()
				this.switch()
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('disabled') && event.target === this) {
					event.preventDefault()
					this.switch()
				}
				break
			case 2:
				if (!this.hasClass('disabled')) {
					event.preventDefault()
					this.switch()
				}
				break
		}
	}

	// 默认变量值
	static defVar = { type: 'local', key: 'key' }

	// 默认变量值 - 插件专用
	static defVarForPlugin = { getter: 'variable', type: 'local', key: 'key' }
}

customElements.define('number-var', NumberVar)

// ******************************** 字符串变量框 ********************************

class StringVar extends HTMLElement {
	mode //:string
	strBox //:element
	varBox //:element

	constructor() {
		super()

		// 设置属性
		this.mode = null
		this.strBox = new TextBox()
		this.varBox = new CustomBox()
		this.varBox.type = 'variable'
		this.varBox.filter = 'string'

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		switch (this.mode) {
			case 'constant':
				return this.strBox.read()
			case 'variable':
				return this.varBox.read()
		}
	}

	// 写入数据
	write(value) {
		switch (typeof value) {
			case 'string':
				this.switch('constant')
				this.strBox.write(value)
				this.varBox.write(StringVar.defVar)
				break
			case 'object':
				this.switch('variable')
				this.strBox.write('')
				this.varBox.write(value)
				break
		}
	}

	// 切换模式
	switch(mode) {
		const focus = !mode && !this.hasClass('disabled')
		if (mode === undefined) {
			switch (this.mode) {
				case 'constant':
					mode = 'variable'
					break
				case 'variable':
					mode = 'constant'
					break
			}
		}
		if (this.mode !== mode) {
			this.removeClass(this.mode)
			this.addClass(mode)
			this.mode = mode
			switch (mode) {
				case 'constant':
					this.varBox.remove()
					this.appendChild(this.strBox)
					if (focus) {
						this.strBox.input.focus()
						this.strBox.input.select()
					}
					break
				case 'variable':
					this.strBox.remove()
					this.appendChild(this.varBox)
					if (focus) {
						this.varBox.focus()
					}
					break
			}
			// this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.strBox.enable()
			this.varBox.enable()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.strBox.disable()
			this.varBox.disable()
		}
	}

	// 获得焦点
	getFocus(mode) {
		switch (this.mode) {
			case 'constant':
				return this.strBox.getFocus(mode)
			case 'variable':
				return this.varBox.getFocus(mode)
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Slash':
				// 切换输入框导致已侦听的事件失效
				// 因此在这里阻止输入行为
				event.preventDefault()
				this.switch()
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('disabled') && event.target === this) {
					event.preventDefault()
					this.switch()
				}
				break
			case 2:
				if (!this.hasClass('disabled')) {
					event.preventDefault()
					this.switch()
				}
				break
		}
	}

	// 默认变量值
	static defVar = { type: 'local', key: 'key' }
}

customElements.define('string-var', StringVar)

// ******************************** 字符串变量框 ********************************

class TextAreaVar extends HTMLElement {
	mode //:string
	strBox //:element
	varBox //:element

	constructor() {
		super()

		// 设置属性
		this.mode = null
		this.strBox = new TextArea()
		this.varBox = new CustomBox()
		this.varBox.type = 'variable'
		this.varBox.filter = 'string'

		// 继承menu属性
		const menu = this.getAttribute('menu')
		if (menu) {
			this.strBox.setAttribute('menu', menu)
		}

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		switch (this.mode) {
			case 'constant':
				return this.strBox.read()
			case 'variable':
				return this.varBox.read()
		}
	}

	// 写入数据
	write(value) {
		switch (typeof value) {
			case 'string':
				this.switch('constant')
				this.strBox.write(value)
				this.varBox.write(TextAreaVar.defVar)
				break
			case 'object':
				this.switch('variable')
				this.strBox.write('')
				this.varBox.write(value)
				break
		}
	}

	// 切换模式
	switch(mode) {
		const focus = !mode && !this.hasClass('disabled')
		if (mode === undefined) {
			switch (this.mode) {
				case 'constant':
					mode = 'variable'
					break
				case 'variable':
					mode = 'constant'
					break
			}
		}
		if (this.mode !== mode) {
			this.removeClass(this.mode)
			this.addClass(mode)
			this.mode = mode
			switch (mode) {
				case 'constant':
					this.varBox.remove()
					this.appendChild(this.strBox)
					if (focus) {
						this.strBox.input.focus()
						this.strBox.input.select()
					}
					break
				case 'variable':
					this.strBox.remove()
					this.appendChild(this.varBox)
					if (focus) {
						this.varBox.focus()
					}
					break
			}
			this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.strBox.enable()
			this.varBox.enable()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.strBox.disable()
			this.varBox.disable()
		}
	}

	// 获得焦点
	getFocus(mode) {
		switch (this.mode) {
			case 'constant':
				return this.strBox.getFocus(mode)
			case 'variable':
				return this.varBox.getFocus(mode)
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey || event.altKey) {
			switch (event.code) {
				case 'Slash':
					// 切换输入框导致已侦听的事件失效
					// 因此在这里阻止输入行为
					event.preventDefault()
					this.switch()
					break
			}
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('disabled') && event.target === this) {
					event.preventDefault()
					this.switch()
				}
				break
		}
	}

	// 默认变量值
	static defVar = { type: 'local', key: 'key' }
}

customElements.define('text-area-var', TextAreaVar)

// ******************************** 选择变量框 ********************************

class SelectVar extends HTMLElement {
	mode //:string
	selectBox //:element
	varBox //:element

	constructor() {
		super()

		// 设置属性
		this.mode = null
		this.selectBox = new SelectBox()
		this.varBox = new CustomBox()
		this.varBox.type = 'variable'
		this.varBox.filter = 'all'

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		switch (this.mode) {
			case 'constant':
				return this.selectBox.read()
			case 'variable':
				return this.varBox.read()
		}
	}

	// 写入数据
	write(value) {
		switch (typeof value) {
			case 'string':
				this.switch('constant')
				this.selectBox.write(value)
				this.varBox.write(SelectVar.defVar)
				break
			case 'object':
				this.switch('variable')
				this.selectBox.writeDefault()
				this.varBox.write(value)
				break
		}
	}

	// 切换模式
	switch(mode) {
		const focus = !mode && !this.hasClass('disabled')
		if (mode === undefined) {
			switch (this.mode) {
				case 'constant':
					mode = 'variable'
					break
				case 'variable':
					mode = 'constant'
					break
			}
		}
		if (this.mode !== mode) {
			this.removeClass(this.mode)
			this.addClass(mode)
			this.mode = mode
			switch (mode) {
				case 'constant':
					this.varBox.remove()
					this.appendChild(this.selectBox)
					if (focus) {
						this.selectBox.focus()
					}
					break
				case 'variable':
					this.selectBox.remove()
					this.appendChild(this.varBox)
					if (focus) {
						this.varBox.focus()
					}
					break
			}
			// this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.selectBox.enable()
			this.varBox.enable()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.selectBox.disable()
			this.varBox.disable()
		}
	}

	// 加载选项
	loadItems(items) {
		this.selectBox.loadItems(items)
	}

	// 获得焦点
	getFocus(mode) {
		switch (this.mode) {
			case 'constant':
				return this.selectBox.getFocus(mode)
			case 'variable':
				return this.varBox.getFocus(mode)
		}
	}

	// 清除选项
	clear() {
		this.selectBox.clear()
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Slash':
				// 切换输入框导致已侦听的事件失效
				// 因此在这里阻止输入行为
				event.preventDefault()
				this.switch()
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('disabled') && event.target === this) {
					event.preventDefault()
					this.switch()
				}
				break
			case 2:
				if (!this.hasClass('disabled')) {
					event.preventDefault()
					this.switch()
				}
				break
		}
	}

	// 默认变量值
	static defVar = { type: 'local', key: 'key' }
}

customElements.define('select-var', SelectVar)

// ******************************** 文件变量框 ********************************

class FileVar extends HTMLElement {
	mode //:string
	strBox //:element
	varBox //:element

	constructor() {
		super()

		// 设置属性
		this.mode = null
		this.fileBox = new CustomBox()
		this.varBox = new CustomBox()
		this.fileBox.type = 'file'
		this.fileBox.filter = this.getAttribute('filter')
		this.varBox.type = 'variable'
		this.varBox.filter = 'string'

		// 侦听事件
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		switch (this.mode) {
			case 'constant':
				return this.fileBox.read()
			case 'variable':
				return this.varBox.read()
		}
	}

	// 写入数据
	write(value) {
		switch (typeof value) {
			case 'string':
				this.switch('constant')
				this.fileBox.write(value)
				this.varBox.write(FileVar.defVar)
				break
			case 'object':
				this.switch('variable')
				this.fileBox.write('')
				this.varBox.write(value)
				break
		}
	}

	// 切换模式
	switch(mode) {
		const focus = !mode && !this.hasClass('disabled')
		if (mode === undefined) {
			switch (this.mode) {
				case 'constant':
					mode = 'variable'
					break
				case 'variable':
					mode = 'constant'
					break
			}
		}
		if (this.mode !== mode) {
			this.removeClass(this.mode)
			this.addClass(mode)
			this.mode = mode
			switch (mode) {
				case 'constant':
					this.varBox.remove()
					this.appendChild(this.fileBox)
					if (focus) {
						this.fileBox.focus()
					}
					break
				case 'variable':
					this.fileBox.remove()
					this.appendChild(this.varBox)
					if (focus) {
						this.varBox.focus()
					}
					break
			}
			// this.dispatchChangeEvent()
		}
	}

	// 启用元素
	enable() {
		if (this.removeClass('disabled')) {
			this.fileBox.enable()
			this.varBox.enable()
		}
	}

	// 禁用元素
	disable() {
		if (this.addClass('disabled')) {
			this.fileBox.disable()
			this.varBox.disable()
		}
	}

	// 获得焦点
	getFocus(mode) {
		switch (this.mode) {
			case 'constant':
				return this.fileBox.getFocus(mode)
			case 'variable':
				return this.varBox.getFocus(mode)
		}
	}

	// 键盘按下事件
	keydown(event) {
		switch (event.code) {
			case 'Slash':
				// 切换输入框导致已侦听的事件失效
				// 因此在这里阻止输入行为
				event.preventDefault()
				this.switch()
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
				if (!this.hasClass('disabled') && event.target === this) {
					event.preventDefault()
					this.switch()
				}
				break
			case 2:
				if (!this.hasClass('disabled')) {
					event.preventDefault()
					this.switch()
				}
				break
		}
	}

	// 默认变量值
	static defVar = { type: 'local', key: 'key' }
}

customElements.define('file-var', FileVar)

// ******************************** 滤镜框 ********************************

class FilterBox extends HTMLElement {
	canvas //:element
	dataValue //:object

	constructor() {
		super()

		// 设置属性
		this.canvas = null
		this.dataValue = null
	}

	// 读取数据
	read() {
		return this.dataValue
	}

	// 写入数据
	write(tint) {
		this.dataValue = tint
		this.update()
	}

	// 更新画面
	update() {
		let { canvas } = this
		if (!canvas) {
			canvas = document.createElement('canvas')
			canvas.width = this.getAttribute('width')
			canvas.height = this.getAttribute('height')
			canvas.context = canvas.getContext('2d')
			this.appendChild((this.canvas = canvas))
		}

		// 绘制垂直渐变色带
		const { context, width, height } = canvas
		const [red, green, blue, gray] = this.dataValue
		if (!context.gradient) {
			const gradient = context.createLinearGradient(0, 0, 0, height)
			gradient.addColorStop(0, '#ff0000')
			gradient.addColorStop(1 / 6, '#ffff00')
			gradient.addColorStop(2 / 6, '#00ff00')
			gradient.addColorStop(3 / 6, '#00ffff')
			gradient.addColorStop(4 / 6, '#0000ff')
			gradient.addColorStop(5 / 6, '#ff00ff')
			gradient.addColorStop(1, '#ff0000')
			context.gradient = gradient
		}
		context.globalCompositeOperation = 'source-over'
		context.fillStyle = context.gradient
		context.fillRect(0, 0, width, height)

		// 绘制水平渐变色带
		const leftGradient = context.createLinearGradient(0, 0, width >> 1, 0)
		leftGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
		leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
		context.fillStyle = leftGradient
		context.fillRect(0, 0, width >> 1, height)
		const rightGradient = context.createLinearGradient(
			width >> 1,
			0,
			width,
			0
		)
		rightGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
		rightGradient.addColorStop(1, 'rgba(255, 255, 255, 1)')
		context.fillStyle = rightGradient
		context.fillRect(width >> 1, 0, width - (width >> 1), height)

		// 灰度混合
		if (gray) {
			context.globalCompositeOperation = 'saturation'
			context.globalAlpha = gray / 255
			context.fillStyle = '#ffffff'
			context.fillRect(0, 0, width, height)
			context.globalAlpha = 1
		}

		// 加法混合
		const addR = Math.max(red, 0)
		const addG = Math.max(green, 0)
		const addB = Math.max(blue, 0)
		if (addR || addG || addB) {
			context.globalCompositeOperation = 'lighter'
			context.fillStyle = `rgba(${addR}, ${addG}, ${addB}, 1)`
			context.fillRect(0, 0, width, height)
		}

		// 减法混合
		const subR = Math.max(-red, 0)
		const subG = Math.max(-green, 0)
		const subB = Math.max(-blue, 0)
		if (subR || subG || subB) {
			context.globalCompositeOperation = 'difference'
			context.fillStyle = '#ffffff'
			context.fillRect(0, 0, width, height)
			context.globalCompositeOperation = 'lighter'
			context.fillStyle = `rgba(${subR}, ${subG}, ${subB}, 1)`
			context.fillRect(0, 0, width, height)
			context.globalCompositeOperation = 'difference'
			context.fillStyle = '#ffffff'
			context.fillRect(0, 0, width, height)
		}
	}

	// 清除画布
	clear() {
		if (this.canvas) {
			this.removeChild(this.canvas)
			this.canvas = null
		}
	}
}

customElements.define('filter-box', FilterBox)

// ******************************** 标签栏 ********************************

class TabBar extends HTMLElement {
	data //:array
	dragging //:event
	selectionIndex //:number
	writeEventEnabled //:boolean
	selectEventEnabled //:boolean
	closedEventEnabled //:boolean
	popupEventEnabled //:boolean
	windowPointerup //:function

	constructor() {
		super()

		// 设置属性
		this.data = null
		this.dragging = null
		this.selectionIndex = 0
		this.writeEventEnabled = false
		this.selectEventEnabled = false
		this.closedEventEnabled = false
		this.popupEventEnabled = false
		this.windowPointerup = TabBar.windowPointerup.bind(this)

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
		this.on('dragstart', this.dragstart)
		this.on('dragend', this.dragend)
	}

	// 读取数据
	read() {
		const item = this.querySelector('.selected')
		return item ? item.item : undefined
	}

	// 写入数据
	write(value) {
		const items = this.childNodes
		const length = items.length
		if (length !== 0) {
			this.unselect()
			let target
			for (let i = 0; i < length; i++) {
				if (items[i].item === value) {
					this.selectionIndex = i
					target = items[i]
					break
				}
			}
			if (target !== undefined) {
				target.addClass('selected')
			}
			if (this.writeEventEnabled) {
				const write = new Event('write')
				write.value = target ? value : undefined
				this.dispatchEvent(write)
			}
		}
	}

	// 更新标签列表
	update() {
		super.clear()
		for (const item of this.data) {
			let tab = item.tab
			if (tab === undefined) {
				tab = item.tab = document.createElement('tab-item')
				const text = document.createElement('tab-text')
				text.textContent = this.parseTabName(item)
				tab.draggable = true
				tab.item = item
				tab.text = text
				tab.appendChild(text)
				// 给目录以外的标签添加关闭按钮
				if (item.type !== 'directory') {
					const mark = document.createElement('tab-close')
					mark.textContent = '\u2716'
					tab.appendChild(mark)
				}
			}
			this.appendChild(tab)
		}
	}

	// 解析标签名称
	parseTabName(item) {
		return `${item.icon} ${item.name}`
	}

	// 选择项目
	select(item) {
		if (this.read() !== item) {
			this.write(item)
			if (this.selectEventEnabled) {
				const select = new Event('select')
				select.value = item
				this.dispatchEvent(select)
			}
		}
	}

	// 取消选择
	unselect() {
		const item = this.querySelector('.selected')
		if (item) {
			item.removeClass('selected')
		}
	}

	// 插入项目
	insert(item) {
		if (!this.data.includes(item)) {
			// 索引超过长度时会加入到末尾
			this.data.splice(this.selectionIndex + 1, 0, item)
			this.update()
		}
	}

	// 关闭项目
	close(item) {
		if (item === this.dirItem) return
		const value = this.read()
		if (this.data.remove(item)) {
			this.update()
			if (this.closedEventEnabled) {
				const closed = new Event('closed')
				closed.closedItems = [item]
				closed.lastValue = value
				this.dispatchEvent(closed)
			}
		}
	}

	// 关闭属性匹配的项目
	closeByProperty(key, value) {
		for (const context of this.data) {
			if (context[key] === value) {
				this.close(context)
				return
			}
		}
	}

	// 关闭其他项目
	closeOtherTabs(item) {
		const value = this.read()
		const items = this.data
		let i = items.length
		if (i <= 1) return
		const closedItems = []
		while (--i >= 0) {
			const tab = items[i]
			if (tab === item) continue
			if (tab === this.dirItem) continue
			items.splice(i, 1)
			closedItems.push(tab)
		}
		if (closedItems.length !== 0) {
			this.update()
			if (this.closedEventEnabled) {
				const closed = new Event('closed')
				closed.closedItems = closedItems
				closed.lastValue = value
				this.dispatchEvent(closed)
			}
		}
	}

	// 关闭右侧项目
	closeTabsToTheRight(item) {
		const value = this.read()
		const items = this.data
		const index = items.indexOf(item)
		if (index === -1) return
		const closedItems = []
		let i = items.length
		while (--i > index) {
			const tab = items[i]
			if (tab === this.dirItem) continue
			items.splice(i, 1)
			closedItems.push(tab)
		}
		if (closedItems.length !== 0) {
			this.update()
			if (this.closedEventEnabled) {
				const closed = new Event('closed')
				closed.closedItems = closedItems
				closed.lastValue = value
				this.dispatchEvent(closed)
			}
		}
	}

	// 查找项目
	find(meta) {
		for (const { item } of this.childNodes) {
			if (item.meta === meta) {
				return item
			}
		}
		return undefined
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'select':
				this.selectEventEnabled = true
				break
			case 'closed':
				this.closedEventEnabled = true
				break
			case 'popup':
				this.popupEventEnabled = true
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		this.dragend()
		switch (event.button) {
			case 0: {
				const element = event.target
				if (element.tagName === 'TAB-CLOSE') {
					// 阻止拖拽开始事件
					event.preventDefault()
					this.dragging = event
					event.mode = 'close'
					window.on('pointerup', this.windowPointerup)
					return
				}
				if (
					element.tagName === 'TAB-ITEM' &&
					!element.hasClass('selected')
				) {
					this.select(element.item)
				}
				break
			}
			case 2:
				if (this.popupEventEnabled) {
					switch (event.target.tagName) {
						case 'TAB-ITEM':
						case 'TAB-BAR':
							this.dragging = event
							event.mode = 'popup'
							window.on('pointerup', this.windowPointerup)
							break
					}
				}
				break
		}
	}

	// 拖拽开始事件
	dragstart(event) {
		if (!this.dragging) {
			this.dragging = event
			Object.defineProperty(event, 'offsetX', { writable: true })
			event.preventDefault = Function.empty
			event.dataTransfer.hideDragImage()
			event.hint = document.createElement('drag-and-drop-hint')
			event.hint.addClass('for-tab')
			this.parentNode.insertBefore(event.hint.hide(), this)
			this.addClass('dragging')
			Title.updateAppRegion()
			this.on('dragenter', this.dragenter)
			this.on('dragleave', this.dragleave)
			this.on('dragover', this.dragover)
			this.on('drop', this.drop)
		}
	}

	// 拖拽结束事件
	dragend(event) {
		if (this.dragging) {
			this.removeClass('dragging')
			this.parentNode.removeChild(this.dragging.hint)
			this.dragging = null
			this.off('dragenter', this.dragenter)
			this.off('dragleave', this.dragleave)
			this.off('dragover', this.dragover)
			this.off('drop', this.drop)
		}
	}

	// 拖拽进入事件
	dragenter(event) {
		if (this.dragging) {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
		}
	}

	// 拖拽离开事件
	dragleave(event) {
		if (this.dragging && !this.contains(event.relatedTarget)) {
			this.dragging.offsetX = -1
			this.dragging.hint.hide()
		}
	}

	// 拖拽悬停事件
	dragover(event) {
		const { dragging } = this
		if (dragging) {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
			if (dragging.offsetX === event.offsetX) {
				return
			}
			dragging.offsetX = event.offsetX
			const element = event.target.seek('tab-item')
			const hint = dragging.hint.show()
			if (element.tagName === 'TAB-ITEM') {
				const sItem = dragging.target.item
				const dItem = element.item
				if (sItem === dItem) {
					return hint.hide()
				}
				// 避免使用event.offsetX
				// 这样当指针落在关闭按钮上也能计算位置
				const rect = element.rect()
				const middle = rect.width / 2
				const offsetX = event.clientX - rect.left
				const position = offsetX < middle ? 'before' : 'after'
				switch (position) {
					case 'before':
						if (
							hint.target !== element ||
							hint.position !== position
						) {
							if (element.previousSibling === dragging.target) {
								return hint.hide()
							}
							const rect = hint.measure(element)
							rect.left -= 1
							rect.width = 2
							hint.target = element
							hint.position = position
							hint.set(rect)
						}
						break
					case 'after':
						if (
							hint.target !== element ||
							hint.position !== position
						) {
							if (element.nextSibling === dragging.target) {
								return hint.hide()
							}
							const rect = hint.measure(element)
							rect.left += rect.width - 1
							rect.width = 2
							hint.target = element
							hint.position = position
							hint.set(rect)
						}
						break
				}
			} else {
				const elements = this.childNodes
				const index = elements.length - 1
				const element = elements[index]
				if (element === dragging.target) {
					return hint.hide()
				}
				if (
					element !== undefined &&
					(hint.target !== element || hint.position !== 'after')
				) {
					const rect = hint.measure(element)
					rect.left += rect.width - 1
					rect.width = 2
					hint.target = element
					hint.position = 'after'
					hint.set(rect)
				}
			}
		}
	}

	// 拖拽释放事件
	drop(event) {
		const { dragging } = this
		if (!dragging) {
			return
		}
		event.stopPropagation()
		const hint = dragging.hint
		if (!hint.hasClass('hidden')) {
			const items = this.data
			const sItem = dragging.target.item
			const dItem = hint.target.item
			if (items.remove(sItem)) {
				let dIndex = items.indexOf(dItem)
				if (hint.position === 'after') {
					dIndex++
				}
				items.splice(dIndex, 0, sItem)
				this.selectionIndex = dIndex
				this.update()
			}
		}

		// 创建项目后不能触发拖拽结束事件
		this.dragend()
	}

	// 窗口 - 指针弹起事件
	static windowPointerup(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'close':
					if (dragging.target === event.target) {
						this.close(event.target.parentNode.item)
					}
					break
				case 'popup':
					if (dragging.target === event.target) {
						const popup = new Event('popup')
						const item = event.target.item
						popup.value = item ?? null
						popup.clientX = event.clientX
						popup.clientY = event.clientY
						this.dispatchEvent(popup)
					}
					break
			}
			this.dragging = null
			window.off('pointerup', this.windowPointerup)
		}
	}
}

customElements.define('tab-bar', TabBar)

// ******************************** 导航栏 ********************************

class NavBar extends HTMLElement {
	writeEventEnabled //:boolean
	selectEventEnabled //:boolean

	constructor() {
		super()

		// 处理子元素
		const elements = this.childNodes
		if (elements.length > 0) {
			let i = elements.length
			while (--i >= 0) {
				const element = elements[i]
				if (element.tagName === 'NAV-ITEM') {
					const string = element.getAttribute('value')
					const isNumber = RegExp.number.test(string)
					element.dataValue = isNumber ? parseFloat(string) : string
				} else {
					this.removeChild(element)
				}
			}
		}

		// 设置属性
		this.writeEventEnabled = false
		this.selectEventEnabled = false

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
	}

	// 读取数据
	read() {
		const item = this.querySelector('.selected')
		return item ? item.dataValue : undefined
	}

	// 写入数据
	write(value) {
		const items = this.childNodes
		const length = items.length
		if (length !== 0) {
			this.unselect()
			let target
			for (let i = 0; i < length; i++) {
				if (items[i].dataValue === value) {
					target = items[i]
					break
				}
			}
			if (target !== undefined) {
				target.addClass('selected')
			}
			if (this.writeEventEnabled) {
				const write = new Event('write')
				write.value = target ? value : undefined
				this.dispatchEvent(write)
			}
		}
	}

	// 取消选择
	unselect() {
		const item = this.querySelector('.selected')
		if (item) {
			item.removeClass('selected')
		}
	}

	// 加载选项
	// loadItems(items) {
	//   this.textContent = ''
	//   for (const item of items) {
	//     const li = document.createElement('nav-item')
	//     li.dataValue = item.value
	//     li.textContent = item.name
	//     this.appendChild(li)
	//   }
	// }

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'select':
				this.selectEventEnabled = true
				break
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0: {
				const element = event.target
				if (
					element.tagName === 'NAV-ITEM' &&
					!element.hasClass('selected')
				) {
					this.write(element.dataValue)
					if (this.selectEventEnabled) {
						const select = new Event('select')
						select.value = element.dataValue
						this.dispatchEvent(select)
					}
				}
				break
			}
		}
	}
}

customElements.define('nav-bar', NavBar)

// ******************************** 树状列表 ********************************

class TreeList extends HTMLElement {
	display //:string
	keyword //:string
	searchResults //:array
	creators //:array
	updaters //:array
	elements //:array
	root //:object
	timer //:object
	selections //:array
	dragging //:event
	padded //:boolean
	removable //:boolean
	renamable //:boolean
	foldable //:boolean
	lockDirectory //:boolean
	multipleSelect //:boolean
	selectEventEnabled //:boolean
	unselectEventEnabled //:boolean
	recordEventEnabled //:boolean
	popupEventEnabled //:boolean
	openEventEnabled //:boolean
	updateEventEnabled //:boolean

	constructor() {
		super()

		// 创建重命名计时器
		const timer = new Timer({
			duration: 500,
			callback: (timer) => {
				const item = this.read()
				if (item instanceof Object) {
					const target = timer.target
					const element = item.element
					if (element.contains(target)) {
						this.rename(item)
					}
				}
				timer.target = null
				timer.running = false
			}
		})

		// 创建根节点
		const root = Object.defineProperty({}, 'children', {
			get: () => this.data
		})

		// 设置属性
		this.tabIndex = 0
		this.display = 'normal'
		this.keyword = null
		this.searchResults = []
		this.creators = []
		this.updaters = []
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.root = root
		this.timer = timer
		this.selections = []
		this.dragging = null
		this.padded = this.hasAttribute('padded')
		this.removable = false
		this.renamable = false
		this.foldable = true
		// 锁定目录的功能现在用不到
		this.lockDirectory = false
		// 未实现多选功能
		this.multipleSelect = false
		this.selectEventEnabled = false
		this.recordEventEnabled = false
		this.popupEventEnabled = false
		this.openEventEnabled = false
		this.updateEventEnabled = false

		// 侦听事件
		this.on('scroll', this.resize)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
		this.on('doubleclick', this.doubleclick)
		this.on('dragstart', this.dragstart)
		this.on('dragend', this.dragend)
		this.on('change', this.dataChange)
	}

	// 绑定数据
	bind(getter) {
		return Object.defineProperty(this, 'data', { get: getter })
	}

	// 读取数据
	read() {
		const { selections } = this
		return selections.length === 1 ? selections[0] : null
	}

	// 初始化
	initialize() {
		const { data } = this
		if (!data.initialized) {
			TreeList.createParents(this.data, this.root)
			Object.defineProperty(data, 'initialized', {
				configurable: true,
				value: true
			})
		}
	}

	// 更新列表
	update() {
		const { elements } = this
		elements.start = -1
		elements.count = 0

		// 初始化数据
		this.initialize()

		// 创建列表项目
		switch (this.display) {
			case 'normal':
				if (this.data) {
					this.createIndentedItems(this.data, this.root, 0)
				}
				break
			case 'search':
				if (this.searchResults.length !== 0) {
					this.createFlatItems(this.searchResults)
				}
		}

		// 清除多余的元素
		this.clearElements(elements.count)

		// 发送更新事件
		if (this.updateEventEnabled) {
			this.dispatchUpdateEvent()
		}

		// 重新调整
		this.resize()
	}

	// 刷新列表
	refresh() {
		this.deleteNodeElements(this.data)
		this.update()
	}

	// 重新调整
	resize() {
		return CommonList.resize(this)
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize(element) {
		if (element.changed) {
			element.changed = false
			this.updateNodeElement(element)
		}
	}

	// 创建扁平排列的项目
	createFlatItems(data) {
		const elements = this.elements
		const length = data.length
		for (let i = 0; i < length; i++) {
			const item = data[i]
			elements[elements.count++] = this.createNodeElement(item, 0)
		}
	}

	// 创建缩进排列的项目
	createIndentedItems(data, parent, indent) {
		const elements = this.elements
		const length = data.length
		for (let i = 0; i < length; i++) {
			const item = data[i]
			elements[elements.count++] = this.createNodeElement(item, indent)
			if (item.parent === undefined) {
				throw new Error('No parent!')
			}
			item.parent = parent
			if (item.expanded && item.children.length !== 0) {
				this.createIndentedItems(item.children, item, indent + 1)
			}
		}
	}

	// 搜索节点: regexp or string
	searchNodes(keyword) {
		const { data } = this
		if (!data) return
		if (keyword instanceof RegExp || keyword.length !== 0) {
			if (this.display === 'normal') {
				this.display = 'search'
			}
			if (typeof keyword === 'string') {
				keyword = keyword.replace(/[(){}\\^$*+?.|[\]]/g, '\\$&')
				keyword = new RegExp(keyword, 'i')
			}
			this.searchNodesAlgorithm(
				data,
				(this.keyword = keyword),
				(this.searchResults = [])
			)
		} else {
			if (this.display === 'search') {
				this.display = 'normal'
				this.keyword = null
				this.searchResults = []
			}
		}
		this.update()
	}

	// 搜索节点算法
	searchNodesAlgorithm(data, keyword, list) {
		const length = data.length
		for (let i = 0; i < length; i++) {
			const item = data[i]
			if (keyword.test(item.name)) {
				list.push(item)
			} else if (typeof item.id === 'string' && keyword.test(item.id)) {
				list.push(item)
			} else if (
				typeof item.presetId === 'string' &&
				keyword.test(item.presetId)
			) {
				list.push(item)
			}
			const children = item.children
			if (children instanceof Array) {
				this.searchNodesAlgorithm(children, keyword, list)
			}
		}
	}

	// 创建节点元素
	createNodeElement(item, indent) {
		let element = item.element
		if (element === undefined) {
			// 创建列表项
			element = document.createElement('node-item')
			element.item = item
			Object.defineProperty(item, 'element', {
				configurable: true,
				value: element
			})

			// 激活选中状态
			if (this.selections.includes(item)) {
				element.addClass('selected')
			}
		}
		element.indent = indent
		element.changed = true
		return element
	}

	// 更新节点元素
	updateNodeElement(element) {
		const { item } = element
		if (!element.textNode) {
			// 创建折叠标记
			let folderMark = null
			let markVisible = false
			let markIndent = this.foldable ? 16 : 0
			if (item.children instanceof Array) {
				folderMark = document.createElement('folder-mark')
				markVisible = true
				markIndent = 0
				element.appendChild(folderMark)
			}

			// 创建节点图标
			const nodeIcon = this.createIcon(item)
			element.appendChild(nodeIcon)

			// 创建文本节点
			const textNode = this.createText(item)
			element.appendChild(textNode)

			// 设置元素属性
			element.draggable = true
			element.expanded = false
			element.markVisible = markVisible
			element.markIndent = markIndent
			element.textIndent = 0
			element.folderMark = folderMark
			element.nodeIcon = nodeIcon
			element.textNode = textNode

			// 调用组件创建器
			for (const creator of this.creators) {
				creator(item)
			}
		}

		if (item.expanded !== undefined) {
			// 开关折叠标记
			const markVisible = item.children.length !== 0
			if (element.markVisible !== markVisible) {
				element.markVisible = markVisible
				element.folderMark.style.visibility = markVisible
					? 'inherit'
					: 'hidden'
			}

			// 设置折叠标记
			const expanded = markVisible && item.expanded
			if (item.class === 'folder') {
				if (element.expanded !== expanded) {
					element.expanded = expanded
					switch (expanded) {
						case true:
							element.folderMark.addClass('expanded')
							element.nodeIcon.addClass('expanded')
							break
						case false:
							element.folderMark.removeClass('expanded')
							element.nodeIcon.removeClass('expanded')
							break
					}
				}
			} else {
				if (element.expanded !== expanded) {
					element.expanded = expanded
					switch (expanded) {
						case true:
							element.folderMark.addClass('expanded')
							break
						case false:
							element.folderMark.removeClass('expanded')
							break
					}
				}
			}
		}

		// 设置文本缩进
		const textIndent = element.markIndent + element.indent * 12
		if (element.textIndent !== textIndent) {
			element.textIndent = textIndent
			element.style.textIndent = `${textIndent}px`
		}

		// 调用组件更新器
		for (const updater of this.updaters) {
			updater(item)
		}
	}

	// 删除绑定的节点元素
	deleteNodeElements(data) {
		const length = data.length
		for (let i = 0; i < length; i++) {
			const item = data[i]
			if (item.element !== undefined) {
				delete item.element
			}
			const { children } = item
			if (children?.length > 0) {
				this.deleteNodeElements(children)
			}
		}
	}

	// 创建图标
	createIcon(item) {
		const icon = document.createElement('node-icon')
		switch (item.class) {
			case 'folder':
				icon.addClass('icon-folder')
				break
			default:
				icon.addClass('icon-file')
				break
		}
		return icon
	}

	// 创建文本
	createText(item) {
		return document.createTextNode(this.parseName(item))
	}

	// 解析名称
	parseName(item) {
		return item.name
	}

	// 更新项目名称
	updateItemName(item) {
		if (item?.element?.textNode) {
			const element = item.element
			const text = element.textNode
			const last = text.nodeValue
			const name = this.parseName(item)
			text.nodeValue = name
			if (this.display === 'search') {
				const keyword = this.keyword
				if (keyword.test(last) || keyword.test(name)) {
					this.searchNodes(this.keyword)
				}
			}
		}
	}

	// 获取属性匹配的项目
	getItemByProperties(properties) {
		const entries = Object.entries(properties)

		// 递归查找
		const find = (items) => {
			const length = items.length
			for (let i = 0; i < length; i++) {
				const item = items[i]
				let flag = true
				for (const [key, value] of entries) {
					if (item[key] !== value) {
						flag = false
						break
					}
				}
				if (flag) {
					return item
				}
				if (item.children) {
					const result = find(item.children)
					if (result !== undefined) {
						return result
					}
				}
			}
			return undefined
		}
		return find(this.data)
	}

	// 判断节点包含关系
	contain(node, target) {
		while (target instanceof Object) {
			if (target === node) {
				return true
			}
			target = target.parent
		}
		return false
	}

	// 重命名节点
	renameNode(item, newName) {
		if (item) {
			item.name = newName
			this.updateItemName(item)
		}
	}

	// 重置节点名称
	resetItemName(item) {
		if (item) {
			item.name = this.generateCopyName(item)
			this.updateItemName(item)
		}
	}

	// 生成独一无二的名称(副本)
	generateUniqueName(item) {
		const flags = {}
		const items = item.parent.children
		for (const item of items) {
			flags[item.name] = true
		}
		const name = item.name.replace(/\s\d+$/, '')
		for (let i = 1; true; i++) {
			const newName = `${name} ${i}`
			if (!flags[newName]) {
				return newName
			}
		}
	}

	// 创建副本
	duplicate(item) {
		const copy = Object.clone(item)
		copy.name = this.generateUniqueName(item)
		const index = item.parent.children.indexOf(item)
		const next = item.parent.children[index + 1]
		if (next) {
			this.addNodeTo(copy, next, true)
		} else {
			this.addNodeTo(copy, item.parent)
		}
	}

	// 添加节点
	addNodeTo(sItem, dItem, insertBefore = false) {
		if (!sItem) {
			return
		}

		let dList
		let dIndex

		// 设置默认位置
		const { data } = this
		if (!dItem) {
			dItem = data
		}
		// 添加到根目录
		if (dItem === data) {
			dList = data
			dIndex = dList.length
			// 添加到节点
		} else if (dItem.children && !insertBefore) {
			dList = dItem.children
			dIndex = dList.length
			// 插入到节点前
		} else {
			dList = dItem.parent.children
			if (dList instanceof Array) {
				dIndex = dList.indexOf(dItem)
			}
		}
		if (dList) {
			dList.splice(dIndex, 0, sItem)
			this.unselect()

			// 创建父对象引用属性
			if (sItem.parent === undefined) {
				TreeList.createParents([sItem], null)
			}

			// 展开所在目录
			let item = dItem
			while (item.parent !== undefined) {
				if (item.expanded === false) {
					item.expanded = true
				}
				item = item.parent
			}

			// 发送记录事件
			if (this.recordEventEnabled) {
				const record = new Event('record')
				const response = {
					type: 'create',
					sItem: sItem,
					dItem: dItem,
					insertBefore: insertBefore
				}
				record.value = response
				this.dispatchEvent(record)
			}

			// 更新目录列表
			!sItem.parent && this.onCreate?.(sItem)
			this.update()
			this.select(sItem)
			this.scrollToSelection()
			this.dispatchChangeEvent()
		}
	}

	// 删除节点
	deleteNode(item) {
		const items = item.parent.children
		if (items instanceof Array) {
			const index = items.indexOf(item)
			items.splice(index, 1)

			// 发送记录事件
			if (this.recordEventEnabled) {
				const record = new Event('record')
				const response = {
					type: 'delete',
					items: items,
					index: index,
					item: item
				}
				record.value = response
				this.dispatchEvent(record)
			}

			// 更新目录列表
			this.unselectIn(item)
			this.onDelete?.(item)
			this.update()
			this.dispatchChangeEvent()
		}
	}

	// 迁移项目
	removeItemTo(sItem, dItem) {
		if (sItem === dItem || (this.lockDirectory && dItem === this.root)) {
			return
		}
		const sParent = sItem.parent
		if (sParent && dItem) {
			const sList = sParent.children
			const dList = dItem.children
			const sIndex = sList.indexOf(sItem)
			sList.splice(sIndex, 1)
			const dIndex = dList.length
			dList.splice(dIndex, 0, sItem)
			if (sList === dList && sIndex === dIndex) {
				return
			}
			if (dItem.expanded === false) {
				dItem.expanded = true
			}

			// 发送记录事件
			if (this.recordEventEnabled) {
				const record = new Event('record')
				const response = {
					type: 'remove',
					item: sItem,
					source: {
						parent: sParent,
						index: sIndex
					},
					destination: {
						parent: dItem,
						index: dIndex
					}
				}
				record.value = response
				this.dispatchEvent(record)
			}

			// 更新目录列表
			this.insertPaddingAndClear()
			this.update()
			this.onRemove?.(sItem)
			this.scrollToSelection()
			this.dispatchChangeEvent()
		}
	}

	// 迁移项目插入到目标前
	removeItemToInsert(sItem, dItem) {
		if (
			sItem === dItem ||
			(this.lockDirectory && dItem.parent === this.root)
		) {
			return
		}
		const sParent = sItem.parent
		const dParent = dItem.parent
		if (sParent && dParent) {
			const sList = sParent.children
			const dList = dParent.children
			const sIndex = sList.indexOf(sItem)
			sList.splice(sIndex, 1)
			const dIndex = dList.indexOf(dItem)
			dList.splice(dIndex, 0, sItem)
			if (sList === dList && sIndex === dIndex) {
				return
			}

			// 发送记录事件
			if (this.recordEventEnabled) {
				const record = new Event('record')
				const response = {
					type: 'remove',
					item: sItem,
					source: {
						parent: sParent,
						index: sIndex
					},
					destination: {
						parent: dParent,
						index: dIndex
					}
				}
				record.value = response
				this.dispatchEvent(record)
			}

			// 更新目录列表
			this.insertPaddingAndClear()
			this.update()
			this.onRemove?.(sItem)
			this.scrollToSelection()
			this.dispatchChangeEvent()
		}
	}

	// 恢复数据 - 遵循:
	// 取消选择已删除数据 > 更新列表 > 选择新插入数据
	// 的顺序来触发事件
	restore(operation, response) {
		// 处于搜索模式则清空搜索结果
		// 避免重复更新和选项位置错乱
		if (this.display === 'search') {
			this.searchResults = Array.empty
		}
		switch (response.type) {
			case 'rename': {
				const { item, oldValue, newValue } = response
				if (operation === 'undo') {
					item.name = oldValue
				} else {
					item.name = newValue
				}
				this.updateItemName(item)
				this.expandToItem(item)
				if (!this.textContent) {
					this.update()
				}
				this.select(item)
				this.scrollToSelection()
				this.dispatchChangeEvent()
				break
			}
			case 'create': {
				const { sItem, dItem, insertBefore } = response
				if (operation === 'undo') {
					const enabled = this.recordEventEnabled
					this.recordEventEnabled = false
					this.deleteNode(sItem)
					this.recordEventEnabled = enabled
				} else {
					const enabled = this.recordEventEnabled
					this.recordEventEnabled = false
					this.addNodeTo(sItem, dItem, insertBefore)
					this.recordEventEnabled = enabled
					this.onResume?.(sItem)
				}
				break
			}
			case 'delete': {
				const { items, index, item } = response
				if (operation === 'undo') {
					if (index <= items.length) {
						items.splice(index, 0, item)
						this.unselect()
						this.expandToItem(item, false)
						this.onResume?.(item)
					}
				} else {
					if (index < items.length) {
						items.splice(index, 1)
						this.unselectIn(item)
						this.onDelete?.(item)
					}
				}

				// 更新目录列表
				this.update()
				operation === 'undo' && this.select(item)
				this.scrollToSelection()
				this.dispatchChangeEvent()
				break
			}
			case 'remove': {
				const { item, source, destination } = response
				const { parent: sParent, index: sIndex } = source
				const { parent: dParent, index: dIndex } = destination
				const sList = sParent.children
				const dList = dParent.children
				if (operation === 'undo') {
					if (item.parent !== undefined) {
						item.parent = sParent
					}
					if (sIndex <= sList.length && dIndex < dList.length) {
						dList.splice(dIndex, 1)
						sList.splice(sIndex, 0, item)
						this.expandToItem(item, false)
					}
				} else {
					if (item.parent !== undefined) {
						item.parent = dParent
					}
					if (dIndex <= dList.length && sIndex < sList.length) {
						sList.splice(sIndex, 1)
						dList.splice(dIndex, 0, item)
						this.expandToItem(item, false)
					}
				}

				// 更新目录列表
				this.insertPaddingAndClear()
				this.update()
				this.select(item)
				this.onRemove?.(item)
				this.scrollToSelection()
				this.dispatchChangeEvent()
				break
			}
		}
	}

	// 打开项目
	open(item) {
		if (item && this.openEventEnabled) {
			const open = new Event('open')
			open.value = item
			this.dispatchEvent(open)
		}
	}

	// 选择项目
	select(item) {
		if (item instanceof Object && this.read() !== item) {
			this.unselect()
			this.selections.push(item)
			if (item.element !== undefined) {
				item.element.addClass('selected')
			}
			if (this.selectEventEnabled) {
				const select = new Event('select')
				select.value = this.read()
				this.dispatchEvent(select)
			}
		}
	}

	// 选择项目 - 不触发事件
	selectWithNoEvent(item) {
		const enabled = this.selectEventEnabled
		this.selectEventEnabled = false
		this.select(item)
		this.selectEventEnabled = enabled
	}

	// 取消选择
	unselect(item) {
		let selections = Array.empty
		if (item === undefined) {
			selections = this.selections
		}
		if (this.selections.includes(item)) {
			selections = [item]
		}
		if (selections.length !== 0) {
			// 提高blur事件的触发优先级
			TreeList.textBox.input.blur()
			for (const item of selections) {
				const { element } = item
				if (element !== undefined) {
					element.removeClass('selected')
				}
			}
			if (this.unselectEventEnabled) {
				const select = new Event('unselect')
				select.value = selections
				this.dispatchEvent(select)
			}
			this.selections = []
		}
	}

	// 取消范围内的选择 - 已修改未测试
	unselectIn(item) {
		const targets = []
		for (let target of this.selections) {
			let node = target
			while (node) {
				if (node === item) {
					targets.push(target)
					break
				}
				node = node.parent
			}
		}
		for (const target of targets) {
			this.unselect(target)
		}
	}

	// 选择相对位置的项目
	selectRelative(direction) {
		const elements = this.elements
		const count = elements.count
		if (count > 0) {
			let index = -1
			const last = count - 1
			const selection = this.read()
			if (selection) {
				index = elements.indexOf(selection.element)
			}
			switch (direction) {
				case 'up':
					if (index !== -1) {
						index = Math.max(index - 1, 0)
					} else {
						index = last
					}
					break
				case 'down':
					if (index !== -1) {
						index = Math.min(index + 1, last)
					} else {
						index = 0
					}
					break
			}
			this.select(elements[index]?.item)
			this.scrollToSelection()
		}
	}

	// 展开选中项
	expandSelection() {
		const item = this.read()
		if (
			item !== null &&
			item.expanded !== undefined &&
			item.element !== undefined
		) {
			item.expanded = !item.expanded
			this.update()
			this.dispatchChangeEvent()
		}
	}

	// 展开到选中项
	expandToSelection(update = true) {
		const item = this.read()
		if (item !== null) {
			this.expandToItem(item, update)
		}
	}

	// 展开到指定项目
	expandToItem(item, update = true) {
		item = item.parent
		if (!item) return
		let changed = false
		while (item.expanded !== undefined) {
			if (!item.expanded) {
				item.expanded = true
				changed = true
			}
			item = item.parent
		}
		if (changed && update) {
			this.update()
			this.dispatchChangeEvent()
		}
	}

	// 滚动到选中项
	scrollToSelection(mode = 'active') {
		const selection = this.read()
		if (selection && this.hasScrollBar()) {
			const elements = this.elements
			const count = elements.count
			for (let i = 0; i < count; i++) {
				const { item } = elements[i]
				if (item === selection) {
					let scrollTop
					switch (mode) {
						case 'active':
							scrollTop = Math.clamp(
								this.scrollTop,
								i * 20 + 20 - this.innerHeight,
								i * 20
							)
							break
						case 'middle':
							scrollTop =
								Math.round(
									(i * 20 + 10 - this.innerHeight / 2) / 20
								) * 20
							break
						default:
							return
					}
					if (this.scrollTop !== scrollTop) {
						this.scrollTop = scrollTop
					}
					break
				}
			}
		}
	}

	// 列表扩展方法 - 滚动到头部
	scrollToHome() {
		const element = this.elements[0]
		if (element instanceof HTMLElement) {
			this.select(element.item)
		}
		this.scroll(0, 0)
	}

	// 列表扩展方法 - 滚动到尾部
	scrollToEnd() {
		const elements = this.elements
		const index = elements.count - 1
		const element = elements[index]
		if (element instanceof HTMLElement) {
			this.select(element.item)
		}
		this.scroll(0, this.scrollHeight)
	}

	// 列表扩展方法 - 向上翻页
	pageUp(select) {
		const scrollLines = Math.floor(this.clientHeight / 20) - 1
		if (select) {
			const bottom = this.scrollTop + this.clientHeight
			const bottomIndex = Math.floor(bottom / 20) - 1
			let index = this.getElementIndexOfSelection(Infinity)
			index = Math.min(index, bottomIndex) - scrollLines
			index = Math.max(index, 0)
			this.select(this.elements[index]?.item)
		}
		this.scrollBy(0, -scrollLines * 20)
	}

	// 列表扩展方法 - 向下翻页
	pageDown(select) {
		const scrollLines = Math.floor(this.clientHeight / 20) - 1
		if (select) {
			const count = this.elements.count
			const topIndex = Math.floor(this.scrollTop / 20)
			let index = this.getElementIndexOfSelection(0)
			index = Math.max(index, topIndex) + scrollLines
			index = Math.min(index, count - 1)
			this.select(this.elements[index]?.item)
		}
		this.scrollBy(0, +scrollLines * 20)
	}

	// 列表扩展方法 - 获取选中项的元素索引
	getElementIndexOfSelection(defIndex) {
		const item = this.read()
		return item ? this.elements.indexOf(item.element) : defIndex
	}

	// 重命名
	rename(item) {
		if (this.renamable) {
			const { element } = item
			const { textBox } = TreeList
			if (
				document.activeElement === this &&
				!textBox.parentNode &&
				element.parentNode
			) {
				const nodes = []
				const { folderMark, nodeIcon } = element
				for (const node of element.childNodes) {
					if (
						node instanceof HTMLElement &&
						node !== folderMark &&
						node !== nodeIcon &&
						node.addClass('hidden')
					) {
						nodes.push(node)
					}
				}
				textBox.lastText = element.textNode.nodeValue
				element.textNode.nodeValue = ''
				element.appendChild(textBox)
				textBox.hiddenNodes = nodes
				textBox.write(item.name)
				textBox.getFocus('all')
				textBox.fitContent()
			}
		}
	}

	// 取消重命名
	cancelRenaming() {
		const { timer } = this
		if (timer.target) {
			timer.target = null
		}
		if (timer.running) {
			timer.running = false
			timer.remove()
		}
	}

	// 插入填充元素并且清除其他元素
	insertPaddingAndClear() {
		const padding = TreeList.padding
		let count = this.elements.count
		if (this.padded) count++
		if (padding.count !== count) {
			padding.count = count
			padding.style.height = `${count * 20}px`
		}
		// 临时插入填充元素用来保存垂直滚动位置
		// 兼容列表不存在元素的情况
		const head = this.childNodes[0]
		this.insertBefore(padding, head)
		// 清除其他元素
		const { childNodes } = this
		const { length } = childNodes
		for (let i = length - 1; i > 0; i--) {
			childNodes[i].remove()
		}
	}

	// 清除元素
	clearElements(start) {
		return CommonList.clearElements(this, start)
	}

	// 清除列表
	clear() {
		if (this.display === 'search') {
			this.display = 'normal'
			this.keyword = null
			this.searchResults = []
		}
		this.unselect()
		this.textContent = ''
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'select':
				this.selectEventEnabled = true
				break
			case 'unselect':
				this.unselectEventEnabled = true
				break
			case 'record':
				this.recordEventEnabled = true
				break
			case 'popup':
				this.popupEventEnabled = true
				break
			case 'open':
				this.openEventEnabled = true
				break
			case 'update':
				this.updateEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (!this.data) {
			return
		}
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
				default:
					return
			}
			event.stopImmediatePropagation()
		} else if (event.altKey) {
			return
		} else {
			switch (event.code) {
				case 'Enter':
				case 'NumpadEnter': {
					const item = this.read()
					if (item) {
						// 阻止默认事件是因为：
						// 插入全局变量标签时默认接着输入换行符
						event.preventDefault()
						event.stopPropagation()
						this.open(item)
					}
					break
				}
				case 'Space':
					event.preventDefault()
					return
				case 'ArrowRight':
					event.preventDefault()
					this.expandSelection()
					break
				case 'ArrowUp':
					event.preventDefault()
					this.selectRelative('up')
					break
				case 'ArrowDown':
					event.preventDefault()
					this.selectRelative('down')
					break
				case 'F2': {
					const item = this.read()
					if (item) {
						this.cancelRenaming()
						this.rename(item)
					}
					break
				}
				default:
					return
			}
			event.stopImmediatePropagation()
		}
	}

	// 指针按下事件
	pointerdown(event) {
		// 拖拽列表项进行滚动时释放拖拽状态
		// 可能在列表项动态刷新时不触发dragend事件
		this.dragend()
		this.cancelRenaming()
		switch (event.button) {
			case 0: {
				const element = event.target
				if (element.tagName === 'FOLDER-MARK') {
					// 阻止拖拽开始事件
					event.preventDefault()
					const { item } = element.parentNode
					item.expanded = !item.expanded
					this.update()
					this.dispatchChangeEvent()
				} else {
					if (element.tagName === 'NODE-ITEM') {
						if (!element.hasClass('selected')) {
							this.select(element.item)
						} else if (
							this.renamable &&
							Menu.state === 'closed' &&
							document.activeElement === this &&
							event.clientX >
								(element.nodeIcon?.rect().right ?? 0)
						) {
							this.timer.target = event.target
						}
					}
				}
				break
			}
			case 2: {
				const element = event.target.seek('node-item')
				if (
					element.tagName === 'NODE-ITEM' &&
					!element.hasClass('selected')
				) {
					this.select(element.item)
				}
				break
			}
		}
	}

	// 指针弹起事件
	pointerup(event) {
		if (this.dragging || !this.data) {
			return
		}
		switch (event.button) {
			case 0:
				if (
					document.activeElement === this &&
					this.timer.target === event.target
				) {
					this.timer.running = true
					this.timer.elapsed = 0
					this.timer.add()
				}
				break
			case 2:
				if (this.popupEventEnabled && document.activeElement === this) {
					const element = event.target.seek('node-item')
					if (
						element.tagName === 'NODE-ITEM' &&
						element.hasClass('selected')
					) {
						const popup = new Event('popup')
						popup.value = element.item
						popup.clientX = event.clientX
						popup.clientY = event.clientY
						this.dispatchEvent(popup)
					} else {
						const popup = new Event('popup')
						popup.value = null
						popup.clientX = event.clientX
						popup.clientY = event.clientY
						this.dispatchEvent(popup)
					}
				}
				break
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		const element = event.target
		if (element.tagName === 'NODE-ITEM') {
			this.cancelRenaming()
			const item = element.item
			if (item.class === 'folder') {
				item.expanded = !item.expanded
				this.update()
				this.dispatchChangeEvent()
			} else {
				this.open(item)
			}
		}
	}

	// 拖拽开始事件
	dragstart(event) {
		if (
			this.removable &&
			!this.dragging &&
			this.display === 'normal' &&
			this.read() !== null &&
			!TreeList.textBox.parentNode &&
			(this.lockDirectory === false || this.read().class !== 'folder')
		) {
			this.dragging = event
			Object.defineProperty(event, 'offsetY', { writable: true })
			event.preventDefault = Function.empty
			event.dataTransfer.hideDragImage()
			event.hint = document.createElement('drag-and-drop-hint')
			event.hint.addClass('for-list')
			this.parentNode.insertBefore(event.hint.hide(), this)
			this.addClass('dragging')
			this.on('dragenter', this.dragenter)
			this.on('dragleave', this.dragleave)
			this.on('dragover', this.dragover)
			this.on('drop', this.drop)
		}
	}

	// 拖拽结束事件
	dragend(event) {
		if (this.dragging) {
			this.removeClass('dragging')
			this.dragging.hint.target?.removeClass('hint')
			this.parentNode.removeChild(this.dragging.hint)
			this.dragging = null
			this.off('dragenter', this.dragenter)
			this.off('dragleave', this.dragleave)
			this.off('dragover', this.dragover)
			this.off('drop', this.drop)
		}
	}

	// 拖拽进入事件
	dragenter(event) {
		if (this.dragging) {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
		}
	}

	// 拖拽离开事件
	dragleave(event) {
		if (this.dragging && !this.contains(event.relatedTarget)) {
			this.dragging.offsetY = -1
			this.dragging.hint.hide()
		}
	}

	// 拖拽悬停事件
	dragover(event) {
		const { dragging } = this
		if (dragging) {
			event.preventDefault()
			event.dataTransfer.dropEffect = 'move'
			if (dragging.offsetY === event.offsetY) {
				return
			}
			dragging.offsetY = event.offsetY
			const element = event.target.seek('node-item')
			// hint在文件夹上拖拽滚动时可能溢出显示
			const hint = dragging.hint.show()
			if (element.tagName === 'NODE-ITEM') {
				const sItem = dragging.target.item
				const dItem = element.item
				if (this.contain(sItem, dItem)) {
					return hint.hide()
				}
				const offsetY = event.offsetY
				const position = dItem.children
					? offsetY < 4
						? 'before'
						: offsetY < 16
							? 'into'
							: 'after'
					: offsetY < 10
						? 'before'
						: 'after'
				switch (position) {
					case 'into':
						if (
							hint.target !== element ||
							hint.position !== position
						) {
							const rect = hint.measure(element)
							hint.target?.removeClass('hint')
							hint.target = element
							hint.position = position
							hint.moveDown().set(rect)
							element.addClass('hint')
						}
						break
					case 'before':
						if (
							hint.target !== element ||
							hint.position !== position
						) {
							const rect = hint.measure(element)
							rect.top -= 1
							rect.height = 2
							hint.target?.removeClass('hint')
							hint.target = element
							hint.position = position
							hint.moveUp().set(rect)
						}
						break
					case 'after':
						if (
							hint.target !== element ||
							hint.position !== position
						) {
							const rect = hint.measure(element)
							rect.top += rect.height - 1
							rect.height = 2
							hint.target?.removeClass('hint')
							hint.target = element
							hint.position = position
							hint.moveUp().set(rect)
						}
						break
				}
			} else {
				const elements = this.elements
				const index = elements.count - 1
				const element = elements[index]
				if (
					element !== undefined &&
					(hint.target !== element || hint.position !== 'append')
				) {
					const rect = hint.measure(element)
					rect.top += rect.height - 1
					rect.height = 2
					hint.target?.removeClass('hint')
					hint.target = element
					hint.position = 'append'
					hint.moveUp().set(rect)
				}
			}
		}
	}

	// 拖拽释放事件
	drop(event) {
		const { dragging } = this
		if (!dragging) {
			return
		}
		event.stopPropagation()
		const hint = dragging.hint
		if (!hint.hasClass('hidden')) {
			const sItem = dragging.target.item
			const dItem = hint.target.item
			if (hint.position !== 'append' && this.contain(sItem, dItem)) {
				return
			}
			switch (hint.position) {
				case 'into':
					this.removeItemTo(sItem, dItem)
					break
				case 'before':
					this.removeItemToInsert(sItem, dItem)
					break
				case 'after':
				case 'append': {
					const elements = this.elements
					const index = elements.indexOf(hint.target)
					const next = elements[index + 1]?.item
					if (next) {
						this.removeItemToInsert(sItem, next)
					} else {
						this.removeItemTo(sItem, this.root)
					}
					break
				}
			}
		}

		// 创建项目后不能触发拖拽结束事件
		this.dragend()
	}

	// 数据改变事件
	dataChange(event) {
		if (this.display === 'search') {
			this.searchNodes(this.keyword)
		}
	}

	// 静态 - 列表填充元素
	static padding = (function IIFE() {
		const padding = document.createElement('box')
		padding.style.display = 'block'
		padding.style.width = '1px'
		return padding
	})()

	// 静态 - 创建节点父对象
	static createParents = (function IIFE() {
		const descriptor = {
			configurable: true,
			writable: true,
			value: null
		}
		const createParents = (items, parent) => {
			const length = items.length
			for (let i = 0; i < length; i++) {
				const item = items[i]
				if (item.parent === undefined) {
					Object.defineProperty(item, 'parent', descriptor)
				}
				item.parent = parent
				const { children } = item
				if (children?.length > 0) {
					createParents(children, item)
				}
			}
		}
		return function (items, parent) {
			createParents(items, parent)
		}
	})()

	// 静态 - 删除数据缓存
	static deleteCaches = (function IIFE() {
		const uninstall = (items) => {
			for (const item of items) {
				delete item.element
				delete item.parent
				if (item.children !== undefined) {
					uninstall(item.children)
				}
			}
		}
		return function (data) {
			uninstall(data)
			delete data.initialized
		}
	})()

	// 静态 - 文本输入框
	static textBox = (function IIFE() {
		const textBox = new TextBox()
		textBox.addClass('node-list-text-box')
		textBox.input.addClass('node-list-text-box-input')

		// 键盘按下事件
		textBox.on('keydown', function (event) {
			event.stopPropagation()
			switch (event.code) {
				case 'Enter':
				case 'NumpadEnter':
				case 'Escape': {
					const item = this.parentNode
					const list = item.parentNode
					this.input.blur()
					list.focus()
					break
				}
			}
		})

		// 输入事件
		textBox.on('input', function (event) {
			this.fitContent()
		})

		// 选择事件
		textBox.on('select', function (event) {
			event.stopPropagation()
		})

		// 改变事件
		textBox.on('change', function (event) {
			event.stopPropagation()
		})

		// 失去焦点事件
		textBox.on('blur', function (event) {
			const element = this.parentNode
			const list = element.parentNode
			const item = element.item
			const name = this.read().trim()
			for (const node of this.hiddenNodes) {
				node.removeClass('hidden')
			}
			this.hiddenNodes = null
			this.remove()
			const last = item.name
			if (last !== name) {
				item.name = name
				list.updateItemName(item)
				if (list.recordEventEnabled) {
					const record = new Event('record')
					const response = {
						type: 'rename',
						item: item,
						oldValue: last,
						newValue: name
					}
					record.value = response
					list.dispatchEvent(record)
				}
				list.dispatchChangeEvent()
			} else {
				element.textNode.nodeValue = this.lastText
			}
		})

		return textBox
	})()
}

customElements.define('node-list', TreeList)

// ******************************** 拖放提示 ********************************

class DragAndDropHint extends HTMLElement {
	left //:number
	top //:number
	width //:number
	height //:number
	upper //:boolean

	constructor() {
		super()

		// 设置属性
		this.left = 0
		this.top = 0
		this.width = 0
		this.height = 0
	}

	// 测量位置
	measure(item) {
		const parent = this.parentNode
		let bl = parent.borderLeft
		let bt = parent.borderTop
		if (bl === undefined) {
			const css = parent.css()
			bl = parseInt(css.borderLeftWidth)
			bt = parseInt(css.borderTopWidth)
			parent.borderLeft = bl
			parent.borderTop = bt
		}
		const pRect = parent.rect()
		const tRect = item.rect()
		const left = tRect.left - pRect.left - bl
		const top = tRect.top - pRect.top - bt
		const width = tRect.width
		const height = tRect.height
		return { left, top, width, height }
	}

	// 向上移动
	moveUp() {
		if (!this.upper) {
			this.upper = true
			this.style.zIndex = '1'
		}
		return this
	}

	// 向下移动
	moveDown() {
		if (this.upper) {
			this.upper = false
			this.style.zIndex = ''
		}
		return this
	}

	// 设置位置
	set({ left, top, width, height }) {
		if (
			this.left !== left ||
			this.top !== top ||
			this.width !== width ||
			this.height !== height
		) {
			this.left = left
			this.top = top
			this.width = width
			this.height = height
			this.style.left = `${left}px`
			this.style.top = `${top}px`
			this.style.width = `${width}px`
			this.style.height = `${height}px`
		}
	}
}

customElements.define('drag-and-drop-hint', DragAndDropHint)

// ******************************** 普通列表 ********************************

class CommonList extends HTMLElement {
	elements //:array
	selection //:element
	writeEventEnabled //:boolean
	selectEventEnabled //:boolean
	popupEventEnabled //:boolean

	constructor() {
		super()

		// 设置属性
		this.tabIndex = 0
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.selection = null
		this.writeEventEnabled = false
		this.selectEventEnabled = false
		this.popupEventEnabled = false
		this.listenDraggingScrollbarEvent()

		// 侦听事件
		this.on('scroll', this.scroll)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
	}

	// 读取数据
	read() {
		return this.selection?.dataValue
	}

	// 写入数据
	write(value) {
		const elements = this.elements
		const count = elements.count
		if (count !== 0) {
			this.unselect()
			let index = 0
			let target = elements[index]
			for (let i = 0; i < count; i++) {
				if (elements[i].dataValue === value) {
					target = elements[(index = i)]
					break
				}
			}
			target.addClass('selected')
			this.selection = target
			this.scrollToItem(index)
			if (this.writeEventEnabled) {
				const write = new Event('write')
				write.value = target.dataValue
				this.dispatchEvent(write)
			}
		}
	}

	// 重新装填
	reload() {
		const { elements } = this
		elements.start = -1
		elements.count = 0
		return this
	}

	// 添加元素
	appendElement(element) {
		const { elements } = this
		elements[elements.count++] = element
	}

	// 更新列表
	update() {
		// 清除多余的元素
		this.clearElements(this.elements.count)

		// 重新调整
		this.resize()
	}

	// 重新调整
	resize() {
		return CommonList.resize(this)
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize() {}

	// 选择项目
	select(element) {
		if (element instanceof HTMLElement && this.selection !== element) {
			this.write(element.dataValue)
			if (this.selectEventEnabled) {
				const select = new Event('select')
				select.value = element.dataValue
				this.dispatchEvent(select)
			}
		}
	}

	// 取消选择
	unselect() {
		if (this.selection) {
			this.selection.removeClass('selected')
			this.selection = null
		}
	}

	// 滚动到项目
	scrollToItem(index) {
		const scrollTop = Math.clamp(
			this.scrollTop,
			index * 20 + 20 - this.innerHeight,
			index * 20
		)
		if (this.scrollTop !== scrollTop) {
			this.scrollTop = scrollTop
		}
	}

	// 选择相对位置的项目
	selectRelative(direction) {
		const elements = this.elements
		const count = elements.count
		if (count > 0) {
			let index = -1
			const last = count - 1
			const { selection } = this
			if (selection) {
				index = elements.indexOf(selection)
			}
			switch (direction) {
				case 'up':
					if (index !== -1) {
						index = Math.max(index - 1, 0)
					} else {
						index = last
					}
					break
				case 'down':
					if (index !== -1) {
						index = Math.min(index + 1, last)
					} else {
						index = 0
					}
					break
			}
			this.select(elements[index])
		}
	}

	// 清除元素
	clearElements(start) {
		return CommonList.clearElements(this, start)
	}

	// 清除列表
	clear() {
		this.unselect()
		this.textContent = ''
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'write':
				this.writeEventEnabled = true
				break
			case 'select':
				this.selectEventEnabled = true
				break
			case 'popup':
				this.popupEventEnabled = true
				break
		}
	}

	// 滚动事件
	scroll(event) {
		// 可调用重写的resize
		return this.resize()
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
			}
		} else if (event.altKey) {
			return
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault()
					return
				case 'ArrowUp':
					event.preventDefault()
					this.selectRelative('up')
					break
				case 'ArrowDown':
					event.preventDefault()
					this.selectRelative('down')
					break
			}
		}
	}

	// 指针按下事件
	pointerdown(event) {
		switch (event.button) {
			case 0:
			case 2: {
				const element = event.target
				if (
					element.tagName === 'COMMON-ITEM' &&
					!element.hasClass('selected')
				) {
					this.select(element)
				}
				break
			}
		}
	}

	// 指针弹起事件
	pointerup(event) {
		switch (event.button) {
			case 2:
				if (this.popupEventEnabled && document.activeElement === this) {
					const element = event.target.seek('common-item')
					if (
						element.tagName === 'COMMON-ITEM' &&
						element.hasClass('selected')
					) {
						const popup = new Event('popup')
						popup.value = element.dataValue
						popup.clientX = event.clientX
						popup.clientY = event.clientY
						this.dispatchEvent(popup)
					} else {
						const popup = new Event('popup')
						popup.value = null
						popup.clientX = event.clientX
						popup.clientY = event.clientY
						this.dispatchEvent(popup)
					}
				}
				break
		}
	}

	// 静态 - 重新调整
	static resize = (self) => {
		const st = self.scrollTop
		const ch = self.innerHeight
		const elements = self.elements
		const count = elements.count
		if (ch === 0) {
			return
		}
		if (count === 0) {
			self.textContent = ''
			return
		}
		const start = Math.min(Math.floor(st / 20), count - 1)
		const length = Math.ceil(ch / 20) + 1
		const end = Math.min(start + length, count)
		if (elements.start !== start || elements.end !== end) {
			elements.start = start
			elements.end = end
			self.updateHeadAndFoot()
			const versionId = elements.versionId++
			for (let i = start; i < end; i++) {
				const element = elements[i]
				element.versionId = versionId
				self.updateOnResize(element)
			}
			const nodes = self.childNodes
			const last = nodes.length - 1
			for (let i = last; i >= 0; i--) {
				const element = nodes[i]
				if (element.versionId !== versionId) {
					element.remove()
				}
			}
			// 保证尾部元素已经被添加
			if (!elements.foot.parentNode) {
				self.appendChild(elements.foot)
			}
			for (let i = end - 2; i >= start; i--) {
				const element = elements[i]
				if (element.parentNode === null) {
					const next = elements[i + 1]
					self.insertBefore(element, next)
				}
			}
		}
	}

	// 静态 - 更新头部和尾部元素
	static updateHeadAndFoot = (self) => {
		const { elements } = self
		if (elements.head) {
			elements.head.style.marginTop = ''
			elements.head = null
		}
		if (elements.foot) {
			elements.foot.style.marginBottom = ''
			elements.foot = null
		}
		// 设置头部和尾部元素的外边距
		const { count, start, end } = elements
		if (count !== 0) {
			const pad = self.padded ? 1 : 0
			const mt = start * 20
			const mb = (count - end + pad) * 20
			elements.head = elements[start]
			elements.head.style.marginTop = `${mt}px`
			elements.foot = elements[end - 1]
			elements.foot.style.marginBottom = `${mb}px`
		}
	}

	// 静态 - 清除元素
	static clearElements(self, start) {
		let i = start
		const { elements } = self
		while (elements[i] !== undefined) {
			elements[i++] = undefined
		}
	}
}

customElements.define('common-list', CommonList)

// ******************************** 参数操作历史 ********************************

class ParamHistory {
	list //:element
	stack //:array
	index //:number

	constructor(list) {
		this.list = list
		this.stack = []
		this.index = -1
	}

	// 重置历史
	reset() {
		if (this.stack.length !== 0) {
			this.stack = []
			this.index = -1
		}
	}

	// 保存数据
	save(data) {
		// 删除多余的栈
		const stack = this.stack
		const length = this.index + 1
		if (length < stack.length) {
			stack.length = length
		}

		// 堆栈上限: 100
		if (stack.length < 100) {
			this.index++
			stack.push(data)
		} else {
			stack.shift()
			stack.push(data)
		}
	}

	// 恢复数据
	restore(operation) {
		const index =
			operation === 'undo'
				? this.index
				: operation === 'redo'
					? this.index + 1
					: null

		if (index >= 0 && index < this.stack.length) {
			const list = this.list
			const data = this.stack[index]
			const type = data.type
			ParamHistory.restore(list, data, type, operation)

			// 改变指针
			switch (operation) {
				case 'undo':
					this.index--
					break
				case 'redo':
					this.index++
					break
			}
		}
	}

	// 撤销条件判断
	canUndo() {
		return this.index >= 0
	}

	// 重做条件判断
	canRedo() {
		return this.index + 1 < this.stack.length
	}

	// 静态 - 恢复数据
	static restore(list, data, type, operation) {
		const loaded = list.data === data.array
		switch (type) {
			case 'insert': {
				const { array, index, items } = data
				const length = items.length
				if (operation === 'undo') {
					if (index + length <= array.length) {
						array.splice(index, length)
						if (loaded) {
							list.update()
							list.select(index)
						}
					}
				} else {
					if (index <= array.length) {
						array.splice(index, 0, ...items)
						if (loaded) {
							list.update()
							list.select(index, index + length - 1)
						}
					}
				}
				break
			}
			case 'replace': {
				const { array, index, swap } = data
				if (operation === 'undo') {
					if (index < array.length) {
						data.swap = array[index]
						array[index] = swap
						if (loaded) {
							list.update()
							list.select(index)
						}
					}
				} else {
					if (index < array.length) {
						data.swap = array[index]
						array[index] = swap
						if (loaded) {
							list.update()
							list.select(index)
						}
					}
				}
				break
			}
			case 'delete': {
				const { array, index, items } = data
				const length = items.length
				if (operation === 'undo') {
					if (index <= array.length) {
						array.splice(index, 0, ...items)
						if (loaded) {
							list.update()
							list.select(index, index + length - 1)
						}
					}
				} else {
					if (index + length <= array.length) {
						array.splice(index, length)
						if (loaded) {
							list.update()
							list.select(index)
						}
					}
				}
				break
			}
			case 'toggle': {
				const { array, method, items } = data
				if (
					(operation === 'undo' && method === 'disable') ||
					(operation === 'redo' && method === 'enable')
				) {
					list.enableItems(items)
				} else {
					list.disableItems(items)
				}
				const length = items.length
				const sItem = items[0]
				const eItem = items[length - 1]
				list.update()
				list.select(array.indexOf(sItem), array.indexOf(eItem))
				break
			}
		}
		if (loaded) {
			list.scrollToSelection()
			list.dispatchChangeEvent()
		}
	}
}

// ******************************** 参数列表 ********************************

class ParamList extends HTMLElement {
	object //:object
	type //:string
	data //:array
	elements //:array
	selections //:array
	start //:number
	end //:number
	origin //:number
	active //:number
	flexible //:boolean
	inserting //:boolean
	focusing //:boolean
	dragging //:event
	history //:object
	togglable //:boolean
	windowPointerup //:function
	windowPointermove //:function

	constructor() {
		super()

		// 设置属性
		this.tabIndex = 0
		this.object = null
		this.type = null
		this.data = null
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.selections = []
		this.selections.count = 0
		this.start = null
		this.end = null
		this.origin = null
		this.active = null
		this.flexible = this.hasAttribute('flexible')
		this.inserting = false
		this.focusing = false
		this.dragging = null
		this.history = null
		this.togglable = false
		this.windowPointerup = ParamList.windowPointerup.bind(this)
		this.windowPointermove = ParamList.windowPointermove.bind(this)
		this.listenDraggingScrollbarEvent()

		// 侦听事件
		this.on('scroll', this.resize)
		this.on('focus', this.listFocus)
		this.on('blur', this.listBlur)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
		this.on('doubleclick', this.doubleclick)
	}

	// 获取内部高度
	get innerHeight() {
		// 避免细节框折叠时无法更新列表项(假设细节框列表都是弹性的)
		return this.flexible ? this.height : super.innerHeight
	}

	// 读取上边距
	get paddingTop() {
		let pt = this._paddingTop
		if (pt === undefined) {
			pt = this._paddingTop = parseInt(this.css().paddingTop)
		}
		return pt
	}

	// 绑定数据
	bind(object) {
		object.initialize(this)
		object.initialize = Function.empty
		this.object = object
		this.type = `yami.${object.type ?? this.id}`
		this.history = object.history ?? new ParamHistory(this)
		return this
	}

	// 读取数据
	read() {
		return this.data
	}

	// 写入数据
	write(data) {
		if (this.flexible) {
			this.autoSwitch = true
		}
		this.data = data
		this.update()
		this.history.reset()
		// Promise.resolve().then(() => {
		//   this.scrollTop = 0
		// })
	}

	// 更新列表
	update() {
		// 检查器的参数列表在历史操作
		// 刷新列表时可能没有加载数据
		const { data } = this
		if (!data) return
		const { elements } = this
		elements.start = -1
		elements.count = 0

		// 创建列表项目
		const object = this.object
		const length = data.length
		for (let i = 0; i < length; i++) {
			const item = data[i]
			const result = object.parse(item, data, i)
			switch (typeof result) {
				case 'string': {
					const li = document.createElement('param-item')
					li.addClass('one-column')
					li.dataValue = i
					li.dataItem = item
					li.textContent = result
					elements[elements.count++] = li
					continue
				}
				case 'object': {
					const li = document.createElement('param-item')
					li.dataValue = i
					li.dataItem = item
					elements[elements.count++] = li
					if (!Array.isArray(result)) {
						li.addClass('one-column')
						li.textContent = result.content
						if (result.class) {
							li.addClass(result.class)
						}
						continue
					}

					// 创建文本 0
					const [result0, result1] = result
					if (result0 instanceof HTMLElement) {
						li.appendChild(result0)
					} else if (result0 instanceof Object) {
						const text0 = document.createElement('text')
						text0.addClass('text-0-of-2')
						text0.textContent = result0.content
						if (result0.class) {
							text0.addClass(result0.class)
						}
						li.appendChild(text0)
					} else {
						const text0 = document.createElement('text')
						text0.addClass('text-0-of-2')
						text0.textContent = result0
						li.appendChild(text0)
					}

					// 创建文本 1
					if (result1 instanceof HTMLElement) {
						li.appendChild(result1)
					} else if (result1 instanceof Object) {
						const text1 = document.createElement('text')
						text1.addClass('text-1-of-2')
						text1.textContent = result1.content
						if (result1.class) {
							text1.addClass(result1.class)
						}
						li.appendChild(text1)
					} else {
						const text1 = document.createElement('text')
						text1.addClass('text-1-of-2')
						text1.textContent = result1
						li.appendChild(text1)
					}
					continue
				}
			}
		}

		// 创建空项目
		const li = document.createElement('param-item')
		const unit = length === 1 ? 'item' : 'items'
		li.addClass('weak')
		li.dataValue = length
		li.dataItem = null
		li.textContent = `${length} ${unit}`
		elements[elements.count++] = li

		// 清除多余的元素
		this.clearElements(elements.count)

		// 更新弹性高度
		this.updateFlexibleHeight()

		// 发送更新事件
		object.update?.(this)

		// 重新调整
		this.resize()
	}

	// 重新调整
	resize() {
		return CommonList.resize(this)
	}

	// 更新弹性高度
	updateFlexibleHeight() {
		if (this.flexible) {
			const count = this.elements.count
			const height = Math.min(count * 20, 500) + 2
			if (this.height !== height) {
				this.height = height
				this.style.height = `${height}px`
			}
			// 自动开关细节框(一次)
			if (this.autoSwitch) {
				this.autoSwitch = false
				const detailBox = this.parentNode
				if (detailBox instanceof DetailBox) {
					if (count !== 1) {
						detailBox.open()
					} else {
						detailBox.close()
					}
				}
			}
		}
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize() {}

	// 选择项目
	select(start, end = start) {
		if (start > end) {
			;[start, end] = [end, start]
		}

		// 限制范围
		const elements = this.elements
		const count = elements.count
		start = Math.clamp(start, 0, count - 1)
		end = Math.clamp(end, 0, count - 1)
		if (start !== end) {
			const element = elements[end]
			if (!element.dataItem) {
				end--
			}
		}

		// 取消选择
		this.unselect()

		// 更新属性
		this.start = start
		this.end = end
		this.origin = start
		this.active = start

		// 选择目标
		this.reselect()
	}

	// 选择多个项目
	selectMultiple(active) {
		const origin = this.origin
		this.select(origin, active)
		this.origin = origin
		this.active = Math.clamp(active, this.start, this.end)
	}

	// 选择全部项目
	selectAll() {
		this.select(0, Infinity)
		this.active = this.end
	}

	// 取消选择
	unselect() {
		if (this.start !== null) {
			const { selections } = this
			const { count } = selections
			for (let i = 0; i < count; i++) {
				selections[i].removeClass('selected')
				selections[i] = undefined
			}
			selections.count = 0
			if (count > 256) {
				selections.length = 0
			}
		}
	}

	// 重新选择
	reselect() {
		if (this.focusing && this.start !== null) {
			const { selections } = this
			const elements = this.elements
			const start = this.start
			const end = this.end
			let count = 0
			for (let i = start; i <= end; i++) {
				const element = elements[i]
				selections[count++] = element
				element.addClass('selected')
			}
			selections.count = count
		}
	}

	// 向上选择项目
	selectUp() {
		if (this.start !== null) {
			let index = this.start
			if (index === this.end) {
				index--
			}
			this.select(index)
			this.scrollToSelection()
		}
	}

	// 向下选择项目
	selectDown() {
		if (this.start !== null) {
			let index = this.end
			if (index === this.start) {
				index++
			}
			this.select(index)
			this.scrollToSelection()
		}
	}

	// 向上选择多个项目
	selectMultipleUp() {
		if (this.start !== null) {
			const i = this.active - 1
			if (i >= 0) {
				this.selectMultiple(i)
			}
			this.scrollToSelection()
		}
	}

	// 向下选择多个项目
	selectMultipleDown() {
		if (this.start !== null) {
			const elements = this.elements
			const count = elements.count
			const origin = this.origin
			const i = this.active + 1
			if (i < count - 1 || i === origin) {
				this.selectMultiple(i)
			}
			this.scrollToSelection()
		}
	}

	// 滚动到选中项
	scrollToSelection() {
		if (this.start !== null) {
			const scrollTop = Math.clamp(
				this.scrollTop,
				this.active * 20 + 20 - this.innerHeight,
				this.active * 20
			)
			if (this.scrollTop !== scrollTop) {
				this.scrollTop = scrollTop
			}
		}
	}

	// 插入项目
	insert() {
		if (this.start !== null) {
			this.inserting = true
			this.object.target = this
			this.object.open()
		}
	}

	// 编辑项目
	edit() {
		if (this.start !== null) {
			const elements = this.elements
			const element = elements[this.start]
			this.inserting = element.dataItem === null
			switch (this.inserting) {
				case true:
					this.object.target = this
					this.object.open()
					break
				case false:
					this.object.target = this
					this.object.open(this.data[this.start])
					break
			}
		}
	}

	// 开关项目
	toggle() {
		if (this.togglable && this.start !== null) {
			let method = 'disable'
			const items = []
			const { data, start, end } = this
			for (let i = start; i <= end; i++) {
				const item = data[i]
				if (item) {
					switch (method) {
						case 'disable':
							if (!item.enabled) {
								method = 'enable'
								items.length = 0
							}
							items.push(item)
							continue
						case 'enable':
							if (!item.enabled) {
								items.push(item)
							}
							continue
					}
				}
			}
			if (items.length !== 0) {
				this.history.save({
					type: 'toggle',
					array: data,
					method: method,
					items: items
				})
				switch (method) {
					case 'enable':
						this.enableItems(items)
						break
					case 'disable':
						this.disableItems(items)
						break
				}
				this.update()
				this.reselect()
				this.dispatchChangeEvent()
			}
		}
	}

	// 启用项目
	enableItems(items) {
		for (const item of items) {
			item.enabled = true
		}
	}

	// 禁用项目
	disableItems(items) {
		for (const item of items) {
			item.enabled = false
		}
	}

	// 复制项目
	copy() {
		if (this.start !== null) {
			const data = this.data
			const start = this.start
			const end = this.end + 1
			const copies = data.slice(start, end)
			if (copies.length > 0) {
				Clipboard.write(this.type, copies)
			}
		}
	}

	// 粘贴项目
	paste() {
		if (this.start !== null) {
			const copies = Clipboard.read(this.type)
			if (copies) {
				const data = this.data
				const start = this.start
				this.history.save({
					type: 'insert',
					array: data,
					index: start,
					items: copies
				})
				this.object.onPaste?.(this, copies)
				data.splice(start, 0, ...copies)
				this.update()
				this.select(start + copies.length)
				this.scrollToSelection()
				this.dispatchChangeEvent()
			}
		}
	}

	// 删除项目
	delete() {
		if (this.start !== null) {
			const data = this.data
			const start = this.start
			const end = this.end + 1
			const items = data.slice(start, end)
			if (items.length > 0) {
				this.history.save({
					type: 'delete',
					array: data,
					index: start,
					items: items
				})
				data.splice(start, end - start)
				this.update()
				this.select(start)
				this.scrollToSelection()
				this.dispatchChangeEvent()
			}
		}
	}

	// 撤销操作
	undo() {
		if (!this.dragging && this.history.canUndo()) {
			this.history.restore('undo')
		}
	}

	// 重做操作
	redo() {
		if (!this.dragging && this.history.canRedo()) {
			this.history.restore('redo')
		}
	}

	// 保存数据
	save() {
		const item = this.object.save()
		if (item === undefined) {
			return
		}
		const start = this.start
		if (start !== null) {
			const data = this.data
			const length = data.length
			switch (this.inserting) {
				case true:
					this.history.save({
						type: 'insert',
						array: data,
						index: start,
						items: [item]
					})
					data.splice(start, 0, item)
					this.update()
					this.select(start + data.length - length)
					break
				case false:
					this.history.save({
						type: 'replace',
						array: data,
						index: start,
						swap: data[start]
					})
					data[start] = item
					this.update()
					this.select(start)
					break
			}
			this.scrollToSelection()
			this.dispatchChangeEvent()
		}
	}

	// 清除元素
	clearElements(start) {
		return CommonList.clearElements(this, start)
	}

	// 清除列表
	clear() {
		this.unselect()
		this.textContent = ''
		this.data = null
		this.start = null
		this.end = null
		this.history.reset()
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 获得焦点事件
	listFocus(event) {
		if (!this.focusing) {
			this.focusing = true
			this.start !== null ? this.reselect() : this.select(0)
		}
	}

	// 失去焦点事件
	listBlur(event) {
		if (this.dragging) {
			this.windowPointerup(this.dragging)
		}
		if (this.focusing) {
			let element = this
			while ((element = element.parentNode)) {
				if (element instanceof WindowFrame) {
					if (element.hasClass('blur')) {
						return
					} else {
						break
					}
				}
			}
			this.focusing = false
			this.unselect()
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'KeyX':
					this.copy()
					this.delete()
					break
				case 'KeyC':
					this.copy()
					break
				case 'KeyV':
					this.paste()
					break
				case 'KeyA':
					this.selectAll()
					break
				case 'KeyZ':
					if (!event.macRedoKey) {
						this.undo()
						break
					}
				case 'KeyY':
					this.redo()
					break
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
				default:
					return
			}
			// 位于主界面的组件可能发生快捷键冲突
			// 因此阻止有效按键冒泡(Ctrl + Z|Y)
			event.stopImmediatePropagation()
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault()
					return
				case 'Enter':
				case 'NumpadEnter':
					if (this.start !== null) {
						event.stopPropagation()
						if (this.start === this.end) {
							this.edit()
						}
					}
					break
				case 'Insert':
					this.insert()
					break
				case 'Slash':
					this.toggle()
					break
				case 'Delete':
					this.delete()
					break
				case 'ArrowUp':
					event.preventDefault()
					event.shiftKey ? this.selectMultipleUp() : this.selectUp()
					break
				case 'ArrowDown':
					event.preventDefault()
					event.shiftKey
						? this.selectMultipleDown()
						: this.selectDown()
					break
				default:
					return
			}
			event.stopImmediatePropagation()
		}
	}

	// 指针按下事件
	pointerdown(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 0: {
				let index
				let element = event.target
				if (element === this) {
					if (element.isInContent(event)) {
						index = this.elements.count - 1
					}
				} else {
					element = element.seek('param-item')
					if (element.tagName === 'PARAM-ITEM') {
						index = element.read()
					}
				}
				if (index >= 0) {
					element = this.elements[index]
					if (event.shiftKey && this.start !== null) {
						this.selectMultiple(index)
					} else {
						this.select(index)
					}
					this.dragging = event
					event.mode = 'select'
					event.itemIndex = index
					event.itemHeight = element.clientHeight
					window.on('pointerup', this.windowPointerup)
					window.on('pointermove', this.windowPointermove)
					this.addScrollListener('vertical', 2, true, () => {
						this.windowPointermove(event.latest)
					})
				}
				break
			}
			case 2: {
				let index
				let element = event.target
				if (element === this) {
					if (element.isInContent(event)) {
						index = this.elements.count - 1
					}
				} else {
					element = element.seek('param-item')
					if (element.tagName === 'PARAM-ITEM') {
						index = element.read()
					}
				}
				if (index >= 0) {
					const element = this.elements[index]
					if (!element.hasClass('selected')) {
						this.select(index)
					}
				}
				break
			}
		}
	}

	// 指针弹起事件
	pointerup(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 2:
				if (this.start !== null && document.activeElement === this) {
					const elements = this.elements
					const element = elements[this.start]
					const valid = !!element.dataItem
					const editable = this.start === this.end
					const pastable = Clipboard.has(this.type)
					const allSelectable = this.data.length > 0
					const undoable = this.history.canUndo()
					const redoable = this.history.canRedo()
					const get = Local.createGetter('menuParamList')
					const menuItems = [
						{
							label: get('edit'),
							accelerator: 'Enter',
							enabled: editable,
							click: () => {
								this.edit()
							}
						},
						{
							label: get('insert'),
							accelerator: 'Insert',
							click: () => {
								this.insert()
							}
						},
						{
							type: 'separator'
						},
						{
							label: get('cut'),
							accelerator: ctrl('X'),
							enabled: valid,
							click: () => {
								this.copy()
								this.delete()
							}
						},
						{
							label: get('copy'),
							accelerator: ctrl('C'),
							enabled: valid,
							click: () => {
								this.copy()
							}
						},
						{
							label: get('paste'),
							accelerator: ctrl('V'),
							enabled: pastable,
							click: () => {
								this.paste()
							}
						},
						{
							label: get('delete'),
							accelerator: 'Delete',
							enabled: valid,
							click: () => {
								this.delete()
							}
						},
						{
							label: get('selectAll'),
							accelerator: ctrl('A'),
							enabled: allSelectable,
							click: () => {
								this.select(0, Infinity)
							}
						},
						{
							label: get('undo'),
							accelerator: ctrl('Z'),
							enabled: undoable,
							click: () => {
								this.undo()
							}
						},
						{
							label: get('redo'),
							accelerator: ctrl('Y'),
							enabled: redoable,
							click: () => {
								this.redo()
							}
						}
					]
					if (this.togglable) {
						menuItems.splice(2, 0, {
							label: get('toggle'),
							accelerator: '/',
							enabled: valid,
							click: () => {
								this.toggle()
							}
						})
					}
					Menu.popup(
						{
							x: event.clientX,
							y: event.clientY
						},
						menuItems
					)
				}
				break
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		if (this.start === this.end) {
			this.edit()
		}
	}

	// 窗口 - 指针弹起事件
	static windowPointerup(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'select':
					this.removeScrollListener()
					break
			}
			this.dragging = null
			window.off('pointerup', this.windowPointerup)
			window.off('pointermove', this.windowPointermove)
		}
	}

	// 窗口 - 指针移动事件
	static windowPointermove(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'select': {
					dragging.latest = event
					const elements = this.elements
					const count = elements.count
					if (count > 0) {
						const pt = this.paddingTop
						const { itemHeight } = dragging
						const { y } = event.getRelativeCoords(this)
						const line = Math.floor((y - pt) / itemHeight)
						const index = Math.clamp(line, 0, count - 1)
						if (dragging.itemIndex !== index) {
							dragging.itemIndex = index
							this.selectMultiple(index)
						}
					}
					break
				}
			}
		}
	}
}

customElements.define('param-list', ParamList)

// ******************************** 指令操作历史 ********************************

class CommandHistory {
	list //:element
	stack //:array
	index //:number
	capacity //:number
	versionId //:number
	lastState //:number

	constructor(list) {
		this.list = list
		this.stack = []
		this.index = -1
		this.capacity = 100
		this.versionId = 0
		this.lastState = 0
	}

	// 重置历史
	reset() {
		if (this.stack.length !== 0) {
			this.stack = []
			this.index = -1
		}
	}

	// 保存数据
	save(data) {
		// 删除多余的栈
		const stack = this.stack
		const length = this.index + 1
		if (length < stack.length) {
			stack.length = length
		}

		// 堆栈上限
		if (stack.length < this.capacity) {
			this.index++
			stack.push(data)
		} else {
			stack.shift()
			stack.push(data)
		}

		// 更新版本ID
		this.versionId++
	}

	// 恢复数据
	restore(operation) {
		const index =
			operation === 'undo'
				? this.index
				: operation === 'redo'
					? this.index + 1
					: null

		if (index >= 0 && index < this.stack.length) {
			const list = this.list
			const data = this.stack[index]
			switch (data.type) {
				case 'insert': {
					const { parent, array, index, commands } = data
					const length = commands.length
					const sCommand = commands[0]
					const eCommand = commands[length - 1]
					list.unfoldCommand(parent)
					if (operation === 'undo') {
						if (index + length <= array.length) {
							const start = list.getRangeByData(sCommand)[0]
							array.splice(index, length)
							list.update()
							list.select(start)
						}
					} else {
						if (index <= array.length) {
							array.splice(index, 0, ...commands)
							list.update()
							list.select(
								list.getRangeByData(sCommand)[0],
								list.getRangeByData(eCommand)[1]
							)
						}
					}
					break
				}
				case 'replace': {
					const { parent, array, index, commands } = data
					const [oldCommand, newCommand] = commands
					list.unfoldCommand(parent)
					if (operation === 'undo') {
						if (index < array.length) {
							array[index] = oldCommand
							list.update()
							list.select(...list.getRangeByData(oldCommand))
						}
					} else {
						if (index < array.length) {
							array[index] = newCommand
							list.update()
							list.select(...list.getRangeByData(newCommand))
						}
					}
					break
				}
				case 'delete': {
					const { parent, array, index, commands } = data
					const length = commands.length
					const sCommand = commands[0]
					const eCommand = commands[length - 1]
					list.unfoldCommand(parent)
					if (operation === 'undo') {
						if (index <= array.length) {
							array.splice(index, 0, ...commands)
							list.update()
							list.select(
								list.getRangeByData(sCommand)[0],
								list.getRangeByData(eCommand)[1]
							)
						}
					} else {
						if (index + length <= array.length) {
							const start = list.getRangeByData(sCommand)[0]
							array.splice(index, length)
							list.update()
							list.select(start)
						}
					}
					break
				}
				case 'toggle': {
					const { parent, method, commands } = data
					list.unfoldCommand(parent)
					if (
						(operation === 'undo' && method === 'disable') ||
						(operation === 'redo' && method === 'enable')
					) {
						list.enableItems(commands)
					} else {
						list.disableItems(commands)
					}
					const length = commands.length
					const sCommand = commands[0]
					const eCommand = commands[length - 1]
					let [start, end] = list.getRangeByData(sCommand)
					if (length > 1) {
						end = list.getRangeByData(eCommand)[1]
					}
					list.update()
					list.select(start, end)
					break
				}
			}
			list.scrollToSelection('restore')
			list.dispatchChangeEvent()

			// 改变指针
			switch (operation) {
				case 'undo':
					this.index--
					this.versionId--
					break
				case 'redo':
					this.index++
					this.versionId++
					break
			}
		}
	}

	// 保存状态
	saveState() {
		this.lastState = this.versionId
	}

	// 恢复状态
	restoreState() {
		let steps = this.lastState - this.versionId
		if (Math.abs(steps) <= this.capacity) {
			// 禁用不必要的列表方法
			const list = this.list
			list.update = Function.empty
			list.select = Function.empty
			list.scrollToSelection = Function.empty
			while (steps < 0) {
				this.restore('undo')
				steps++
			}
			while (steps > 0) {
				this.restore('redo')
				steps--
			}
			delete list.update
			delete list.select
			delete list.scrollToSelection
			return true
		}
		return false
	}

	// 撤销条件判断
	canUndo() {
		return this.index >= 0
	}

	// 重做条件判断
	canRedo() {
		return this.index + 1 < this.stack.length
	}
}

// ******************************** 指令列表 ********************************

class CommandList extends HTMLElement {
	data //:array
	elements //:array
	selections //:array
	start //:number
	end //:number
	origin //:number
	active //:number
	anchor //:number
	inserting //:boolean
	focusing //:boolean
	dragging //:event
	windowPointerup //:function
	windowPointermove //:function

	constructor() {
		super()

		// 设置属性
		this.tabIndex = 0
		this.data = null
		this.varList = null
		this.varMap = null
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.selections = []
		this.selections.count = 0
		this.start = null
		this.end = null
		this.origin = null
		this.active = null
		this.anchor = null
		this.inserting = false
		this.focusing = false
		this.dragging = null
		this.windowPointerup = CommandList.windowPointerup.bind(this)
		this.windowPointermove = CommandList.windowPointermove.bind(this)
		this.windowVariableChange = CommandList.windowVariableChange.bind(this)

		// 搜索相关属性
		this.searchMatches = null
		this.currentSearchTerm = null
		this.currentMatchIndex = -1
		this.keyboardSelectedIndex = -1 // 跟踪快捷键选择的当前项（-1表示没有选中项）

		// 侦听事件
		this.on('scroll', this.resize)
		this.on('focus', this.listFocus)
		this.on('blur', this.listBlur)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
		this.on('doubleclick', this.doubleclick)
		window.on('variablechange', this.windowVariableChange)
	}

	// 读取操作历史
	get history() {
		return this.data.history
	}

	// 读取上边距
	get paddingTop() {
		let pt = this._paddingTop
		if (pt === undefined) {
			pt = this._paddingTop = parseInt(this.css().paddingTop)
		}
		return pt
	}

	// 读取数据
	read() {
		return this.data
	}

	// 写入数据
	write(data) {
		// 重置搜索框状态（新事件页打开时）
		const searchBox = document.getElementById('event-content-search-box')
		if (searchBox) {
			searchBox.style.display = 'none'

			// 取消防抖计时器
			if (window._searchDebounceTimer) {
				clearTimeout(window._searchDebounceTimer)
				window._searchDebounceTimer = null
			}

			// 清除搜索内容并确保触发清理
			searchBox.value = ''
			// 手动触发input事件，确保清除逻辑被执行
			const inputEvent = new Event('input', { bubbles: true })
			searchBox.dispatchEvent(inputEvent)

			// 隐藏搜索按钮
			const searchPrev = document.getElementById('event-search-prev')
			const searchNext = document.getElementById('event-search-next')
			const searchClose = document.getElementById('event-search-close')
			if (searchPrev) searchPrev.style.display = 'none'
			if (searchNext) searchNext.style.display = 'none'
			if (searchClose) {
				searchClose.style.display = 'none'
				searchClose.textContent = '×' // 确保关闭按钮内容正确
			}
			// 隐藏搜索计数器
			const searchCounter = document.getElementById('search-counter')
			if (searchCounter) {
				searchCounter.style.opacity = '0'
			}
		}

		// 保护完整数据
		if (this.data && this.data.length > 100 && data && data.length < 10) {
			if (!window._completeCommandData) {
				window._completeCommandData = this.data
			}
			return
		}

		this.data = data

		if (data && data.length > 100) {
			window._completeCommandData = data
		}

		this.textContent = ''
		this.update()
		if (!data.history) {
			Object.defineProperty(data, 'history', {
				configurable: true,
				value: new CommandHistory(this)
			})
		}
		Promise.resolve().then(() => {
			this.scrollTop = 0
		})
	}

	// Update the command list
	update() {
		// Use cached complete data if current data is incomplete
		if (
			!window._completeCommandData &&
			this.data &&
			this.data.length > 100
		) {
			window._completeCommandData = this.data
		}

		if (window._completeCommandData && this.data && this.data.length < 10) {
			this.data = window._completeCommandData
		}

		this.analyzeVariables()

		const { elements } = this
		elements.start = -1
		elements.count = 0

		this.expandedLineNumbers = new Map()
		this.currentExpandedLine = 0
		this.allCommands = new Map()

		this.createItems(this.data, 0)

		const { count } = elements
		for (let i = 0; i < count; i++) {
			elements[i].dataValue = i
		}

		this.clearElements(elements.count)
		this.dispatchUpdateEvent()
		this.resize()
		this.updateDelayedCollections()
		this.outputAllCommands()

		// Re-execute search if active
		if (this.currentSearchTerm) {
			const savedTerm = this.currentSearchTerm
			const savedIndex = this.keyboardSelectedIndex

			if (
				!savedTerm ||
				typeof savedTerm !== 'string' ||
				savedTerm.trim() === ''
			) {
				this.currentSearchTerm = null
				this.searchMatches = null
				this.currentMatchIndex = -1
				this.keyboardSelectedIndex = -1
				return
			}

			// 使用refreshSearch而不是重新搜索，避免状态清空造成的时序问题
			setTimeout(() => {
				this.refreshSearch(savedTerm, savedIndex)
				// 额外确保高亮完整性
				setTimeout(() => {
					this.highlightVisibleMatches()
				}, 100)
			}, 100)
		} else {
			setTimeout(() => {
				this.validateAndCleanHighlights()
			}, 50)
		}
	}

	// 重新调整
	resize() {
		CommonList.resize(this)

		// 检查变量有效性
		this.checkVariables()

		// 如果有搜索词，检查并高亮新渲染的元素
		if (this.currentSearchTerm) {
			// 多次延迟检查，确保高亮完整性
			setTimeout(() => {
				this.highlightVisibleMatches()
			}, 50)

			setTimeout(() => {
				this.highlightVisibleMatches()
			}, 150)

			setTimeout(() => {
				this.highlightVisibleMatches()
			}, 300)
		}
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize(element) {
		if (element.contents !== null) {
			this.updateCommandElement(element)

			// 如果有搜索词，检查这个元素是否需要高亮
			if (this.currentSearchTerm) {
				setTimeout(() => {
					if (
						element.textContent &&
						element.textContent.includes(this.currentSearchTerm)
					) {
						// 检查是否已经高亮
						if (!element.querySelector('mark')) {
							// 简单的普通高亮，让refreshAllHighlights处理当前项
							this.highlightTextInElement(
								element,
								this.currentSearchTerm,
								false
							)
						}
					}
				}, 10)
			}
		}
	}

	// 创建折叠的指令缓存
	createFoldedCommandBuffer(buffer, indent, parent) {
		for (const commands of buffer) {
			if (commands instanceof Array) {
				const length = commands.length
				for (let i = 0; i < length; i++) {
					this.createFoldedCommandBuffer(
						this.createCommandBuffer(commands, i, indent, parent),
						indent + 1,
						commands[i]
					)
				}
			}
		}
	}

	// 这些方法不再需要，因为我们已经改为在collectAllCommands中统一处理

	// Count folded items to maintain correct line numbering
	countFoldedItems(buffer, indent, parent) {
		// Skip first element (already counted)
		for (let i = 1; i < buffer.length; i++) {
			const item = buffer[i]
			if (item instanceof HTMLElement) {
				// Folded HTML element
				const lineNumber = this.currentExpandedLine++

				// 收集折叠元素的信息
				this.collectCommandInfo(item, lineNumber, true)
			} else if (item instanceof Array) {
				// Recursively process child commands
				this.countFoldedItemsArray(item, indent, parent)
			}
		}
	}

	// Count folded command arrays
	countFoldedItemsArray(commands, indent, parent) {
		const length = commands.length
		for (let i = 0; i < length; i++) {
			const command = commands[i]
			// Create buffer to check how many elements this command has
			const buffer = this.createCommandBuffer(commands, i, indent, parent)

			// Count all elements in buffer
			for (const item of buffer) {
				if (item instanceof HTMLElement) {
					const lineNumber = this.currentExpandedLine++
					// 收集折叠命令的信息
					this.collectCommandInfo(item, lineNumber, true)
				} else if (item instanceof Array) {
					// Recursively process sub-arrays
					this.countFoldedItemsArray(item, indent + 1, command)
				}
			}
		}
		// Blank item
		const blankLine = this.currentExpandedLine++
		// 收集折叠的空白行
		if (this.allCommands) {
			this.allCommands.set(blankLine, {
				element: null,
				command: null,
				text: '(空白)',
				indent: indent,
				folded: true,
				lineNumber: blankLine
			})
		}
	}

	// 解析条件对象为可读文字
	parseConditionToText(condition) {
		try {
			let variableText = '变量'
			let operationText = '=='
			let operandText = '值'

			// 解析变量部分
			if (condition.variable) {
				if (
					condition.variable.type === 'actor' &&
					condition.variable.key
				) {
					// 尝试从varMap获取变量名
					if (this.varMap && this.varMap[condition.variable.key]) {
						variableText = this.varMap[condition.variable.key]
					} else {
						// 尝试构造可读名称
						variableText = this.constructActorVariableName(
							condition.variable
						)
					}
				} else if (condition.variable.name) {
					variableText = condition.variable.name
				}
			}

			// 解析操作符
			const operationMap = {
				'greater-or-equal': '>=',
				greater: '>',
				'less-or-equal': '<=',
				less: '<',
				equal: '==',
				'not-equal': '!='
			}

			if (condition.operation && operationMap[condition.operation]) {
				operationText = operationMap[condition.operation]
			}

			// 解析操作数
			if (condition.operand) {
				if (condition.operand.type === 'constant') {
					operandText = String(condition.operand.value)
				} else if (
					condition.operand.type === 'variable' &&
					condition.operand.key
				) {
					if (this.varMap && this.varMap[condition.operand.key]) {
						operandText = this.varMap[condition.operand.key]
					} else {
						operandText = condition.operand.key
					}
				}
			}

			return `${variableText} ${operationText} ${operandText}`
		} catch (error) {
			return '条件解析失败'
		}
	}

	// 构造角色变量名称
	constructActorVariableName(variable) {
		let result = '事件触发角色'

		// 尝试根据key猜测属性名
		if (variable.key) {
			// 这里需要更多信息来正确映射ID到属性名
			// 暂时返回一个占位符
			result += '.' + variable.key.substring(0, 8) // 显示前8位ID
		}

		return result
	}

	// 收集命令信息
	collectCommandInfo(element, lineNumber, isFolded = false) {
		if (!element || !this.allCommands) return

		// 检查是否已经收集过这个元素，避免重复
		for (const [existingLineNumber, existingInfo] of this.allCommands) {
			if (existingInfo.element === element) {
				return
			}
		}

		let text = ''
		const cmd = element.dataItem

		// 检查是否是选项元素（条件分支的选项）
		const isOptionElement =
			element.tagName === 'COMMAND-ITEM' &&
			element.classList.contains('option')

		// 对于所有有命令的元素，优先使用element.contents数组拼接可读文本
		if (cmd) {
			// script命令特殊处理 - 根据行号显示对应行的代码
			if (cmd.id === 'script' && cmd.params && cmd.params.script) {
				// 分割脚本为多行
				const scriptLines = cmd.params.script
					.replace(/\r\n/g, '\n')
					.replace(/\r/g, '\n')
					.split('\n')

				// 需要确定当前element对应script的哪一行
				// 通过查找同一个script命令的所有元素来确定行索引
				let scriptLineIndex = 0

				// 遍历allCommands找到同一个script命令的所有行
				for (const [existingLineNumber, existingInfo] of this
					.allCommands) {
					if (
						existingInfo.command === cmd &&
						existingLineNumber < lineNumber
					) {
						scriptLineIndex++
					}
				}

				// 显示对应行的内容
				if (scriptLineIndex < scriptLines.length) {
					text = scriptLines[scriptLineIndex]
				} else {
					text = '' // 超出范围的行显示空
				}
			} else if (
				element &&
				element.contents &&
				Array.isArray(element.contents)
			) {
				// 其他命令：拼接所有contents的text字段，这样能获得正确的变量名而不是ID
				for (const content of element.contents) {
					if (content && content.text !== undefined) {
						text += content.text
					}
				}
			} else {
				// fallback到element文本内容
				if (element && element.textContent) {
					text = element.textContent.trim()
				}
			}
		} else if (isOptionElement) {
			// 选项元素使用统一的element.contents拼接方法
			if (
				element &&
				element.contents &&
				Array.isArray(element.contents)
			) {
				for (const content of element.contents) {
					if (content && content.text !== undefined) {
						text += content.text
					}
				}
			} else if (element && element.textContent) {
				text = element.textContent.trim()
			}
		} else {
			// 没有命令的情况（else, end 等特殊元素）
			// 同样使用element.contents数组拼接可读文本
			if (
				element &&
				element.contents &&
				Array.isArray(element.contents)
			) {
				for (const content of element.contents) {
					if (content && content.text !== undefined) {
						text += content.text
					}
				}
			} else if (element && element.textContent) {
				text = element.textContent.trim()
			}
		}

		let finalText = text.trim()

		const commandInfo = {
			element: element,
			command: cmd,
			text: finalText,
			indent: element.dataIndent || 0,
			folded: isFolded,
			lineNumber: lineNumber // 使用0-based系统
		}

		this.allCommands.set(lineNumber, commandInfo)
	}

	// 更新需要延迟收集的元素
	updateDelayedCollections() {
		if (!this.allCommands) return

		// 首先收集所有需要更新的特殊元素，按命令分组
		const specialElementsByCommand = new Map()

		for (const [lineNumber, info] of this.allCommands) {
			if (info.needsDelayedCollection && info.element) {
				const cmd = info.element.dataItem
				if (cmd) {
					if (!specialElementsByCommand.has(cmd)) {
						specialElementsByCommand.set(cmd, [])
					}
					specialElementsByCommand.get(cmd).push({ lineNumber, info })
				}
			}
		}

		// 处理每个命令的特殊元素
		for (const [cmd, elements] of specialElementsByCommand) {
			if (cmd.id === 'if') {
				// 对于 if 命令，根据位置确定文本
				const hasElse = cmd.params && cmd.params.elseCommands

				elements.forEach((elem, index) => {
					let text = ''

					// 根据元素数量和位置判断
					if (hasElse && elements.length === 2) {
						// 有 else 分支：第一个是 "否则"，第二个是 "结束"
						text =
							index === 0
								? Local.get('command.if.else') || '否则'
								: Local.get('command.if.end') || '结束'
					} else if (!hasElse && elements.length === 1) {
						// 没有 else 分支：唯一的特殊元素是 "结束"
						text = Local.get('command.if.end') || '结束'
					} else {
						// 多个 if-else if 的情况，需要更复杂的判断
						// 最后一个总是 "结束"
						if (index === elements.length - 1) {
							text = Local.get('command.if.end') || '结束'
						} else {
							text = Local.get('command.if.else') || '否则'
						}
					}

					elem.info.text = text
					elem.info.needsDelayedCollection = false
				})
			} else if (cmd.id === 'loop') {
				// loop 命令的结束文本
				elements.forEach((elem) => {
					// 使用本地化文本
					elem.info.text =
						Local.get('command.loop.end') || '重复以上内容'
					elem.info.needsDelayedCollection = false
				})
			} else if (cmd.id === 'switch') {
				// switch 命令的特殊元素
				const hasDefault = cmd.params && cmd.params.defaultCommands

				elements.forEach((elem, index) => {
					let text = ''

					// 先尝试从 contents 中获取文本
					if (
						elem.info.element.contents &&
						Array.isArray(elem.info.element.contents)
					) {
						for (const content of elem.info.element.contents) {
							if (content && content.text !== undefined) {
								text += content.text + ' '
							}
						}
					}

					// 如果没有获取到文本，使用默认值
					if (!text.trim()) {
						// switch 的特殊元素可能是 case 或 default 或 end
						// 需要根据数量和位置判断
						if (hasDefault && index === elements.length - 2) {
							// 倒数第二个是 default
							text = Local.get('command.switch.default') || '默认'
						} else if (index === elements.length - 1) {
							// 最后一个是 end
							text = Local.get('command.switch.end') || '结束'
						} else {
							// 其他都是 case
							text = Local.get('command.switch.case') || '如果是'
						}
					}

					elem.info.text = text.trim()
					elem.info.needsDelayedCollection = false
				})
			}
		}

		// 保存命令列表到全局变量
		const commandsArray = []
		for (const [lineNumber, info] of this.allCommands) {
			commandsArray.push({
				lineNumber: info.lineNumber,
				text: info.text,
				folded: info.folded,
				indent: info.indent,
				element: info.element,
				command: info.command
			})
		}

		window._eventCommandsArray = commandsArray
	}

	// 输出allCommands变量的函数
	outputAllCommands() {
		if (!this.allCommands) {
			return
		}

		// 特殊处理：检测第一个顶层trigger命令并更新下一行的text
		this.processTriggerCommands()

		// 保存命令列表到全局变量
		const commandsArray = []
		for (const [lineNumber, info] of this.allCommands) {
			commandsArray.push({
				lineNumber: info.lineNumber,
				text: info.text,
				folded: info.folded,
				indent: info.indent,
				element: info.element,
				command: info.command
			})
		}

		window._eventCommandsArray = commandsArray
	}

	// 处理trigger类型命令的特殊逻辑
	processTriggerCommands() {
		if (!this.allCommands) return

		// 获取所有命令信息按行号排序
		const sortedCommands = Array.from(this.allCommands.entries()).sort(
			(a, b) => a[0] - b[0]
		)

		for (let i = 0; i < sortedCommands.length - 1; i++) {
			const [currentLineNumber, currentInfo] = sortedCommands[i]
			const [nextLineNumber, nextInfo] = sortedCommands[i + 1]

			if (currentInfo.command) {
				const cmd = currentInfo.command

				// 检查是否为showText命令且有content（处理所有级别）
				if (cmd.id === 'showText' && cmd.params && cmd.params.content) {
					// 检查下一行是否与当前命令相关联（可能是同一个命令的footer）
					if (
						nextInfo.command === cmd ||
						(nextInfo.element &&
							currentInfo.element &&
							nextInfo.element.dataItem ===
								currentInfo.element.dataItem)
					) {
						// 更新下一行的text为content值
						const originalText = nextInfo.text
						nextInfo.text = cmd.params.content
					}
				}

				// 处理showChoices命令（处理所有级别的缩进）
				if (
					cmd.id === 'showChoices' &&
					cmd.params &&
					cmd.params.choices
				) {
					// 处理该命令的所有选项
					this.processChoicesCommand(cmd, sortedCommands, i)
				}

				// 处理if命令（处理所有级别的缩进）
				if (cmd.id === 'if' && cmd.params && cmd.params.branches) {
					// 暂时跳过if命令处理，保持原样
					// this.processIfCommand(cmd, sortedCommands, i)
				}
			}
		}
	}

	// 处理showChoices命令的选项显示
	processChoicesCommand(cmd, sortedCommands, cmdIndex) {
		const choices = cmd.params.choices

		// 直接通过命令的buffer查找选项元素
		if (cmd.buffer && Array.isArray(cmd.buffer)) {
			let optionIndex = 0
			// 遍历buffer，只处理直接的command-item.option元素（不递归处理数组）
			for (
				let i = 0;
				i < cmd.buffer.length && optionIndex < choices.length;
				i++
			) {
				const bufferItem = cmd.buffer[i]

				// 跳过数组元素（这些是嵌套的命令，不处理）
				if (Array.isArray(bufferItem)) {
					continue
				}

				// 检查是否是选项元素（只处理直接的选项元素）
				if (
					bufferItem &&
					bufferItem.tagName === 'COMMAND-ITEM' &&
					bufferItem.classList &&
					bufferItem.classList.contains('option')
				) {
					// 更宽松的条件：只要是选项元素就处理
					if (
						bufferItem.dataItem === cmd ||
						!bufferItem.dataItem ||
						bufferItem.dataItem === null
					) {
						const choice = choices[optionIndex]

						// 在allCommands中找到对应的info
						for (const [lineNumber, info] of this.allCommands) {
							if (info.element === bufferItem) {
								const originalText = info.text
								info.text = `选择: ${choice.content}`

								break
							}
						}

						optionIndex++
					}
				} else if (
					bufferItem &&
					bufferItem.tagName === 'COMMAND-ITEM'
				) {
				}
			}

			// 处理footer元素，显示"结束"
			for (let i = 0; i < cmd.buffer.length; i++) {
				const bufferItem = cmd.buffer[i]

				// 跳过数组元素
				if (Array.isArray(bufferItem)) continue

				// 检查是否是footer元素
				if (
					bufferItem &&
					bufferItem.tagName === 'COMMAND-ITEM' &&
					bufferItem.classList &&
					bufferItem.classList.contains('footer') &&
					(bufferItem.dataItem === cmd ||
						!bufferItem.dataItem ||
						bufferItem.dataItem === null)
				) {
					// 更宽松的条件

					// 在allCommands中找到对应的info
					for (const [lineNumber, info] of this.allCommands) {
						if (info.element === bufferItem) {
							const originalText = info.text
							info.text = '结束'

							break
						}
					}
					break // 只有一个footer
				}
			}
		} else {
		}
	}

	// 处理if命令的分支显示
	processIfCommand(cmd, sortedCommands, cmdIndex) {
		const branches = cmd.params.branches

		// 直接通过命令的buffer查找选项元素
		if (cmd.buffer && Array.isArray(cmd.buffer)) {
			let branchIndex = 0
			// 遍历buffer，只处理直接的command-item.option元素
			for (
				let i = 0;
				i < cmd.buffer.length && branchIndex < branches.length;
				i++
			) {
				const bufferItem = cmd.buffer[i]

				// 跳过数组元素（嵌套命令）
				if (Array.isArray(bufferItem)) {
					continue
				}

				// 检查是否是选项元素
				if (
					bufferItem &&
					bufferItem.tagName === 'COMMAND-ITEM' &&
					bufferItem.classList &&
					bufferItem.classList.contains('option')
				) {
					// 更宽松的条件
					if (
						bufferItem.dataItem === cmd ||
						!bufferItem.dataItem ||
						bufferItem.dataItem === null
					) {
						// option显示从第1个分支开始（跳过第0个分支，因为header已经显示了）
						const actualBranchIndex = branchIndex + 1

						if (actualBranchIndex < branches.length) {
							const branch = branches[actualBranchIndex]

							// 尝试使用Command.parse解析if命令来获取正确的文本
							let conditionText = ''
							try {
								const contents = Command.parse(cmd, this.varMap)

								// 查找对应分支的内容
								for (let i = 0; i < contents.length; i++) {
									const content = contents[i]
									if (
										content.text &&
										i === actualBranchIndex + 1
									) {
										// +1因为第0个是header
										conditionText = content.text
										break
									}
								}
							} catch (error) {
								conditionText = this.parseIfConditions(
									branch,
									actualBranchIndex,
									branches.length
								)
							}

							if (!conditionText) {
								conditionText = this.parseIfConditions(
									branch,
									actualBranchIndex,
									branches.length
								)
							}

							// 在allCommands中找到对应的info
							for (const [lineNumber, info] of this.allCommands) {
								if (info.element === bufferItem) {
									const originalText = info.text
									info.text = conditionText

									break
								}
							}
						} else {
						}

						branchIndex++
					}
				}
			}

			// 处理footer元素，显示"结束"
			for (let i = 0; i < cmd.buffer.length; i++) {
				const bufferItem = cmd.buffer[i]

				// 跳过数组元素
				if (Array.isArray(bufferItem)) continue

				// 检查是否是footer元素
				if (
					bufferItem &&
					bufferItem.tagName === 'COMMAND-ITEM' &&
					bufferItem.classList &&
					bufferItem.classList.contains('footer') &&
					(bufferItem.dataItem === cmd ||
						!bufferItem.dataItem ||
						bufferItem.dataItem === null)
				) {
					// 在allCommands中找到对应的info
					for (const [lineNumber, info] of this.allCommands) {
						if (info.element === bufferItem) {
							const originalText = info.text
							info.text = '结束'

							break
						}
					}
					break // 只有一个footer
				}
			}
		} else {
		}
	}

	// 解析if条件生成可读文本
	parseIfConditions(branch, branchIndex, totalBranches) {
		// 如果是最后一个分支且没有条件，可能是else分支
		if (
			branchIndex === totalBranches - 1 &&
			(!branch.conditions || branch.conditions.length === 0)
		) {
			return '否则'
		}

		// 对于option显示，需要添加"否则如果"前缀（branchIndex > 0时）
		const prefix = branchIndex > 0 ? '否则如果 ' : ''

		if (!branch.conditions || branch.conditions.length === 0) {
			return prefix ? prefix.trim() : '无条件'
		}

		// 尝试从branch的commands中获取正确的文本
		// 如果branch有commands且第一个元素包含解析后的内容
		if (branch.commands && branch.commands.length > 0) {
		}

		// 解析条件
		const conditionTexts = []
		for (const condition of branch.conditions) {
			const conditionText = this.parseCondition(condition)
			if (conditionText) {
				conditionTexts.push(conditionText)
			}
		}

		if (conditionTexts.length > 0) {
			const conditionsStr = conditionTexts.join(' 且 ')
			return prefix + conditionsStr
		}

		return prefix ? prefix.trim() : '无条件'
	}

	// 解析单个条件
	parseCondition(condition) {
		if (!condition) return ''

		// 获取变量名
		const variableName = condition.variable?.key || '未知变量'

		// 获取操作符，使用符号形式
		const operationMap = {
			equal: '==',
			notEqual: '!=',
			unequal: '!=', // 添加unequal的映射
			greater: '>',
			greaterOrEqual: '>=',
			less: '<',
			lessOrEqual: '<='
		}
		const operation =
			operationMap[condition.operation] || condition.operation

		// 获取操作数
		let operandText = ''
		if (condition.operand) {
			if (condition.operand.type === 'constant') {
				const value = condition.operand.value
				// 处理布尔值
				if (typeof value === 'boolean') {
					operandText = value ? 'true' : 'false'
				} else {
					operandText = String(value)
				}
			} else if (
				condition.operand.type === 'variable' &&
				condition.operand.variable
			) {
				operandText = condition.operand.variable.key || '未知变量'
			}
		}

		return `${variableName} ${operation} ${operandText}`
	}

	// Create items for the command list
	createItems(commands, indent, parent = null) {
		const elements = this.elements
		const length = commands.length

		for (let i = 0; i < length; i++) {
			const buffer = this.createCommandBuffer(commands, i, indent, parent)

			// Assign expanded line number to the first element
			const expandedLine = this.currentExpandedLine++
			this.expandedLineNumbers.set(buffer[0], expandedLine)

			const command = commands[i]

			// 收集第一个元素的信息
			this.collectCommandInfo(buffer[0], expandedLine)

			// 检查是否需要高亮这一行
			if (
				this.highlightTargetLine !== undefined &&
				expandedLine === this.highlightTargetLine
			) {
				setTimeout(() => {
					// 如果有搜索词，直接高亮文本
					if (this.currentSearchTerm) {
						// 再等一下确保内容加载
						setTimeout(() => {
							if (
								buffer[0].textContent &&
								buffer[0].textContent.includes(
									this.currentSearchTerm
								)
							) {
								this.highlightTextInElement(
									buffer[0],
									this.currentSearchTerm
								)
							}
						}, 100)
					} else {
						this.highlightElement(buffer[0])
					}
					if (this.highlightTargetLine === expandedLine) {
						this.highlightTargetLine = undefined
					}
				}, 200)
			}

			if (buffer[0].dataItem?.folded) {
				// Folded command: only show the first element
				elements[elements.count++] = buffer[0]

				// 检查新创建的折叠元素是否需要高亮
				if (this.currentSearchTerm && buffer[0].textContent) {
					setTimeout(() => {
						if (
							buffer[0].textContent.includes(
								this.currentSearchTerm
							)
						) {
							this.highlightTextInElement(
								buffer[0],
								this.currentSearchTerm
							)
						}
					}, 50)
				}

				// Count folded items to increment line counter
				this.countFoldedItems(buffer, indent + 1, commands[i])
				continue
			}

			// Unfolded command: process all elements in buffer
			let isFirst = true
			for (const target of buffer) {
				if (target instanceof HTMLElement) {
					if (!isFirst) {
						// Extra HTML elements also need line numbers
						const extraLine = this.currentExpandedLine++
						this.expandedLineNumbers.set(target, extraLine)
						// 收集额外元素的信息（如 else, end）
						this.collectCommandInfo(target, extraLine)

						// 检查是否需要高亮这一行
						if (
							this.highlightTargetLine !== undefined &&
							extraLine === this.highlightTargetLine
						) {
							setTimeout(() => {
								// 如果有搜索词，直接高亮文本
								if (this.currentSearchTerm) {
									// 再等一下确保内容加载
									setTimeout(() => {
										if (
											target.textContent &&
											target.textContent.includes(
												this.currentSearchTerm
											)
										) {
											this.highlightTextInElement(
												target,
												this.currentSearchTerm
											)
										}
									}, 100)
								} else {
									this.highlightElement(target)
								}
								if (this.highlightTargetLine === extraLine) {
									this.highlightTargetLine = undefined
								}
							}, 200)
						}
					}
					isFirst = false
					elements[elements.count++] = target

					// 检查新创建的展开元素是否需要高亮
					if (this.currentSearchTerm && target.textContent) {
						setTimeout(() => {
							if (
								target.textContent.includes(
									this.currentSearchTerm
								)
							) {
								this.highlightTextInElement(
									target,
									this.currentSearchTerm
								)
							}
						}, 50)
					}

					continue
				}
				if (target instanceof Array) {
					this.createItems(target, indent + 1, commands[i])
					continue
				}
			}
		}

		// Create blank element
		const blankElement = this.createBlankElement(
			commands,
			length,
			indent,
			parent
		)
		const blankLine = this.currentExpandedLine++
		this.expandedLineNumbers.set(blankElement, blankLine)
		elements[elements.count++] = blankElement

		// 收集空白行信息
		if (this.allCommands) {
			this.allCommands.set(blankLine, {
				element: blankElement,
				command: null,
				text: '(空白)',
				indent: indent,
				folded: false,
				lineNumber: blankLine
			})
		}
	}

	// 创建指令缓冲区
	createCommandBuffer(commands, index, indent, parent) {
		const command = commands[index]
		let buffer = command.buffer
		if (buffer === undefined) {
			buffer = []
			buffer.enabled = true
			Object.defineProperty(command, 'buffer', {
				configurable: true,
				value: buffer
			})

			// 创建列表项
			let li
			let textId = ''
			let tooltip = ''
			let className = ''
			let color = ''
			let mainColor = 'normal'
			li = document.createElement('command-item')
			li.contents = []
			li.dataKey = true
			li.dataParent = parent
			li.dataList = commands
			li.dataItem = command
			li.dataIndex = index
			li.dataIndent = indent
			buffer.push(li)

			// 检查是否需要高亮这个元素
			if (
				this.pendingHighlightLine !== null &&
				this.pendingHighlightLine !== undefined
			) {
				const elementLine = this.expandedLineNumbers.get(li)
				if (elementLine === this.pendingHighlightLine) {
					// 延迟高亮，等待元素添加到DOM
					setTimeout(() => {
						// 如果有搜索词，直接高亮文本
						if (this.currentSearchTerm) {
							// 再等一下确保内容加载
							setTimeout(() => {
								if (
									li.textContent &&
									li.textContent.includes(
										this.currentSearchTerm
									)
								) {
									this.highlightTextInElement(
										li,
										this.currentSearchTerm
									)
								}
							}, 100)
						} else {
							this.highlightElement(li)
						}
						this.pendingHighlightLine = null
					}, 200)
				}
			}

			// 创建内容
			const contents = Command.parse(command, this.varMap)
			const length = contents.length
			for (let i = 0; i < length; i++) {
				const content = contents[i]

				// 保存内容
				if (content.text !== undefined) {
					content.color = color
					content.textId = textId
					content.tooltip = tooltip
					content.class = className
					li.contents.push(content)
					// 重置文本ID和工具提示
					if (textId) textId = ''
					if (tooltip) tooltip = ''
					if (className) className = ''
				}

				// 改变颜色
				if (content.color !== undefined) {
					switch (content.color) {
						// 恢复颜色
						case 'restore':
							color = mainColor
							continue
						// 保存颜色
						case 'save':
							mainColor = color
							continue
						default:
							color = content.color
							continue
					}
				}

				// 设置文本ID
				if (content.textId !== undefined) {
					textId = content.textId
				}

				// 设置工具提示
				if (content.tooltip !== undefined) {
					tooltip = content.tooltip
				}

				// 设置自定义类名
				if (content.class !== undefined) {
					className = content.class
				}

				// 换行
				if (content.break !== undefined) {
					li = document.createElement('command-item')
					li.contents = []
					li.dataKey = false
					li.dataList = commands
					li.dataItem = command
					li.dataIndex = index
					li.dataIndent = indent
					buffer.push(li)
					continue
				}

				// 折叠
				if (content.fold !== undefined) {
					li.fold = document.createElement('command-fold')
					li.appendChild(li.fold)
				}

				// 创建子项目
				if (content.children !== undefined) {
					buffer.push(content.children)

					if (i < length - 1) {
						// 修正条件：检查是否还有更多内容
						li = document.createElement('command-item')
						li.contents = []
						li.dataKey = false
						li.dataList = commands
						li.dataItem = command
						li.dataIndex = index
						li.dataIndent = indent
						li.isSpecialElement = true // 标记为特殊元素（如 else, end）
						buffer.push(li)
						continue
					}
				}

				// 创建脚本项目
				if (content.script !== undefined) {
					const MAX_LINES = 20
					let code = content.script
					const matches = code.match(/\n/g)
					const lines = (matches?.length ?? 0) + 1
					if (lines > MAX_LINES) {
						let count = 0
						const chars = code
						const length = chars.length
						for (let i = 0; i < length; i++) {
							if (chars[i] === '\n' && ++count === MAX_LINES) {
								code = chars.slice(0, i)
								break
							}
						}
					}
					const length = Math.min(lines, MAX_LINES + 1)
					const items = new Array(length)
					items[0] = li
					for (let i = 1; i < length; i++) {
						li = document.createElement('command-item')
						li.contents = []
						li.dataKey = false
						li.dataList = commands
						li.dataItem = command
						li.dataIndex = index
						li.dataIndent = indent
						buffer.push(li)
						items[i] = li
					}
					if (lines > MAX_LINES) {
						const text = document.createElement('text')
						text.textContent = `... ${lines} lines`
						text.addClass('gray')
						li.appendChild(text)
					}
					Command.cases.script.colorizeCodeLines(items, code)
				}
			}
		}

		// 设置数据索引
		if (buffer[0].dataIndex !== index) {
			for (const target of buffer) {
				if (target instanceof HTMLElement) {
					target.dataIndex = index
				}
			}
		}

		// 更新开关状态
		const enabled = command.id[0] !== '!'
		if (buffer.enabled !== enabled) {
			buffer.enabled = enabled
			if (enabled) {
				for (const target of buffer) {
					if (target instanceof HTMLElement) {
						target.removeClass('disabled')
					}
				}
			} else {
				for (const target of buffer) {
					if (target instanceof HTMLElement) {
						target.addClass('disabled')
					}
				}
			}
		}

		return buffer
	}

	// 搜索所有命令（包括折叠的）
	searchAllCommands(keyword) {
		const results = []

		// 使用已收集的命令信息
		if (!this.allCommands || this.allCommands.size === 0) {
			return results
		}

		// 搜索匹配的命令
		for (const [lineIndex, info] of this.allCommands) {
			if (info.text && info.text.includes(keyword)) {
				results.push({
					line: info.lineNumber,
					text: info.text,
					indent: info.indent,
					visible: !info.folded,
					folded: info.folded,
					element: info.element,
					command: info.command
				})
			}
		}

		return results
	}

	searchText(searchTerm) {
		if (
			!searchTerm ||
			typeof searchTerm !== 'string' ||
			searchTerm.trim() === ''
		) {
			this.clearAllHighlights()
			this.currentSearchTerm = null
			this.searchMatches = null
			this.currentMatchIndex = -1
			this.keyboardSelectedIndex = -1
			if (window.updateSearchCounter) {
				window.updateSearchCounter(-1, 0, '')
			}
			return
		}

		// 检查是否是导航命令 (例如: "k w" = 上一个, "k s" = 下一个)
		const navMatch = searchTerm.match(/^(.+?)\s+(w|s)$/)
		if (navMatch) {
			const [, searchWord, direction] = navMatch
			if (direction === 'w') {
				this.navigateToPrevMatch(searchWord)
			} else if (direction === 's') {
				this.navigateToNextMatch(searchWord)
			}
			return
		}

		// 检查是否是跳转到第N个匹配项的格式 (例如: "k 2")
		const jumpMatch = searchTerm.match(/^(.+?)\s+(\d+)$/)
		if (jumpMatch) {
			const [, searchWord, jumpIndex] = jumpMatch
			this.jumpToNthMatch(searchWord, parseInt(jumpIndex))
			return
		}

		const term = searchTerm

		// 清除旧高光和状态
		this.clearAllHighlights()
		this.currentSearchTerm = null
		this.searchMatches = null
		this.currentMatchIndex = -1
		this.keyboardSelectedIndex = -1

		setTimeout(() => {
			this.validateAndCleanHighlights()
		}, 50)

		// 延迟执行新搜索，确保清除完成
		setTimeout(() => {
			this.performNewSearch(searchTerm, term)
		}, 100)
	}

	performNewSearch(searchTerm, term) {
		this.currentSearchTerm = searchTerm
		const allMatches = []

		// 准备大小写不敏感的搜索词
		const lowerTerm = term.toLowerCase()

		// 优先使用 this.allCommands 作为主要数据源（它包含完整数据）

		// 备用数据源
		const backupDataSource = window._eventCommandsArray

		// 检查其他可能的全局数据源
		const otherSources = [
			'_currentEventList',
			'_displayedCommands',
			'_visibleCommands',
			'_searchableContent',
			'_allCommands',
			'_eventData'
		]

		otherSources.forEach((sourceName) => {
			if (window[sourceName]) {
				const source = window[sourceName]
				const size = Array.isArray(source)
					? source.length
					: source.size || 'unknown'

				// 如果是数组且不太大，检查是否有匹配项
				if (Array.isArray(source) && source.length < 100) {
					let matches = 0
					source.forEach((item, index) => {
						const text =
							item.text || item.content || item.toString()
						if (typeof text === 'string' && text.includes(term)) {
							matches++
							if (matches <= 3) {
							}
						}
					})
					if (matches > 0) {
					}
				}
			}
		})

		// 首先尝试使用 this.allCommands（完整数据源）
		if (this.allCommands && this.allCommands.size > 0) {
			let count = 0
			for (const [lineIndex, info] of this.allCommands) {
				if (count < 5) {
					count++
				}

				// 直接搜索 text 字段（应该在数据填充时已处理特殊元素）
				if (info.text && info.text.includes(term)) {
					allMatches.push({
						lineIndex: lineIndex,
						lineNumber: lineIndex, // 统一使用0-based系统
						text: info.text,
						folded: info.folded,
						source: 'allCommands'
					})
				}
			}
		} else if (Array.isArray(backupDataSource)) {
			// 备用：使用 _eventCommandsArray
			for (let i = 0; i < Math.min(5, backupDataSource.length); i++) {
				const info = backupDataSource[i]
			}

			for (let i = 0; i < backupDataSource.length; i++) {
				const info = backupDataSource[i]

				// 直接搜索 text 字段
				if (info.text && info.text.includes(term)) {
					allMatches.push({
						lineIndex: i,
						lineNumber: i, // 统一使用0-based系统
						text: info.text,
						folded: info.folded,
						source: 'backup'
					})
				}
			}
		} else {
		}

		// DOM搜索仅作为诊断和备用参考（不影响主搜索结果）
		const domMatches = []
		const commandItems = this.querySelectorAll('command-item')

		commandItems.forEach((element, index) => {
			if (element.textContent && element.textContent.includes(term)) {
				const text = element.textContent.trim()
				domMatches.push({
					lineIndex: index,
					text: text.substring(0, 100)
				})
			}
		})

		if (domMatches.length > 0) {
			domMatches.forEach((match, index) => {})
		}

		// 搜索结果汇总

		// 最终使用数据驱动的搜索结果（不再依赖DOM）

		this.searchMatches = allMatches
		this.currentMatchIndex = -1
		this.keyboardSelectedIndex = -1

		// 智能检测当前项
		const initialIndex = window.determineCurrentSearchItem
			? determineCurrentSearchItem(allMatches)
			: -1
		this.keyboardSelectedIndex = initialIndex

		// 立即应用红色高亮到当前项
		setTimeout(() => {
			this.refreshAllHighlights()
		}, 50)

		// 检测并处理折叠的匹配项 - 加强版保险机制
		const foldedMatches = allMatches.filter((m) => m.folded)
		let hasAutoExpanded = false

		if (foldedMatches.length > 0) {
			hasAutoExpanded = true

			const savedTerm = this.currentSearchTerm
			this.currentSearchTerm = null

			// 展开所有折叠的匹配项
			foldedMatches.forEach((match) => {
				if (match.lineNumber) {
					this.jumpToLine(match.lineNumber + 1)
				}
			})

			this.currentSearchTerm = savedTerm

			// 计算展开前可见的匹配项数量
			const originalVisibleCount = allMatches.filter(
				(m) => !m.folded
			).length

			// 展开后重新搜索以获取准确的可见匹配数
			setTimeout(() => {
				this.refreshSearchAfterExpand(
					searchTerm,
					originalVisibleCount,
					hasAutoExpanded
				)
			}, 500)
		} else {
			// 更新计数器，只计算可见的匹配项
			const visibleMatches = allMatches.filter((m) => !m.folded)
			this.searchMatches = visibleMatches
			if (window.updateSearchCounter) {
				window.updateSearchCounter(
					this.keyboardSelectedIndex,
					visibleMatches.length,
					searchTerm,
					hasAutoExpanded,
					0
				)
			}
		}

		// 高亮匹配文本 - 多次重试确保完整性
		setTimeout(() => {
			const elements = this.querySelectorAll('command-item')

			for (const element of elements) {
				if (element.textContent && element.textContent.includes(term)) {
					this.highlightTextInElement(element, term)
				}
			}

			// 立即尝试应用红色高亮
			setTimeout(() => {
				this.refreshAllHighlights()
			}, 100)
		}, 300)

		// 额外重试，处理延迟渲染的元素
		setTimeout(() => {
			this.highlightVisibleMatches()
			// 再次尝试红色高亮
			setTimeout(() => {
				this.refreshAllHighlights()
			}, 50)
		}, 600)

		setTimeout(() => {
			this.highlightVisibleMatches()
			// 最后一次确保红色高亮
			this.refreshAllHighlights()

			// 最终安全检查：确保没有遗漏的折叠匹配项
			if (!hasAutoExpanded && this.currentSearchTerm) {
				this.performFoldedMatchSecurityCheck(this.currentSearchTerm)
			}
		}, 1000)
	}

	// 跳转到第N个匹配项
	jumpToNthMatch(searchWord, index) {
		const term = searchWord

		// 如果没有之前的搜索结果，重新搜索
		if (!this.searchMatches || this.currentSearchTerm !== term) {
			this.searchText(searchWord)
			setTimeout(() => {
				this.jumpToNthMatch(searchWord, index)
			}, 1000)
			return
		}

		if (index < 1 || index > this.searchMatches.length) {
			return
		}

		const targetMatch = this.searchMatches[index - 1]

		this.currentMatchIndex = index - 1
		this.keyboardSelectedIndex = this.currentMatchIndex

		if (window.updateSearchCounter) {
			window.updateSearchCounter(
				this.keyboardSelectedIndex,
				this.searchMatches.length,
				this.currentSearchTerm
			)
		}

		// 展开折叠内容
		const savedTerm = this.currentSearchTerm
		this.currentSearchTerm = null

		this.jumpToLine(targetMatch.lineNumber + 1)

		// 恢复搜索词
		this.currentSearchTerm = savedTerm

		// 滚动到目标位置
		setTimeout(() => {
			this.scrollToTargetLine(targetMatch.lineNumber, true)
		}, 500)

		// 滚动完成后更新高亮状态（确保目标元素已渲染）
		setTimeout(() => {
			this.refreshAllHighlights()
		}, 1000)

		// 删除了"已跳转到第X个匹配项"的提示显示
	}

	// 导航到上一个匹配项
	navigateToPrevMatch(searchWord) {
		if (!searchWord || typeof searchWord !== 'string') {
			return
		}
		const term = searchWord

		if (!this.searchMatches || this.currentSearchTerm !== term) {
			this.searchText(searchWord)
			setTimeout(() => {
				if (this.searchMatches && this.searchMatches.length > 0) {
					this.jumpToNthMatch(searchWord, this.searchMatches.length)
				}
			}, 1000)
			return
		}

		if (this.searchMatches.length === 0) {
			return
		}

		let prevIndex
		if (this.keyboardSelectedIndex <= 0) {
			prevIndex = this.searchMatches.length
		} else {
			prevIndex = this.keyboardSelectedIndex
		}

		this.jumpToNthMatch(searchWord, prevIndex)

		// 更新高亮状态
		setTimeout(() => {
			this.refreshAllHighlights()
		}, 100)

		if (window.updateSearchCounter) {
			window.updateSearchCounter(
				this.keyboardSelectedIndex,
				this.searchMatches.length,
				this.currentSearchTerm
			)
		}
	}

	navigateToNextMatch(searchWord) {
		if (!searchWord || typeof searchWord !== 'string') {
			return
		}
		const term = searchWord

		if (!this.searchMatches || this.currentSearchTerm !== term) {
			this.searchText(searchWord)
			setTimeout(() => {
				if (this.searchMatches && this.searchMatches.length > 0) {
					this.jumpToNthMatch(searchWord, 1)
				}
			}, 1000)
			return
		}

		if (this.searchMatches.length === 0) {
			return
		}

		let nextIndex
		if (this.keyboardSelectedIndex >= this.searchMatches.length - 1) {
			nextIndex = 1
		} else {
			nextIndex = this.keyboardSelectedIndex + 2
		}

		this.jumpToNthMatch(searchWord, nextIndex)

		// 更新高亮状态
		setTimeout(() => {
			this.refreshAllHighlights()
		}, 100)

		if (window.updateSearchCounter) {
			window.updateSearchCounter(
				this.keyboardSelectedIndex,
				this.searchMatches.length,
				this.currentSearchTerm
			)
		}
	}

	// 刷新搜索状态（当命令列表更新后调用）
	refreshSearch(searchTerm, previousIndex = -1) {
		// 检查 allCommands 是否存在
		if (!this.allCommands || this.allCommands.size === 0) {
			return
		}

		// 重新收集匹配项 - 按行计数，不按实例计数
		const allMatches = []
		const term = searchTerm
		for (const [lineIndex, info] of this.allCommands) {
			if (info.text.includes(term)) {
				// Count per line, not per instance - one match per line
				allMatches.push({
					lineIndex: lineIndex,
					lineNumber: lineIndex,
					text: info.text,
					folded: info.folded
				})
			}
		}

		// 更新搜索状态
		this.searchMatches = allMatches

		// 检查之前的位置是否仍然有效
		if (previousIndex >= 0 && previousIndex < allMatches.length) {
			this.currentMatchIndex = previousIndex
		} else {
			this.currentMatchIndex = -1
			// 位置失效时重新智能检测当前项
			const newIndex = window.determineCurrentSearchItem
				? determineCurrentSearchItem(allMatches)
				: -1
			this.keyboardSelectedIndex = newIndex
		}

		// 立即清除旧的高亮
		this.clearAllHighlights()

		// 立即高亮所有可见的匹配项
		const elements = this.querySelectorAll('command-item')
		let highlightedCount = 0

		for (const element of elements) {
			if (element.textContent && element.textContent.includes(term)) {
				this.highlightTextInElement(element, searchTerm)
				highlightedCount++
			}
		}

		// 延迟检查，确保所有元素都被处理（特别是异步渲染的元素）
		setTimeout(() => {
			this.highlightVisibleMatches()
		}, 200)

		setTimeout(() => {
			this.highlightVisibleMatches()
		}, 500)

		// 更新计数器（使用快捷键选择索引）
		if (window.updateSearchCounter) {
			window.updateSearchCounter(
				this.keyboardSelectedIndex,
				allMatches.length,
				searchTerm
			)
		}
	}

	// 展开折叠后刷新搜索结果
	refreshSearchAfterExpand(searchTerm, originalCount, hasAutoExpanded) {
		// 直接重新收集匹配项，避免递归调用 performNewSearch
		const allMatches = []
		const term = searchTerm
		const dataSource = window._eventCommandsArray

		if (Array.isArray(dataSource)) {
			for (let i = 0; i < dataSource.length; i++) {
				const info = dataSource[i]
				if (info.text && info.text.includes(term)) {
					allMatches.push({
						lineIndex: i,
						lineNumber: info.lineNumber,
						text: info.text,
						folded: info.folded,
						source: 'data'
					})
				}
			}
		}

		// 更新所有匹配项的折叠状态（因为展开操作后状态可能已改变）
		for (const match of allMatches) {
			if (match.lineIndex < dataSource.length) {
				const info = dataSource[match.lineIndex]
				match.folded = info.folded || false
			}
		}

		// 只保留非折叠的匹配项，确保计数的一致性
		const visibleMatches = allMatches.filter((match) => !match.folded)

		this.searchMatches = visibleMatches
		const expandedCount = Math.max(0, visibleMatches.length - originalCount)

		// 更新计数器，显示展开信息
		if (window.updateSearchCounter) {
			window.updateSearchCounter(
				this.keyboardSelectedIndex,
				visibleMatches.length,
				searchTerm,
				hasAutoExpanded,
				expandedCount
			)
		}

		// 立即高亮新的匹配项
		setTimeout(() => {
			this.highlightVisibleMatches()

			// 额外的保险检查：确认是否还有隐藏的折叠匹配
			this.performFoldedMatchSecurityCheck(searchTerm)
		}, 100)
	}

	// 折叠匹配安全检查 - 额外保险机制
	performFoldedMatchSecurityCheck(searchTerm) {
		if (!searchTerm || !this.allCommands) return

		const term = searchTerm
		let hiddenFoldedCount = 0
		let foldedCommands = []

		// 检查 allCommands 中是否还有折叠的匹配项
		for (const [lineIndex, info] of this.allCommands) {
			if (info.folded && info.text && info.text.includes(term)) {
				hiddenFoldedCount++
				foldedCommands.push(info)
			}
		}

		if (hiddenFoldedCount > 0) {
			// 强制展开所有发现的折叠命令
			foldedCommands.forEach((info) => {
				if (info.command && info.command.folded) {
					try {
						this.unfoldCommand(info.command)
					} catch (e) {}
				}
			})

			// 如果成功展开了一些内容，再次刷新
			if (hiddenFoldedCount > 0) {
				setTimeout(() => {
					this.refreshSearchAfterExpand(
						searchTerm,
						this.searchMatches?.length || 0,
						true
					)
				}, 300)
			}
		}
	}

	// 高亮当前可见的匹配元素（用于滚动时）
	highlightVisibleMatches() {
		if (!this.currentSearchTerm) return

		const elements = this.querySelectorAll('command-item')
		const searchTerm = this.currentSearchTerm

		// 获取当前选中项信息
		let targetLineNumber = null
		let targetElementText = null
		if (
			this.searchMatches &&
			this.keyboardSelectedIndex >= 0 &&
			this.keyboardSelectedIndex < this.searchMatches.length
		) {
			const targetMatch = this.searchMatches[this.keyboardSelectedIndex]
			targetLineNumber = targetMatch.lineNumber
			targetElementText = targetMatch.text.trim().replace(/\s+/g, ' ')
		}

		let foundTarget = false
		for (const element of elements) {
			if (
				element.textContent &&
				element.textContent.includes(searchTerm)
			) {
				// 更健壮的高亮检查 - 检查是否有匹配的mark元素
				const existingMarks = element.querySelectorAll('mark')
				let hasValidHighlight = false

				// 检查现有高亮是否匹配当前搜索词
				for (const mark of existingMarks) {
					if (
						mark.textContent &&
						mark.textContent.includes(searchTerm)
					) {
						hasValidHighlight = true
						break
					}
				}

				// 如果没有有效高亮，重新高亮
				if (!hasValidHighlight) {
					// 判断是否为当前项
					const elementLineNumber =
						this.expandedLineNumbers.get(element)
					const elementText = element.textContent
						.trim()
						.replace(/\s+/g, ' ')

					let isCurrent = false
					// 现在都使用0-based系统，直接比较
					if (
						targetLineNumber !== null &&
						elementLineNumber === targetLineNumber
					) {
						isCurrent = true
						foundTarget = true
					} else if (
						targetElementText &&
						elementText.includes(targetElementText) &&
						!foundTarget
					) {
						isCurrent = true
						foundTarget = true
					}

					// 先清除该元素的旧高亮
					this.clearHighlightsInElement(element)
					// 重新应用高亮（带当前项状态）
					this.highlightTextInElement(
						element,
						this.currentSearchTerm,
						isCurrent
					)
				}
			}
		}
	}

	// 高亮所有可见元素中的搜索文本
	highlightSearchText(term) {
		if (!term) return

		const elements = this.querySelectorAll('command-item')

		for (const element of elements) {
			// 检查元素是否包含搜索词
			if (element.textContent && element.textContent.includes(term)) {
				// 高亮文本中的匹配部分
				this.highlightTextInElement(element, term)
			}
		}
	}

	// 在元素中高亮文本
	highlightTextInElement(element, term, isCurrent = false) {
		const walker = document.createTreeWalker(
			element,
			NodeFilter.SHOW_TEXT,
			{
				acceptNode: function (node) {
					if (!node.textContent.trim())
						return NodeFilter.FILTER_REJECT
					if (
						node.parentElement &&
						node.parentElement.tagName === 'MARK'
					)
						return NodeFilter.FILTER_REJECT
					return NodeFilter.FILTER_ACCEPT
				}
			}
		)

		const nodesToReplace = []
		let node

		while ((node = walker.nextNode())) {
			const text = node.textContent

			if (text.includes(term)) {
				nodesToReplace.push({
					node: node,
					parent: node.parentNode
				})
			}
		}

		// 替换文本节点为高亮版本
		nodesToReplace.forEach((item) => {
			// 再次确认当前搜索状态是否有效，防止在处理过程中搜索被清除
			if (
				!this.currentSearchTerm ||
				this.currentSearchTerm.trim() === ''
			) {
				return
			}

			const text = item.node.textContent
			const regex = new RegExp(
				term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
				'g'
			)
			const markClass = isCurrent ? 'current-match' : ''
			const highlightedHTML = text.replace(
				regex,
				`<mark class="${markClass}">$&</mark>`
			)

			const span = document.createElement('span')
			span.innerHTML = highlightedHTML

			// 添加搜索标识，方便后续清除
			span.setAttribute('data-search-highlight', 'true')
			span.setAttribute('data-search-term', this.currentSearchTerm)

			try {
				item.parent.replaceChild(span, item.node)
			} catch (e) {}
		})
	}

	// 更新当前选中项的高亮状态
	updateCurrentMatchHighlight() {
		if (
			!this.currentSearchTerm ||
			!this.searchMatches ||
			this.keyboardSelectedIndex < 0
		)
			return

		// 先清除所有当前高亮标记
		const currentMarks = document.querySelectorAll('mark.current-match')
		currentMarks.forEach((mark) => {
			mark.classList.remove('current-match')
		})

		// 获取当前选中的匹配项
		const currentMatch = this.searchMatches[this.keyboardSelectedIndex]
		if (!currentMatch) return

		// 找到对应的元素并高亮
		const elements = this.querySelectorAll('command-item')
		for (const element of elements) {
			const elementLine = this.expandedLineNumbers.get(element)
			// 现在都使用0-based系统，直接比较
			if (elementLine === currentMatch.lineNumber) {
				// 先清除该元素的所有高亮
				this.clearHighlightsInElement(element)
				// 重新高亮，标记为当前项
				this.highlightTextInElement(
					element,
					this.currentSearchTerm,
					true
				)
				break
			}
		}
	}

	// 重新高亮所有匹配项（当前项特殊标记）
	refreshAllHighlights(skipAutoScroll = false) {
		if (!this.currentSearchTerm) return

		// 强制清除所有红色高亮
		const allCurrentMarks = document.querySelectorAll('mark.current-match')
		allCurrentMarks.forEach((mark) => {
			mark.classList.remove('current-match')
		})

		const elements = this.querySelectorAll('command-item')
		const term = this.currentSearchTerm

		// 收集当前可见的所有匹配元素
		const visibleMatches = []
		for (const element of elements) {
			if (element.textContent && element.textContent.includes(term)) {
				visibleMatches.push(element)
			}
		}

		// 列出所有可见匹配元素
		visibleMatches.forEach((element, index) => {
			const lineNumber = this.expandedLineNumbers.get(element)
		})

		// 找出应该显示红色的元素（基于searchMatches索引）
		let targetLineNumber = null
		let targetElementText = null
		if (
			this.searchMatches &&
			this.keyboardSelectedIndex >= 0 &&
			this.keyboardSelectedIndex < this.searchMatches.length
		) {
			const targetMatch = this.searchMatches[this.keyboardSelectedIndex]
			targetLineNumber = targetMatch.lineNumber
			// 标准化文本：去除首尾空格，压缩多个空格为单个空格
			targetElementText = targetMatch.text.trim().replace(/\s+/g, ' ')
		}

		// 对所有匹配元素进行高亮 - 确保只有一个元素被标记为当前项
		let foundTarget = false

		// 调试：显示expandedLineNumbers映射
		const allElements = this.querySelectorAll('command-item')
		allElements.forEach((el, domIndex) => {
			const expandedLine = this.expandedLineNumbers.get(el)
			const text = el.textContent.trim().substring(0, 20)
		})

		for (let i = 0; i < visibleMatches.length; i++) {
			const element = visibleMatches[i]
			// 获取元素的行号
			const elementLineNumber = this.expandedLineNumbers.get(element)
			// 标准化可见元素文本
			const elementText = element.textContent.trim().replace(/\s+/g, ' ')

			// 判断是否为目标元素 - 严格确保只有一个元素被标记为当前项
			let isCurrent = false

			// 如果还没有找到目标，进行匹配判断
			if (!foundTarget) {
				// 严格使用行号匹配，避免文本误匹配
				if (
					targetLineNumber !== null &&
					elementLineNumber === targetLineNumber
				) {
					isCurrent = true
					foundTarget = true
				} else {
				}
			} else {
			}

			// 清除旧高亮
			this.clearHighlightsInElement(element)
			// 应用新高亮
			this.highlightTextInElement(element, term, isCurrent)
		}

		// 如果目标元素不可见，说明需要滚动
		if (targetElementText && !foundTarget && !skipAutoScroll) {
			// 尝试滚动到目标位置
			if (this.searchMatches && this.keyboardSelectedIndex >= 0) {
				const targetMatch =
					this.searchMatches[this.keyboardSelectedIndex]

				// 延迟滚动，确保当前高亮完成
				setTimeout(() => {
					this.scrollToTargetLine(targetMatch.lineNumber, true)

					// 滚动后重新尝试高亮（跳过自动滚动防止循环）
					setTimeout(() => {
						this.refreshAllHighlights(true)
					}, 500)
				}, 100)
			}
		}
	}

	clearAllHighlights() {
		this.clearHighlightsInElement(this)
		this.clearHighlightsInElement(document)

		const containers = document.querySelectorAll(
			'command-list, command-item, .command-content, .event-content'
		)
		containers.forEach((container) => {
			this.clearHighlightsInElement(container)
		})

		this.forceRemoveAllHighlights()
		this.bruteForceRemoveHighlights()
		this.ultimateHighlightRemover()

		if (window.forceRemoveAllMarks) {
			setTimeout(() => {
				window.forceRemoveAllMarks()
			}, 50)
		}

		setTimeout(() => {
			this.validateAndCleanHighlights()
		}, 200)
	}

	// 强制移除所有可能的高亮元素
	forceRemoveAllHighlights() {
		try {
			// 只在命令列表容器内搜索mark元素，避免影响主界面
			const commandList = document.querySelector('command-list')
			if (!commandList) return

			let allMarks = commandList.querySelectorAll('mark')

			// 转换为数组以避免动态NodeList问题
			const marksArray = Array.from(allMarks)

			marksArray.forEach((mark) => {
				try {
					const parent = mark.parentNode
					const text = mark.textContent || ''

					if (parent) {
						// 尝试替换
						try {
							const textNode = document.createTextNode(text)
							parent.replaceChild(textNode, mark)
							parent.normalize()
						} catch (e1) {
							// 如果替换失败，尝试移除后插入文本
							try {
								const nextSibling = mark.nextSibling
								mark.remove()
								const textNode = document.createTextNode(text)
								if (nextSibling) {
									parent.insertBefore(textNode, nextSibling)
								} else {
									parent.appendChild(textNode)
								}
								parent.normalize()
							} catch (e2) {
								// 最后手段 - 直接删除
								try {
									mark.remove()
								} catch (e3) {}
							}
						}
					} else {
						// 没有父节点，直接删除
						try {
							mark.remove()
						} catch (e) {}
					}
				} catch (e) {}
			})

			// 再次检查是否还有mark元素
			const remainingMarks = commandList.querySelectorAll('mark')
			if (remainingMarks.length > 0) {
				remainingMarks.forEach((mark) => {
					try {
						mark.outerHTML = mark.textContent || ''
					} catch (e) {}
				})
			}

			// 在命令列表容器内搜索所有包含黄色背景的元素
			const yellowElements = commandList.querySelectorAll(
				'[style*="background-color"], [style*="background"]'
			)
			yellowElements.forEach((el) => {
				const style = el.getAttribute('style') || ''

				// 更宽泛的检查条件
				if (
					style.includes('#ffff00') ||
					style.includes('yellow') ||
					style.includes('rgb(255, 255, 0)') ||
					style.includes('background-color: #ffff00') ||
					style.includes('background-color:#ffff00') ||
					style.includes('background: #ffff00') ||
					style.includes('background:#ffff00')
				) {
					try {
						// 彻底清除所有背景相关样式
						el.style.backgroundColor = ''
						el.style.background = ''
						el.style.backgroundImage = ''
						el.style.backgroundRepeat = ''
						el.style.backgroundPosition = ''
						el.style.backgroundSize = ''
						el.removeAttribute('style')
					} catch (e) {}
				}
			})

			// 清除所有搜索相关的CSS类
			const searchElements = commandList.querySelectorAll(
				'.search-match, .search-highlight'
			)
			searchElements.forEach((el) => {
				try {
					el.classList.remove('search-match', 'search-highlight')
					el.style.backgroundColor = ''
					el.style.border = ''
					el.style.boxShadow = ''
				} catch (e) {}
			})

			// 清除带有搜索标识的元素
			const searchHighlightElements = commandList.querySelectorAll(
				'[data-search-highlight="true"]'
			)
			searchHighlightElements.forEach((el) => {
				try {
					const parent = el.parentNode
					if (parent && el.textContent) {
						const textNode = document.createTextNode(el.textContent)
						parent.replaceChild(textNode, el)
						parent.normalize()
					}
				} catch (e) {}
			})
		} catch (e) {}
	}

	// 暴力清除：直接扫描所有元素
	bruteForceRemoveHighlights() {
		try {
			// 只清理命令列表容器内的元素，避免影响主界面
			const commandList = document.querySelector('command-list')
			if (!commandList) return

			const allElements = commandList.querySelectorAll('*')

			allElements.forEach((el) => {
				try {
					// 检查元素的样式
					if (el.style) {
						const bgColor = el.style.backgroundColor
						const bg = el.style.background

						if (
							bgColor &&
							(bgColor.includes('#ffff00') ||
								bgColor.includes('yellow') ||
								bgColor.includes('rgb(255, 255, 0)'))
						) {
							el.style.backgroundColor = ''
						}

						if (
							bg &&
							(bg.includes('#ffff00') ||
								bg.includes('yellow') ||
								bg.includes('rgb(255, 255, 0)'))
						) {
							el.style.background = ''
						}
					}

					// 检查style属性
					const styleAttr = el.getAttribute('style')
					if (
						styleAttr &&
						(styleAttr.includes('#ffff00') ||
							styleAttr.includes('yellow'))
					) {
						// 重新设置style属性，过滤掉黄色背景
						const newStyle = styleAttr.replace(
							/background[^;]*[#ffff00|yellow][^;]*;?/gi,
							''
						)
						if (newStyle !== styleAttr) {
							el.setAttribute('style', newStyle)
						}
					}

					// 检查类名
					if (
						el.classList &&
						(el.classList.contains('search-match') ||
							el.classList.contains('search-highlight'))
					) {
						el.classList.remove('search-match', 'search-highlight')
					}

					// 检查data属性
					if (el.hasAttribute('data-search-highlight')) {
						el.removeAttribute('data-search-highlight')
						el.removeAttribute('data-search-term')
					}

					// 如果是mark元素，直接替换
					if (el.tagName === 'MARK') {
						const parent = el.parentNode
						if (parent) {
							const textNode = document.createTextNode(
								el.textContent || ''
							)
							parent.replaceChild(textNode, el)
							parent.normalize()
						}
					}
				} catch (e) {}
			})
		} catch (e) {}
	}

	// 终极高亮清除器：检查innerHTML和计算样式
	ultimateHighlightRemover() {
		try {
			// 只清理命令列表容器内的元素，避免影响主界面
			const commandList = document.querySelector('command-list')
			if (!commandList) return

			// 1. 检查所有元素的innerHTML中是否包含mark标签
			const allElements = commandList.querySelectorAll('*')
			let modifiedCount = 0

			allElements.forEach((el) => {
				try {
					// 检查innerHTML中的mark标签
					if (el.innerHTML && el.innerHTML.includes('<mark')) {
						// 清除innerHTML中的mark标签
						const originalHTML = el.innerHTML
						el.innerHTML = el.innerHTML.replace(
							/<mark[^>]*>(.*?)<\/mark>/gi,
							'$1'
						)
						if (el.innerHTML !== originalHTML) {
							modifiedCount++
						}
					}

					// 检查计算样式
					if (window.getComputedStyle && el.nodeType === 1) {
						const computedStyle = window.getComputedStyle(el)
						const bgColor = computedStyle.backgroundColor

						if (
							bgColor &&
							(bgColor.includes('255, 255, 0') ||
								bgColor === 'yellow' ||
								bgColor === '#ffff00')
						) {
							// 强制覆盖
							el.style.backgroundColor = 'transparent !important'
							el.style.background = 'transparent !important'
							modifiedCount++
						}
					}

					// 检查是否有黄色相关的类名
					if (el.className && typeof el.className === 'string') {
						const classes = el.className.split(' ')
						classes.forEach((cls) => {
							if (
								cls.includes('highlight') ||
								cls.includes('search') ||
								cls.includes('mark')
							) {
								el.classList.remove(cls)
								modifiedCount++
							}
						})
					}

					// 检查文本内容是否被wrapped在span中
					if (el.tagName === 'SPAN' && el.style.backgroundColor) {
						const bgColor = el.style.backgroundColor
						if (
							bgColor.includes('#ffff00') ||
							bgColor.includes('255, 255, 0') ||
							bgColor.includes('yellow')
						) {
							const parent = el.parentNode
							if (parent) {
								const textNode = document.createTextNode(
									el.textContent
								)
								parent.replaceChild(textNode, el)
								parent.normalize()
								modifiedCount++
							}
						}
					}
				} catch (e) {}
			})

			// 2. 强制刷新命令列表的显示
			if (modifiedCount > 0) {
				// 强制重新渲染
				this.style.display = 'none'
				this.offsetHeight // 触发重排
				this.style.display = ''
			}
		} catch (e) {}
	}

	// 验证并清理不应该存在的高亮
	validateAndCleanHighlights() {
		try {
			// 如果没有活跃的搜索，清除所有高亮
			if (
				!this.currentSearchTerm ||
				this.currentSearchTerm.trim() === ''
			) {
				// 只在命令列表容器内查找高亮元素，避免影响主界面
				const commandList = this
				const allHighlights = [
					...commandList.querySelectorAll('mark'),
					...commandList.querySelectorAll(
						'[data-search-highlight="true"]'
					),
					...commandList.querySelectorAll('.search-match'),
					...commandList.querySelectorAll('.search-highlight'),
					...commandList.querySelectorAll('[style*="#ffff00"]'),
					...commandList.querySelectorAll('[style*="yellow"]')
				]

				allHighlights.forEach((el) => {
					try {
						if (el.tagName === 'MARK') {
							// 处理mark元素
							const parent = el.parentNode
							if (parent) {
								const textNode = document.createTextNode(
									el.textContent || ''
								)
								parent.replaceChild(textNode, el)
								parent.normalize()
							}
						} else if (el.hasAttribute('data-search-highlight')) {
							// 处理带搜索标识的元素
							const parent = el.parentNode
							if (parent && el.textContent) {
								const textNode = document.createTextNode(
									el.textContent
								)
								parent.replaceChild(textNode, el)
								parent.normalize()
							}
						} else {
							// 处理其他高亮元素
							el.classList.remove(
								'search-match',
								'search-highlight'
							)
							el.style.backgroundColor = ''
							el.style.border = ''
							el.style.boxShadow = ''
						}
					} catch (e) {}
				})
			}
		} catch (e) {}
	}

	// 清除指定元素内的所有高亮
	clearHighlightsInElement(element) {
		if (!element || !element.querySelectorAll) return

		try {
			// 清除背景高亮
			const matchedElements = element.querySelectorAll('.search-match')
			matchedElements.forEach((el) => {
				el.style.backgroundColor = ''
				el.classList.remove('search-match')
			})

			// 清除单个元素高亮
			const highlightedElements =
				element.querySelectorAll('.search-highlight')
			highlightedElements.forEach((el) => {
				el.classList.remove('search-highlight')
				el.style.backgroundColor = ''
				el.style.border = ''
				el.style.boxShadow = ''
			})

			// 清除文本高亮 - 最彻底的方法
			const marks = element.querySelectorAll('mark')
			const marksArray = Array.from(marks) // 转换为数组，避免动态NodeList问题

			marksArray.forEach((mark) => {
				try {
					const parent = mark.parentNode

					if (!parent) return

					// 创建文本节点替换mark
					const textNode = document.createTextNode(
						mark.textContent || ''
					)

					// 如果mark的父节点是span，检查是否需要替换整个span
					if (parent.tagName === 'SPAN') {
						const grandParent = parent.parentNode

						// 如果span只包含一个mark元素，替换整个span
						if (parent.childNodes.length === 1 && grandParent) {
							grandParent.replaceChild(textNode, parent)
						} else {
							// 否则只替换mark
							parent.replaceChild(textNode, mark)
						}
					} else {
						parent.replaceChild(textNode, mark)
					}

					// 合并相邻的文本节点
					if (textNode.parentNode) {
						textNode.parentNode.normalize()
					}
				} catch (e) {}
			})

			// 清理残留的高亮相关元素
			const spansToCheck = element.querySelectorAll(
				'span[style*="background"], span[style*="color"]'
			)
			spansToCheck.forEach((span) => {
				// 检查是否是高亮相关的span
				const style = span.getAttribute('style') || ''
				if (
					style.includes('background-color') &&
					(style.includes('#ffff00') || style.includes('yellow'))
				) {
					try {
						const parent = span.parentNode
						if (parent && span.textContent) {
							const textNode = document.createTextNode(
								span.textContent
							)
							parent.replaceChild(textNode, span)
							parent.normalize()
						}
					} catch (e) {}
				}
			})

			// 清除可能残留的mark元素（以防第一次没清干净）
			const remainingMarks = element.querySelectorAll('mark')
			remainingMarks.forEach((mark) => {
				try {
					const parent = mark.parentNode
					if (parent) {
						const textNode = document.createTextNode(
							mark.textContent || ''
						)
						parent.replaceChild(textNode, mark)
						parent.normalize()
					}
				} catch (e) {}
			})
		} catch (e) {}
	}

	// 跳转到指定行
	jumpToLine(targetLineNumber) {
		// 保存要高亮的行号
		this.highlightTargetLine = targetLineNumber - 1

		// 查找目标行信息 (内部行号从0开始，显示行号从1开始)
		const targetInfo = this.allCommands.get(targetLineNumber - 1)
		if (!targetInfo) {
			return false
		}

		// 如果命令是折叠的，需要先展开
		if (targetInfo.folded) {
			// 先找到所有需要展开的父命令
			const parentCommands = this.findAllParentCommands(targetInfo)

			// 收集所有需要展开的命令（包括父命令和目标命令本身）
			const commandsToUnfold = []

			// 添加父命令
			for (const parent of parentCommands) {
				if (parent.command && parent.command.folded) {
					commandsToUnfold.push(parent)
				}
			}

			// 检查目标本身是否也需要展开
			if (targetInfo.command && targetInfo.command.folded) {
				commandsToUnfold.push(targetInfo)
			}

			// 展开所有命令
			if (commandsToUnfold.length > 0) {
				// 使用原生的 unfoldCommand，它会递归处理
				// 从最外层的命令开始
				for (const cmdInfo of commandsToUnfold) {
					if (cmdInfo.command) {
						this.unfoldCommand(cmdInfo.command)
					}
				}

				// 等待更新完成
				setTimeout(() => {
					// 再次查找目标（行号可能已改变）
					let targetFound = false
					for (const [lineIndex, info] of this.allCommands) {
						// 通过文本内容匹配目标
						if (info.text === targetInfo.text && !info.folded) {
							// 高亮该元素
							if (info.element) {
								// 延迟确保内容加载
								setTimeout(() => {
									this.highlightElement(info.element)
								}, 100)
							} else {
								// 元素可能不在视口，保持 highlightTargetLine 设置
								this.highlightTargetLine = lineIndex
							}

							targetFound = true
							break
						}
					}

					if (!targetFound) {
						// 尝试直接查找并高亮原行号
						const elements = this.querySelectorAll('command-item')
						for (const el of elements) {
							const lineNum = this.expandedLineNumbers.get(el)
							if (lineNum === targetLineNumber - 1) {
								this.highlightElement(el)
								return
							}
						}
					}
				}, 500)

				return true
			}
		}

		// 直接尝试高亮目标行（如果它没有被折叠）
		if (!targetInfo.folded && targetInfo.element) {
			// 延迟一下确保元素内容已加载
			setTimeout(() => {
				this.highlightElement(targetInfo.element)
			}, 100)
		} else if (!targetInfo.element) {
			// 元素可能不在视口内，尝试查找
			setTimeout(() => {
				const elements = this.querySelectorAll('command-item')
				for (const el of elements) {
					const lineNum = this.expandedLineNumbers.get(el)
					if (lineNum === targetLineNumber - 1) {
						this.highlightElement(el)
						return
					}
				}
			}, 200)
		}

		return true
	}

	// 滚动到目标行
	scrollToTargetLine(lineIndex, enableScroll = false) {
		// 查找目标元素在 elements 数组中的位置
		let targetElementIndex = -1
		let targetElement = null

		// 遍历所有元素找到目标
		for (let i = 0; i < this.elements.count; i++) {
			const element = this.elements[i]
			const elementLine = this.expandedLineNumbers.get(element)
			if (elementLine === lineIndex) {
				targetElementIndex = i
				targetElement = element
				break
			}
		}

		if (targetElementIndex === -1) {
			return
		}

		// 计算滚动位置（每行高度20px）
		const lineHeight = 20
		const targetScrollTop = targetElementIndex * lineHeight
		const containerHeight = this.clientHeight

		// 滚动到目标位置（将目标置于视口中央）
		const centerOffset = Math.floor(containerHeight / 2)
		const scrollTop = Math.max(
			0,
			targetScrollTop - centerOffset + lineHeight / 2
		)

		// 只有在启用滚动时才真正滚动
		if (enableScroll) {
			this.scrollTop = scrollTop
			this.resize()
		}

		// 等待DOM更新后查找并高亮元素
		setTimeout(() => {
			// 再次查找元素（可能已经被重新创建）
			let visibleTarget = null
			const visibleElements = this.querySelectorAll('command-item')

			for (const element of visibleElements) {
				const elementLine = this.expandedLineNumbers.get(element)
				if (elementLine === lineIndex) {
					visibleTarget = element
					break
				}
			}

			if (visibleTarget) {
				// 高亮显示
				this.highlightElement(visibleTarget)
			} else {
				// 保存要高亮的行号
				this.pendingHighlightLine = lineIndex

				// 强制更新视图以渲染目标元素
				this.updateHeadAndFoot()

				// 设置高亮目标行，等待元素创建时自动高亮
				this.highlightTargetLine = lineIndex

				// 强制更新视图以促使元素创建
				this.updateHeadAndFoot()

				// 延迟检查一次，确保元素已经创建
				setTimeout(() => {
					const allItems = this.querySelectorAll('command-item')
					for (const item of allItems) {
						const itemLine = this.expandedLineNumbers.get(item)
						if (itemLine === lineIndex) {
							this.highlightElement(item)
							this.highlightTargetLine = undefined
							return
						}
					}
				}, 500)
			}
		}, 150)
	}

	// 查找包含目标的父命令
	findParentCommand(targetInfo) {
		// 方法1：通过行号范围查找
		// 折叠的命令通常包含多行，我们需要找到包含目标行的折叠命令
		const targetLine = targetInfo.lineNumber - 1 // 转换为0基准

		// 查找所有折叠的命令
		const foldedCommands = []
		for (const [lineIndex, info] of this.allCommands) {
			if (info.command && info.command.folded && !info.folded) {
				// 这是一个折叠的命令的第一行
				foldedCommands.push({ startLine: lineIndex, info: info })
			}
		}

		// 找到包含目标行的折叠命令
		for (const folded of foldedCommands) {
			// 检查目标行是否在这个折叠命令的范围内
			// 通常折叠命令会包含从它开始到下一个同级或更高级命令之间的所有行
			if (
				this.isLineInFoldedCommand(
					targetLine,
					folded.startLine,
					folded.info
				)
			) {
				return folded.info
			}
		}

		// 方法2：通过元素的父子关系查找
		if (targetInfo.element) {
			// 查找元素的dataList和dataItem
			const targetDataItem = targetInfo.element.dataItem
			const targetDataList = targetInfo.element.dataList

			if (targetDataItem && targetDataList) {
				// 遍历所有命令，找到可能是父命令的
				for (const [lineIndex, info] of this.allCommands) {
					if (info.command && info.command.folded) {
						// 检查这个命令是否包含目标
						if (
							this.commandContainsItem(
								info.command,
								targetDataItem,
								targetDataList
							)
						) {
							return info
						}
					}
				}
			}
		}

		return null
	}

	// 查找所有包含目标的父命令（可能有多层嵌套）
	findAllParentCommands(targetInfo) {
		const parentCommands = []
		const targetLine = targetInfo.lineNumber - 1

		// 收集所有折叠的命令
		const foldedCommands = []
		for (const [lineIndex, info] of this.allCommands) {
			if (info.command && info.command.folded && !info.folded) {
				foldedCommands.push({
					startLine: lineIndex,
					info: info,
					indent: info.indent
				})
			}
		}

		// 按缩进级别排序（从外到内）
		foldedCommands.sort((a, b) => a.indent - b.indent)

		// 找到所有包含目标的折叠命令
		for (const folded of foldedCommands) {
			if (
				this.isLineInFoldedCommand(
					targetLine,
					folded.startLine,
					folded.info
				)
			) {
				parentCommands.push(folded.info)
			}
		}

		return parentCommands
	}

	// 检查行是否在折叠命令范围内
	isLineInFoldedCommand(targetLine, foldedStartLine, foldedInfo) {
		// 基本检查：目标行必须在折叠命令之后
		if (targetLine <= foldedStartLine) {
			return false
		}

		// 找到折叠命令的结束位置
		// 通过缩进级别来判断
		const foldedIndent = foldedInfo.indent

		// 从折叠命令的下一行开始，找到第一个缩进级别小于等于折叠命令的行
		for (
			let line = foldedStartLine + 1;
			line < this.allCommands.size;
			line++
		) {
			const info = this.allCommands.get(line)
			if (info && info.indent <= foldedIndent) {
				// 找到了折叠命令的结束位置
				return targetLine < line
			}
		}

		// 如果没有找到结束位置，说明折叠命令延伸到最后
		return true
	}

	// 检查命令是否包含指定项
	commandContainsItem(command, targetItem, targetList) {
		// 检查命令的参数中的子命令
		if (command.params) {
			// 检查 branches (if/switch)
			if (command.params.branches) {
				for (const branch of command.params.branches) {
					if (
						branch.commands === targetList ||
						(branch.commands &&
							branch.commands.includes(targetItem))
					) {
						return true
					}
				}
			}

			// 检查 elseCommands (if)
			if (
				command.params.elseCommands === targetList ||
				(command.params.elseCommands &&
					command.params.elseCommands.includes(targetItem))
			) {
				return true
			}

			// 检查 defaultCommands (switch)
			if (
				command.params.defaultCommands === targetList ||
				(command.params.defaultCommands &&
					command.params.defaultCommands.includes(targetItem))
			) {
				return true
			}

			// 检查 commands (loop等)
			if (
				command.params.commands === targetList ||
				(command.params.commands &&
					command.params.commands.includes(targetItem))
			) {
				return true
			}
		}

		return false
	}

	// 滚动到元素
	scrollToElement(element) {
		if (!element || !element.offsetParent) return

		// 计算元素位置
		const elementTop = element.offsetTop
		const elementHeight = element.offsetHeight
		const containerHeight = this.clientHeight
		const scrollTop = this.scrollTop

		// 计算最佳滚动位置（将元素置于视口中央）
		const targetScrollTop =
			elementTop - containerHeight / 2 + elementHeight / 2

		// 平滑滚动
		this.scrollTo({
			top: Math.max(0, targetScrollTop),
			behavior: 'smooth'
		})
	}

	// 高亮显示元素
	highlightElement(element) {
		if (!element) return

		// 如果有当前搜索词，高亮文本
		if (this.currentSearchTerm) {
			this.highlightTextInElement(element, this.currentSearchTerm)
		}
	}

	// 获取命令的路径（用于显示命令的层级关系）
	getCommandPath(command, parent) {
		const path = []
		if (parent && parent.id) {
			path.push(parent.id)
		}
		if (command && command.id) {
			path.push(command.id)
		}
		return path.join(' > ')
	}

	// 更新指令元素
	updateCommandElement(element) {
		const command = element.dataItem

		// 收集渲染的文本内容
		let renderedText = ''

		// 设置文本缩进
		element.style.textIndent = this.computeTextIndent(element.dataIndent)

		// 创建标记
		if (element.dataKey) {
			const mark = document.createElement('command-mark-major')
			mark.textContent = '>'
			element.insertBefore(mark, element.firstElementChild)
		} else {
			const mark = document.createElement('command-mark-minor')
			mark.textContent = ':'
			element.insertBefore(mark, element.firstElementChild)
		}

		// 创建内容元素
		for (const content of element.contents) {
			// 创建文本
			if (content.text !== undefined) {
				renderedText += content.text + ' '
				const text = document.createElement('command-text')
				text.textContent = content.text
				text.addClass(content.color)
				// 如果存在文本ID，添加类名并侦听相关事件
				if (content.textId) {
					let id = content.textId
					const i = id.indexOf('-')
					const j = id.indexOf('-', i + 1)
					text.varSpace = id.slice(0, i)
					text.varType = id.slice(i + 1, j)
					text.varKey = id.slice(j + 1)
					// 如果是本地变量，添加一个特殊类名用于检查有效性
					switch (text.varSpace) {
						case 'local':
							text.currentType = text.varType
							text.addClass('local-variable-identifier')
							break
						case 'global':
							text.addClass('global-variable-identifier')
							break
						case 'attribute':
						case 'enum': {
							const string = text.varKey
							const i = string.lastIndexOf('-')
							text.varKey = string.slice(0, i)
							text.varId = string.slice(i + 1)
							text.addClass(`${text.varSpace}-identifier`)
							id = id.slice(0, id.lastIndexOf('-'))
							break
						}
						case 'file':
							text.addClass('file-identifier')
							break
						case 'scene':
							text.addClass('scene-identifier')
							break
						case 'ui':
							text.addClass('ui-identifier')
							break
					}
					// 使用name代替class可包含空格问号等特殊字符
					text.name = id
					text.addClass(text.varType + '-type')
					text.addClass('command-text-identifier')
					text.onpointerenter = CommandList.textPointerenter
					text.onpointerleave = CommandList.textPointerleave
				}
				// 如果存在工具提示
				if (content.tooltip) {
					text.setTooltip(content.tooltip)
					text.addClass('plugin-link')
				}
				// 如果存在自定义类名
				if (content.class) {
					if (content.class.indexOf('parent:') === 0) {
						element.addClass(content.class.replace('parent:', ''))
					} else {
						text.addClass(content.class)
					}
				}
				element.appendChild(text)
				continue
			}
		}
		element.contents = null

		// 更新折叠状态
		this.updateCommandElementFold(element)
	}

	// 更新指令元素折叠状态
	updateCommandElementFold(element) {
		if (element?.fold) {
			const command = element.dataItem
			const folded = !!command.folded
			if (element.folded !== folded) {
				element.folded = folded
				if (folded) {
					element.fold.textContent = '+'
					// 在头部列表项中添加省略号
					if (!element.ellipsis) {
						element.ellipsis =
							document.createElement('command-text')
						element.ellipsis.textContent = ' ......'
						element.appendChild(element.ellipsis)
					}
				} else {
					element.fold.textContent = '-'
					// 在头部列表项中移除省略号
					if (element.ellipsis) {
						element.ellipsis.remove()
						element.ellipsis = null
					}
				}
			}
		}
	}

	// 删除指令缓冲区
	deleteCommandBuffers(commands) {
		// 检查 commands 参数是否有效
		if (!commands || !Array.isArray(commands)) {
			return
		}

		for (const command of commands) {
			// 检查 command 是否存在
			if (!command || typeof command !== 'object') {
				continue
			}

			const { buffer } = command
			if (!buffer) continue
			for (const item of buffer) {
				if (item instanceof Array) {
					this.deleteCommandBuffers(item)
				}
			}
			delete command.buffer
		}
	}

	// 创建空项目
	createBlankElement(commands, index, indent, parent) {
		let blank = commands.blank
		if (blank === undefined) {
			// 创建列表项
			blank = document.createElement('command-item')

			// 设置元素属性
			blank.contents = Array.empty
			blank.enabled = true
			blank.dataKey = true
			blank.dataParent = parent
			blank.dataList = commands
			blank.dataItem = null
			blank.dataIndex = index
			blank.dataIndent = indent
			Object.defineProperty(commands, 'blank', {
				value: blank
			})
		}

		// 更新数据索引
		if (blank.dataIndex !== index) {
			blank.dataIndex = index
		}

		// 更新开关状态
		if (parent) {
			const { enabled } = parent.buffer
			if (blank.enabled !== enabled) {
				blank.enabled = enabled
				if (enabled) {
					blank.removeClass('disabled')
				} else {
					blank.addClass('disabled')
				}
			}
		}

		return blank
	}

	// 计算文本缩进
	computeTextIndent(indent) {
		switch (Local.language) {
			case 'en-US':
				return indent * 4 + 'ch'
			default:
				return indent * 2 + 'em'
		}
	}

	// 选择项目
	select(start, end = start) {
		if (start > end) {
			;[start, end] = [end, start]
		}

		// 限制范围
		const elements = this.elements
		const count = elements.count
		start = Math.clamp(start, 0, count - 1)
		end = Math.clamp(end, 0, count - 1)
		let indent = Infinity
		for (let i = start; i <= end; i++) {
			const { dataIndent } = elements[i]
			if (dataIndent < indent) {
				indent = dataIndent
			}
		}
		for (let i = start; i >= 0; i--) {
			const element = elements[i]
			if (element.dataIndent === indent && element.dataKey === true) {
				start = i
				break
			}
		}
		for (let i = end + 1; i < count; i++) {
			const element = elements[i]
			if (
				element.dataIndent < indent ||
				(element.dataIndent === indent && element.dataKey === true)
			) {
				end = i - 1
				break
			}
		}
		if (start !== end) {
			const element = elements[end]
			if (!element.dataItem) {
				end--
			}
		}

		// 取消选择
		this.unselect()

		// 更新属性
		this.start = start
		this.end = end
		this.origin = start
		this.active = start
		this.anchor = null

		// 选择目标
		this.reselect()
	}

	// 选择多个项目
	selectMultiple(active) {
		const origin = this.origin
		this.select(origin, active)
		this.origin = origin
		this.active = Math.clamp(active, this.start, this.end)
	}

	// 选择全部项目
	selectAll() {
		this.select(0, Infinity)
		this.active = this.getRangeByIndex(this.end)[0]
	}

	// 取消选择
	unselect() {
		if (this.start !== null) {
			const { selections } = this
			const { count } = selections
			for (let i = 0; i < count; i++) {
				selections[i].removeClass('selected')
				selections[i] = undefined
			}
			selections.count = 0
			if (count > 256) {
				selections.length = 0
			}
		}
	}

	// 重新选择
	reselect() {
		if (this.focusing && this.start !== null) {
			const { selections } = this
			const elements = this.elements
			const start = this.start
			const end = this.end
			let count = 0
			for (let i = start; i <= end; i++) {
				const element = elements[i]
				selections[count++] = element
				element.addClass('selected')
			}
			selections.count = count
		}
	}

	// 向上选择项目
	selectUp() {
		if (this.start !== null) {
			const elements = this.elements
			const sData = elements[this.start].dataItem
			const eData = elements[this.end].dataItem
			let i = this.start
			if (sData === eData) {
				while (--i >= 0) {
					if (elements[i].dataKey) {
						break
					}
				}
			}
			this.select(i)
			this.scrollToSelection()
		}
	}

	// 向下选择
	selectDown() {
		if (this.start !== null) {
			const elements = this.elements
			const sData = elements[this.start].dataItem
			const eData = elements[this.end].dataItem
			let i = this.end
			if (sData === eData) {
				const eElement = elements[i]
				if (!eElement.dataKey) {
					const data = eElement.dataItem
					while (--i >= 0) {
						const element = elements[i]
						if (
							element.dataItem === data &&
							element.dataKey === true
						) {
							break
						}
					}
				}
				const { count } = elements
				while (++i < count) {
					if (elements[i].dataKey) {
						break
					}
				}
			}
			this.select(i)
			this.scrollToSelection()
		}
	}

	// 向上翻页
	pageUp(select) {
		let anchor = this.anchor
		if (anchor === null) {
			anchor = this.active
		}
		if (anchor !== null) {
			const scrollLines = Math.floor(this.innerHeight / 20) - 1
			const scrollTop = Math.max(this.scrollTop - scrollLines * 20, 0)
			if (select) {
				const bottom = this.scrollTop + this.innerHeight
				const bottomIndex = Math.floor(bottom / 20) - 1
				const targetIndex = Math.min(anchor, bottomIndex) - scrollLines
				this.select(targetIndex)
				this.anchor = Math.max(targetIndex, this.start)
			}
			this.scroll(0, scrollTop)
		}
	}

	// 向下翻页
	pageDown(select) {
		let anchor = this.anchor
		if (anchor === null) {
			anchor = this.active
		}
		if (anchor !== null) {
			const top = this.scrollTop
			const scrollLines = Math.floor(this.innerHeight / 20) - 1
			let scrollTop = top + scrollLines * 20
			if (select) {
				const topIndex = Math.floor(top / 20)
				const targetIndex = Math.max(anchor, topIndex) + scrollLines
				const scrollBottom = this.elements.count * 20
				const scrollTopMax = scrollBottom - this.innerHeight
				this.select(targetIndex)
				this.anchor = Math.min(targetIndex, this.end)
				scrollTop = Math.min(scrollTop, scrollTopMax)
			}
			this.scroll(0, Math.max(top, scrollTop))
		}
	}

	// 选择指定位置的多个项目
	selectMultipleTo(index) {
		if (this.start !== null) {
			this.selectMultiple(index)
			const elements = this.elements
			const sElement = elements[this.start]
			const aElement = elements[this.active]
			const sIndent = sElement.dataIndent
			const aIndent = aElement.dataIndent
			let n = this.active
			if (sIndent < aIndent) {
				for (let i = n - 1; i >= 0; i--) {
					const element = elements[i]
					if (
						element.dataIndent === sIndent &&
						element.dataKey === true
					) {
						n = i
						break
					}
				}
			}
			const range = this.getRangeByIndex(n)
			if (
				this.origin < this.active &&
				this.origin > range[0] &&
				this.origin < range[1]
			) {
				this.active = range[1]
			} else {
				this.active = range[0]
			}
		}
	}

	// 向上选择多个项目
	selectMultipleUp() {
		if (this.start !== null) {
			const elements = this.elements
			if (this.active <= this.origin) {
				const sElement = elements[this.start]
				const indent = sElement.dataIndent
				let i = this.start
				while (--i >= 0) {
					const element = elements[i]
					if (
						element.dataIndent <= indent &&
						element.dataKey === true
					) {
						this.selectMultiple(i)
						break
					}
				}
			} else {
				const eElement = elements[this.end]
				const data = eElement.dataItem
				const end = this.end
				let indent = Infinity
				let n = this.origin
				for (let i = n; i < end; i++) {
					const element = elements[i]
					if (element.dataIndent < indent) {
						indent = element.dataIndent
					}
					if (
						element.dataIndent === indent &&
						element.dataItem !== data &&
						element.dataItem !== null
					) {
						n = i
					}
				}
				const range = this.getRangeByIndex(n)
				if (
					this.origin < n &&
					this.origin > range[0] &&
					this.origin < range[1]
				) {
					n = range[1]
				} else {
					n = range[0]
				}
				this.selectMultiple(n)
			}
			this.scrollToSelection()
		}
	}

	// 向下选择多个项目
	selectMultipleDown() {
		if (this.start !== null) {
			const elements = this.elements
			if (this.active >= this.origin) {
				const eElement = elements[this.end]
				const indent = eElement.dataIndent
				const count = elements.count
				let i = this.end
				while (++i < count) {
					const element = elements[i]
					if (element.dataIndent < indent) {
						i = this.getRangeByIndex(i)[1]
						break
					}
					if (
						element.dataIndent === indent &&
						element.dataKey === true &&
						element.dataItem !== null
					) {
						break
					}
				}
				this.selectMultiple(i)
			} else {
				const start = this.start
				let indent = Infinity
				let n = this.origin
				for (let i = n; i > start; i--) {
					const element = elements[i]
					if (element.dataIndent < indent) {
						indent = element.dataIndent
					}
					if (
						element.dataIndent === indent &&
						element.dataKey === true
					) {
						n = i
					}
				}
				this.selectMultiple(n)
			}
			this.scrollToSelection()
		}
	}

	// 滚动到选中项
	scrollToSelection(mode = 'active') {
		if (this.start !== null) {
			let scrollTop
			switch (mode) {
				case 'active': {
					const range = this.getRangeByIndex(this.active)
					const top = this.scrollTop
					const max = range[0] * 20
					const min = range[1] * 20 + 20 - this.innerHeight
					scrollTop =
						this.active <= this.origin
							? Math.min(Math.max(top, min), max)
							: Math.max(Math.min(top, max), min)
					break
				}
				case 'alter': {
					const top = this.scrollTop
					const max = this.active * 20
					const min = this.active * 20 + 20 - this.innerHeight
					scrollTop = Math.max(Math.min(top, max), min)
					break
				}
				case 'restore': {
					const top = this.scrollTop
					const max = this.start * 20
					const min = this.end * 20 + 20 - this.innerHeight
					scrollTop = Math.min(Math.max(top, min), max)
					break
				}
				default:
					return
			}
			if (this.scrollTop !== scrollTop) {
				this.scrollTop = scrollTop
			}
		}
	}

	// 滚动并重新调整
	scrollAndResize() {
		const scrolltop = this.scrollTop
		this.scrollToSelection('active')
		if (this.scrollTop !== scrolltop) {
			this.resize()
		}
	}

	// 获取指定索引的项目范围
	getRangeByIndex(index) {
		const elements = this.elements
		const count = elements.count
		const element = elements[index]
		const data = element.dataItem
		const indent = element.dataIndent
		let start = index
		let end = index
		for (let i = index; i >= 0; i--) {
			const element = elements[i]
			if (element.dataItem === data && element.dataKey === true) {
				start = i
				break
			}
		}
		for (let i = index + 1; i < count; i++) {
			const element = elements[i]
			if (
				element.dataIndent < indent ||
				(element.dataIndent === indent && element.dataKey === true)
			) {
				end = i - 1
				break
			}
		}
		return [start, end]
	}

	// 获取指定数据的项目范围
	getRangeByData(data) {
		const elements = this.elements
		const count = elements.count
		let indent
		let start = 0
		let end = 0
		for (let i = 0; i < count; i++) {
			const element = elements[i]
			if (element.dataItem === data) {
				indent = element.dataIndent
				start = i
				break
			}
		}
		for (let i = start + 1; i < count; i++) {
			const element = elements[i]
			if (
				element.dataIndent < indent ||
				(element.dataIndent === indent && element.dataKey === true)
			) {
				end = i - 1
				break
			}
		}
		return [start, end]
	}

	// 判断列表项父对象是否启用
	isParentEnabled(element) {
		return element.dataParent?.buffer?.enabled ?? true
	}

	// 插入指令
	insert(id = '') {
		if (this.start !== null) {
			const elements = this.elements
			const element = elements[this.start]
			if (!this.isParentEnabled(element)) {
				return
			}
			this.inserting = true
			Command.insert(this, id)
		}
	}

	// 编辑指令
	edit() {
		if (this.start !== null) {
			const elements = this.elements
			const element = elements[this.start]
			if (!this.isParentEnabled(element)) {
				return
			}
			this.inserting = element.dataItem === null
			switch (this.inserting) {
				case true:
					Command.insert(this, '')
					break
				case false: {
					const command = element.dataItem
					if (command.buffer.enabled) {
						Command.edit(this, command)
					}
					break
				}
			}
		}
	}

	// Fold/unfold command
	fold(element) {
		if (element === undefined && this.start !== null) {
			const elements = this.elements
			const startItem = elements[this.start].dataItem
			const endItem = elements[this.end].dataItem
			if (startItem === endItem) {
				element = elements[this.start]
			}
		}
		if (element && element.fold) {
			const command = element.dataItem
			if (element.dataKey && command) {
				if (command.folded) {
					delete command.folded
				} else {
					command.folded = true
				}
				this.update()
				this.updateCommandElementFold(element)
				this.reselectAfterFolding()
				this.dispatchChangeEvent()
			}
		}
	}

	// 展开指令
	unfoldCommand(command) {
		let changed = false
		const commands = []
		// 似乎粘贴撤销后，可能因为dataParent重复而陷入死循环，因此检查command的重复性
		while (command && !commands.includes(command)) {
			commands.push(command)
			const element = command.buffer?.[0]
			if (command.folded) {
				delete command.folded
				this.updateCommandElementFold(element)
				changed = true
			}
			if (element) {
				command = element.dataParent
			}
		}
		if (changed) {
			this.update()
		}
	}

	// 折叠后重新选择列表项
	reselectAfterFolding() {
		let head
		let foot
		const { selections } = this
		const { count } = selections
		for (let i = 0; i < count; i++) {
			const element = selections[i]
			if (element.parentNode) {
				if (head === undefined) {
					head = element
				}
				foot = element
			}
		}
		if (head) {
			const start = this.elements.indexOf(head)
			const end = this.elements.indexOf(foot)
			this.select(start, end)
		} else {
			this.unselect()
			this.start = null
			this.end = null
		}
	}

	// 开关指令
	toggle() {
		if (this.start !== null) {
			const { elements, start, end } = this
			const element = elements[start]
			if (!this.isParentEnabled(element)) {
				return
			}
			let method = 'disable'
			const commands = []
			const append = (element) => {
				if (element.dataKey && element.dataItem) {
					const command = element.dataItem
					// 直接使用指令ID判断，避免使用折叠后未刷新的状态
					const enabled = command.id[0] !== '!'
					switch (method) {
						case 'disable':
							if (!enabled) {
								method = 'enable'
								commands.length = 0
							}
							commands.append(command)
							break
						case 'enable':
							if (!enabled) {
								commands.append(command)
							}
							break
					}
					if (command.folded) {
						for (const object of command.buffer) {
							if (!Array.isArray(object)) continue
							for (const child of object) {
								if (!child.buffer) continue
								for (const element of child.buffer) {
									if (element instanceof HTMLElement) {
										append(element)
									}
								}
							}
						}
					}
				}
			}
			for (let i = start; i <= end; i++) {
				append(elements[i])
			}
			if (commands.length !== 0) {
				this.history.save({
					type: 'toggle',
					parent: element.dataParent,
					method: method,
					commands: commands
				})
				switch (method) {
					case 'enable':
						this.enableItems(commands)
						break
					case 'disable':
						this.disableItems(commands)
						break
				}
				this.update()
				this.dispatchChangeEvent()
			}
		}
	}

	// 启用项目
	enableItems(commands) {
		for (const command of commands) {
			if (command.id[0] === '!') {
				command.id = command.id.slice(1)
			}
		}
	}

	// 禁用项目
	disableItems(commands) {
		for (const command of commands) {
			if (command.id[0] !== '!') {
				command.id = '!' + command.id
			}
		}
	}

	// 复制项目
	copy() {
		if (this.start !== null) {
			const elements = this.elements
			const sElement = elements[this.start]
			const eElement = elements[this.end]
			const list = sElement.dataList
			const start = sElement.dataIndex
			const end = eElement.dataIndex + 1
			const copies = list.slice(start, end)
			if (copies.length > 0) {
				Clipboard.write('yami.commands', copies)
			}
		}
	}

	// 复制为文本
	copyAsText() {
		if (this.start !== null) {
			let string = ''
			let lastIndent
			const { start, end, elements } = this
			for (let i = start; i <= end; i++) {
				const element = elements[i]
				if (element.contents !== null) {
					this.updateCommandElement(element)
				}
				let indent = element.dataIndent
				// 如果当前缩进已经打印过至少一条指令，跳过无效指令
				if (element.dataItem === null && lastIndent === indent) {
					continue
				}
				lastIndent = indent
				while (indent-- > 0) string += '　　'
				for (const node of element.children) {
					if (node.tagName === 'COMMAND-FOLD') {
						continue
					}
					if (node.hasClass('transparent')) {
						// 添加空白指令字符
						string += ''.padStart(
							node.textContent.length,
							Local.get('command.blankCommandChar')
						)
					} else if (node.hasClass('comment')) {
						// 添加注释指令前缀
						string = string.slice(0, -1) + '#' + node.textContent
					} else {
						string += node.textContent
					}
				}
				string += '\n'
			}
			navigator.clipboard.writeText(string.trim())
		}
	}

	// 粘贴项目
	paste() {
		if (this.start !== null) {
			const elements = this.elements
			const element = elements[this.start]
			if (!this.isParentEnabled(element)) {
				return
			}
			const copies = Clipboard.read('yami.commands')
			if (copies) {
				const parent = element.dataParent
				const list = element.dataList
				const start = element.dataIndex
				const count = elements.count
				this.history.save({
					type: 'insert',
					parent: parent,
					array: list,
					index: start,
					commands: copies
				})
				list.splice(start, 0, ...copies)
				this.update()
				this.select(this.start + elements.count - count)
				this.scrollToSelection('alter')
				this.dispatchChangeEvent()
			}
		}
	}

	// 删除项目
	delete() {
		if (this.start !== null) {
			const elements = this.elements
			const sElement = elements[this.start]
			const eElement = elements[this.end]
			const parent = sElement.dataParent
			const list = sElement.dataList
			const start = sElement.dataIndex
			const end = eElement.dataIndex + 1
			const commands = list.slice(start, end)
			if (commands.length > 0) {
				this.history.save({
					type: 'delete',
					parent: parent,
					array: list,
					index: start,
					commands: commands
				})
				list.splice(start, end - start)
				this.update()
				this.outputAllCommands()
				this.select(this.start)
				this.scrollToSelection('alter')
				this.dispatchChangeEvent()
			}
		}
	}

	// 撤销操作
	undo() {
		if (!this.dragging && this.history.canUndo()) {
			this.history.restore('undo')
		}
	}

	// 重做操作
	redo() {
		if (!this.dragging && this.history.canRedo()) {
			this.history.restore('redo')
		}
	}

	// 保存指令
	save(command) {
		if (this.start !== null) {
			const elements = this.elements
			const element = elements[this.start]
			const parent = element.dataParent
			const list = element.dataList
			const index = element.dataIndex
			switch (this.inserting) {
				case true:
					this.history.save({
						type: 'insert',
						parent: parent,
						array: list,
						index: index,
						commands: [command]
					})
					this.end = this.start
					list.splice(index, 0, command)
					this.update()
					this.outputAllCommands()
					this.selectDown()
					break
				case false:
					// 将新旧指令打包到一个数组中
					// 便于切换语言删除缓存时使用
					this.history.save({
						type: 'replace',
						parent: parent,
						array: list,
						index: index,
						commands: [list[index], command]
					})
					list[index] = command
					this.update()
					this.outputAllCommands()
					this.select(this.start)
					break
			}
			this.scrollToSelection('alter')
			this.dispatchChangeEvent()
		}
	}

	// 获取选中项的位置
	getSelectionPosition() {
		if (this.start === null) {
			return null
		}
		const elements = this.elements
		const element = elements[this.start]
		if (!element.parentNode) {
			return null
		}
		let x = element.childNodes[0].rect().left
		let y = element.rect().top
		// 应用窗口带边框需要减去1px的margin
		if (document.body.hasClass('border')) {
			const dpx = 1 / window.devicePixelRatio
			x -= dpx
			y -= dpx
		}
		return { x, y }
	}

	// 清除元素
	clearElements(start) {
		return CommonList.clearElements(this, start)
	}

	// 清除列表
	clear() {
		this.unselect()
		this.textContent = ''
		this.data = null
		this.varList = null
		this.varMap = null
		this.start = null
		this.end = null
		this.origin = null
		this.active = null
		this.anchor = null
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 分析变量数据
	analyzeVariables() {
		// 检查左值变量
		function checkLeftValue(variable) {
			const { name, type } = variable
			if (flags[name]) {
				// 如果已经存在同名变量
				let varItem = varMap[name + type]
				if (varItem === undefined) {
					if (type !== 'any') {
						varItem = varMap[name + 'any']
						// 修改any类型的变量为具体类型
						if (varItem) varItem.type = type
					} else {
						varItem =
							varMap[name + 'boolean'] ??
							varMap[name + 'number'] ??
							varMap[name + 'string'] ??
							varMap[name + 'object']
					}
				}
				// 增加变量的引用计数
				if (varItem) varItem.refCount++
			} else {
				// 首次添加该左值变量
				flags[name] = true
				varMap[name + type] = variable
				varList.push(variable)
			}
		}

		// 检查操作数变量
		function checkOperator(variable) {
			const { name, type } = variable
			if (flags[name]) {
				// 如果已经存在同名变量
				const varItem =
					type !== 'any'
						? (varMap[name + type] ?? varMap[name + 'any'])
						: (varMap[name + type] ??
							varMap[name + 'boolean'] ??
							varMap[name + 'number'] ??
							varMap[name + 'string'] ??
							varMap[name + 'object'])
				// 增加变量的引用计数
				if (varItem) varItem.refCount++
			} else {
				// 如果不存在变量，添加并提示用户
				flags[name] = true
				varMap[name + type] = variable
				varList.push(variable)
				variable.class = 'error'
				variable.refCount++
			}
		}

		// 初始化相关变量
		const varMap = {}
		const varList = []
		const leftValues = []
		const operators = []
		const flags = { '': true }

		// 获取指令列表中的所有变量
		for (const variable of Command.fetchVariables(this.read())) {
			;(variable.isLeftValue ? leftValues : operators).push(variable)
		}

		// 检查左值列表中的变量
		for (const variable of leftValues) {
			checkLeftValue(variable)
		}

		// 检查操作数列表中的变量
		for (const variable of operators) {
			checkOperator(variable)
		}

		// 设置变量的图标类名
		for (const variable of varList) {
			variable.icon = `icon-${variable.type}`
		}

		// 按类型和名称排序列表项，并返回
		const orders = {
			boolean: 0,
			number: 1,
			string: 2,
			object: 3,
			any: 4
		}
		varList.sort((a, b) => {
			if (a.evIndex !== b.evIndex) {
				return a.evIndex - b.evIndex
			}
			if (a.type !== b.type) {
				return orders[a.type] - orders[b.type]
			}
			return a.name.localeCompare(b.name)
		})
		this.varList = varList
		this.varMap = varMap
		return { varList, varMap }
	}

	// 检查变量有效性
	checkVariables() {
		// 检查本地变量
		const varMap = this.varMap
		const varTypes = ['boolean', 'number', 'string', 'object', 'any']
		for (const text of document.getElementsByClassName(
			'local-variable-identifier'
		)) {
			const type = text.varType
			const key = text.varKey
			// 排除none变量
			if (!key) continue
			let varItem
			if (type !== 'any') {
				varItem = varMap[key + type] ?? varMap[key + 'any']
			} else {
				for (const varType of varTypes) {
					if ((varItem = varMap[key + varType])) {
						if (text.currentType !== varType) {
							text.removeClass(text.currentType + '-type')
							text.currentType = varType
							text.addClass(varType + '-type')
						}
						break
					}
				}
			}
			if (
				varItem ? varItem.isLeftValue && varItem.refCount === 0 : false
			) {
				text.addClass('no-ref')
			} else {
				text.removeClass('no-ref')
			}
			if (varItem ? varItem.class !== 'error' : false) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
		}

		// 检查全局变量
		for (const text of document.getElementsByClassName(
			'global-variable-identifier'
		)) {
			const key = text.varKey
			if (key === '') continue
			const variable = Data.variables.map[key]
			if (variable) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
			const varName = variable
				? variable.name
				: Command.parseUnlinkedId(key)
			if (text.textContent !== varName) {
				text.textContent = varName
			}
		}

		// 检查属性
		for (const text of document.getElementsByClassName(
			'attribute-identifier'
		)) {
			const id = text.varId
			const attr = Attribute.getAttribute(id)
			if (attr) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
			// 忽略textId的更新，重开一下事件编辑器就好了
			const attrName = attr
				? GameLocal.replace(attr.name)
				: Command.parseUnlinkedId(id)
			if (text.textContent !== attrName) {
				text.textContent = attrName
			}
		}

		// 检查枚举
		for (const text of document.getElementsByClassName('enum-identifier')) {
			const id = text.varId
			const string = Enum.getString(id)
			if (string) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
			// 忽略textId的更新，重开一下事件编辑器就好了
			const stringName = string
				? GameLocal.replace(string.name)
				: Command.parseUnlinkedId(id)
			if (text.textContent !== stringName) {
				text.textContent = stringName
			}
		}

		// 检查文件
		for (const text of document.getElementsByClassName('file-identifier')) {
			const fileId = text.varKey
			if (fileId === '') continue
			const meta = Data.manifest.guidMap[fileId]
			if (meta) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
			const fileName = meta
				? meta.file.basename
				: Command.parseUnlinkedId(fileId)
			if (text.textContent !== fileName) {
				text.textContent = fileName
			}
		}

		// 检查场景对象
		for (const text of document.getElementsByClassName(
			'scene-identifier'
		)) {
			const presetId = text.varKey
			if (presetId === '') continue
			const preset = Data.scenePresets[presetId]
			if (preset) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
		}

		// 检查界面元素
		for (const text of document.getElementsByClassName('ui-identifier')) {
			const presetId = text.varKey
			if (presetId === '') continue
			const preset = Data.uiPresets[presetId]
			if (preset) {
				text.removeClass('invalid')
			} else {
				text.addClass('invalid')
			}
		}
	}

	// 尝试从数据中获取事件ID
	tryGetEventId(data) {
		const id = data?.id
		if (id === 'callEvent' || id === '!callEvent') {
			if (data.params.type === 'global') {
				return data.params.eventId
			}
		}
		return undefined
	}

	// 获得焦点事件
	listFocus(event) {
		if (!this.focusing) {
			this.focusing = true
			this.start !== null ? this.reselect() : this.select(0)
		}
	}

	// 失去焦点事件
	listBlur(event) {
		if (this.dragging) {
			this.windowPointerup(this.dragging)
		}
		if (this.focusing) {
			let element = this
			while ((element = element.parentNode)) {
				if (element instanceof WindowFrame) {
					if (element.hasClass('blur')) {
						return
					} else {
						break
					}
				}
			}
			this.focusing = false
			this.unselect()
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'KeyX':
					this.copy()
					this.delete()
					break
				case 'KeyC':
					this.copy()
					break
				case 'KeyV':
					this.paste()
					break
				case 'KeyA':
					this.selectAll()
					break
				case 'KeyZ':
					if (!event.macRedoKey) {
						this.undo()
						break
					}
				case 'KeyY':
					this.redo()
					break
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
				case 'Home':
					// Ctrl+Home会触发默认行为
					event.preventDefault()
					this.scroll(0, 0)
					break
				case 'End':
					// Ctrl+End会触发默认行为
					event.preventDefault()
					this.scroll(0, this.scrollHeight)
					break
				case 'PageUp':
					this.pageUp(false)
					break
				case 'PageDown':
					this.pageDown(false)
					break
			}
		} else if (event.altKey) {
			return
		} else if (event.shiftKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.selectMultipleUp()
					break
				case 'ArrowDown':
					this.selectMultipleDown()
					break
				case 'Home':
					this.selectMultipleTo(0)
					this.scrollToSelection()
					break
				case 'End':
					this.selectMultipleTo(Infinity)
					this.scrollToSelection()
					break
			}
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault()
					this.insert()
					return
				case 'Enter':
				case 'NumpadEnter':
					if (this.start !== null) {
						event.stopPropagation()
						const elements = this.elements
						const sData = elements[this.start].dataItem
						const eData = elements[this.end].dataItem
						if (sData === eData) {
							this.edit()
						}
					}
					break
				case 'Insert':
					this.insert()
					break
				case 'Slash':
					this.toggle()
					break
				case 'Backslash':
					this.insert('script')
					break
				case 'Delete':
					this.delete()
					break
				case 'ArrowUp':
					event.preventDefault()
					this.selectUp()
					break
				case 'ArrowDown':
					event.preventDefault()
					this.selectDown()
					break
				case 'ArrowRight':
					this.fold()
					break
				case 'Home':
					event.preventDefault()
					this.scroll(0, 0)
					this.select(0)
					break
				case 'End': {
					event.preventDefault()
					const scrollBottom = this.elements.count * 20
					const scrollTop = scrollBottom - this.innerHeight
					this.scroll(0, Math.max(this.scrollTop, scrollTop))
					this.select(Infinity)
					break
				}
				case 'PageUp':
					event.preventDefault()
					this.pageUp(true)
					break
				case 'PageDown':
					event.preventDefault()
					this.pageDown(true)
					break
				default:
					if (CommandList.alphabetCode.test(event.code)) {
						this.insert()
						// 获取搜索框焦点可以捕获这次输入
						CommandSuggestion.searcher.input.focus()
					}
					break
			}
		}
	}

	// 指针按下事件
	pointerdown(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 0: {
				let element = event.target
				let index
				if (element === this) {
					if (element.isInContent(event)) {
						index = this.elements.count - 1
					}
				} else if (element.tagName === 'COMMAND-FOLD') {
					this.fold(element.parentNode)
					break
				} else {
					element = element.seek('command-item', 2)
					if (element.tagName === 'COMMAND-ITEM') {
						index = element.read()
					}
				}
				if (index >= 0) {
					element = this.elements[index]
					if (event.shiftKey && this.start !== null) {
						this.selectMultipleTo(index)
					} else {
						this.select(index)
						if (event.altKey) {
							const eventId = this.tryGetEventId(element.dataItem)
							if (eventId) {
								EventEditor.openGlobalEvent(eventId)
								// 阻止focus后快捷键不被禁用的情况
								event.preventDefault()
								event.stopImmediatePropagation()
								return
							}
						}
					}
					this.dragging = event
					event.mode = 'select'
					event.itemIndex = index
					event.itemHeight = element.clientHeight
					window.on('pointerup', this.windowPointerup)
					window.on('pointermove', this.windowPointermove)
					this.addScrollListener('vertical', 2, true, () => {
						this.windowPointermove(event.latest)
					})
				}
				break
			}
			case 2: {
				let element = event.target
				let index
				if (element === this) {
					if (element.isInContent(event)) {
						index = this.elements.count - 1
					}
				} else {
					element = element.seek('command-item')
					if (element.tagName === 'COMMAND-ITEM') {
						index = element.read()
					}
				}
				if (index >= 0) {
					const element = this.elements[index]
					if (!element.hasClass('selected')) {
						this.select(index)
					}
				}
				break
			}
		}
	}

	// 指针弹起事件
	pointerup(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 2:
				if (this.start !== null && document.activeElement === this) {
					const elements = this.elements
					const sElement = elements[this.start]
					const dElement = elements[this.end]
					const sData = sElement.dataItem
					const eData = dElement.dataItem
					const valid = !!sData
					const pEnabled = this.isParentEnabled(sElement)
					const sEnabled = valid ? sData.buffer.enabled : pEnabled
					const editable = sEnabled && sData === eData
					const pastable = pEnabled && Clipboard.has('yami.commands')
					const allSelectable = this.data.length > 0
					const undoable = this.history.canUndo()
					const redoable = this.history.canRedo()
					const get = Local.createGetter('menuCommandList')
					const menuItems = [
						{
							label: get('edit'),
							accelerator: 'Enter',
							enabled: editable,
							click: () => {
								this.edit()
							}
						},
						{
							label: get('insert'),
							accelerator: 'Insert',
							enabled: pEnabled,
							click: () => {
								this.insert()
							}
						},
						{
							label: get('toggle'),
							accelerator: '/',
							enabled: pEnabled && valid,
							click: () => {
								this.toggle()
							}
						},
						{
							label: get('script'),
							accelerator: '\\',
							enabled: pEnabled,
							click: () => {
								this.insert('script')
							}
						},
						{
							type: 'separator'
						},
						{
							label: get('cut'),
							accelerator: ctrl('X'),
							enabled: valid,
							click: () => {
								this.copy()
								this.delete()
							}
						},
						{
							label: get('copy'),
							accelerator: ctrl('C'),
							enabled: valid,
							click: () => {
								this.copy()
							}
						},
						{
							label: get('paste'),
							accelerator: ctrl('V'),
							enabled: pastable,
							click: () => {
								this.paste()
							}
						},
						{
							label: get('delete'),
							accelerator: 'Delete',
							enabled: valid,
							click: () => {
								this.delete()
							}
						},
						{
							label: get('selectAll'),
							accelerator: ctrl('A'),
							enabled: allSelectable,
							click: () => {
								this.select(0, Infinity)
							}
						},
						{
							label: get('undo'),
							accelerator: ctrl('Z'),
							enabled: undoable,
							click: () => {
								this.undo()
							}
						},
						{
							label: get('redo'),
							accelerator: ctrl('Y'),
							enabled: redoable,
							click: () => {
								this.redo()
							}
						}
					]
					// 添加跳转到事件选项
					if (sData === eData) {
						const eventId = this.tryGetEventId(sData)
						if (eventId) {
							menuItems.push({
								label: get('open-event'),
								accelerator: 'Alt+LB',
								click: () => {
									EventEditor.openGlobalEvent(eventId)
								}
							})
						}
					}
					menuItems.push({
						label: get('copy-as-text'),
						enabled: valid,
						click: () => {
							this.copyAsText()
						}
					})
					Menu.popup(
						{
							x: event.clientX,
							y: event.clientY
						},
						menuItems
					)
				}
				break
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		if (this.start !== null && event.target.tagName !== 'COMMAND-FOLD') {
			const elements = this.elements
			const sData = elements[this.start].dataItem
			const eData = elements[this.end].dataItem
			if (sData === eData) {
				this.edit(sData)
			}
		}
	}

	// 正则表达式 - 英文字母键码
	static alphabetCode = /^Key[A-Z]$/

	// 窗口 - 指针弹起事件
	static windowPointerup(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'select':
					this.removeScrollListener()
					break
			}
			this.dragging = null
			window.off('pointerup', this.windowPointerup)
			window.off('pointermove', this.windowPointermove)
		}
	}

	// 窗口 - 指针移动事件
	static windowPointermove(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'select': {
					dragging.latest = event
					const elements = this.elements
					const count = elements.count
					if (count > 0) {
						const pt = this.paddingTop
						const { itemHeight } = dragging
						const { y } = event.getRelativeCoords(this)
						const line = Math.floor((y - pt) / itemHeight)
						const index = Math.clamp(line, 0, count - 1)
						if (dragging.itemIndex !== index) {
							dragging.itemIndex = index
							this.selectMultipleTo(index)
						}
					}
					break
				}
			}
		}
	}

	// 窗口 - 变量改变事件
	static windowVariableChange(event) {
		if (this.read()) {
			this.checkVariables()
		}
	}

	// 高亮文本元素列表
	static highlightedTexts = Array.empty

	// 高亮显示文本元素
	static highlightTexts({ varSpace, varType, varKey }) {
		switch (varType) {
			case 'boolean':
			case 'number':
			case 'string':
			case 'object':
				CommandList.highlightedTexts = [
					...document.getElementsByName(
						`${varSpace}-${varType}-${varKey}`
					),
					...document.getElementsByName(`${varSpace}-any-${varKey}`)
				]
				break
			case 'any':
				CommandList.highlightedTexts = [
					...document.getElementsByName(
						`${varSpace}-${varType}-${varKey}`
					),
					...document.getElementsByName(
						`${varSpace}-boolean-${varKey}`
					),
					...document.getElementsByName(
						`${varSpace}-number-${varKey}`
					),
					...document.getElementsByName(
						`${varSpace}-string-${varKey}`
					),
					...document.getElementsByName(
						`${varSpace}-object-${varKey}`
					)
				]
				break
		}
		for (const text of CommandList.highlightedTexts) {
			text.addClass('command-text-highlight')
		}
	}

	// 取消高亮显示文本元素
	static unhighlightTexts() {
		if (CommandList.highlightedTexts.length !== 0) {
			for (const text of CommandList.highlightedTexts) {
				text.removeClass('command-text-highlight')
			}
			CommandList.highlightedTexts = Array.empty
		}
	}

	// 文本 - 指针进入事件
	static textPointerenter(event) {
		CommandList.unhighlightTexts()
		CommandList.highlightTexts(this)
	}

	// 文本 - 指针离开事件
	static textPointerleave(event) {
		CommandList.unhighlightTexts()
	}
}

customElements.define('command-list', CommandList)

// 在控制台添加便捷的搜索函数
window.searchCommands = function (keyword) {
	const commandList = document.querySelector('command-list')
	if (commandList && commandList.data) {
		return commandList.searchAllCommands(keyword)
	} else {
		return []
	}
}

// 显示所有命令（包括折叠的）
window.showAllCommands = function () {
	const commandList = document.querySelector('command-list')
	if (
		commandList &&
		commandList.allCommands &&
		commandList.allCommands.size > 0
	) {
		for (const [lineIndex, info] of commandList.allCommands) {
			const prefix = !info.folded ? '✅' : '📦'
			const indent = '  '.repeat(info.indent)
		}
		return commandList.allCommands
	} else {
		return new Map()
	}
}

// 跳转到指定行
window.jumpToLine = function (lineNumber) {
	const commandList = document.querySelector('command-list')
	if (commandList && commandList.jumpToLine) {
		return commandList.jumpToLine(lineNumber)
	} else {
		return false
	}
}

// 添加高亮样式
if (!document.getElementById('command-highlight-style')) {
	const style = document.createElement('style')
	style.id = 'command-highlight-style'
	style.textContent = `
		mark {
			background-color: #ffff33 !important;
			color: #000 !important;
			font-weight: bold !important;
			padding: 0 1px;
		}
		mark.current-match {
			background-color: #ff9900 !important;
			color: #000 !important;
			font-weight: bold !important;
			padding: 0 2px;
			border: 1px solid #ff6600;
			border-radius: 2px;
		}
	`
	document.head.appendChild(style)
}

// 全局搜索文本函数
window.searchText = function (searchTerm) {
	const commandList = document.querySelector('command-list')
	if (commandList && typeof commandList.searchText === 'function') {
		if (
			!searchTerm ||
			typeof searchTerm !== 'string' ||
			searchTerm.trim() === ''
		) {
			commandList.clearAllHighlights()
			commandList.currentSearchTerm = null
			commandList.searchMatches = null
			commandList.currentMatchIndex = -1

			if (window.updateSearchCounter) {
				window.updateSearchCounter(-1, 0, '')
			}

			setTimeout(() => {
				if (commandList.validateAndCleanHighlights) {
					commandList.validateAndCleanHighlights()
				}
			}, 200)
			return false
		}
		return commandList.searchText(searchTerm)
	} else {
		return false
	}
}

window.forceRemoveAllMarks = function () {
	let attempts = 0
	const maxAttempts = 5

	function removeMarks() {
		attempts++
		const marks = document.querySelectorAll('mark')

		if (marks.length === 0) {
			return
		}

		const marksArray = Array.from(marks)
		marksArray.forEach((mark) => {
			try {
				const text = mark.textContent || ''
				const parent = mark.parentNode

				if (parent) {
					try {
						const textNode = document.createTextNode(text)
						parent.replaceChild(textNode, mark)
					} catch (e) {
						try {
							mark.outerHTML = text
						} catch (e2) {
							mark.remove()
						}
					}
				} else {
					mark.remove()
				}
			} catch (e) {
				try {
					mark.remove()
				} catch (e2) {
					// 无法删除
				}
			}
		})

		const remainingMarks = document.querySelectorAll('mark')
		if (remainingMarks.length > 0 && attempts < maxAttempts) {
			setTimeout(removeMarks, 100)
		}
	}

	removeMarks()
}

// 定期清除高亮的定时器
let highlightCleanupInterval = null

window.startHighlightCleanup = function () {
	if (highlightCleanupInterval) {
		clearInterval(highlightCleanupInterval)
	}

	highlightCleanupInterval = setInterval(() => {
		try {
			const searchBox = document.getElementById(
				'event-content-search-box'
			)
			const commandList = document.querySelector('command-list')

			// 只有在搜索框为空且没有当前搜索词时才清除
			if (
				(!searchBox || !searchBox.value) &&
				(!commandList || !commandList.currentSearchTerm)
			) {
				const marks = document.querySelectorAll('mark')
				if (marks.length > 0) {
					if (window.forceRemoveAllMarks) {
						window.forceRemoveAllMarks()
					}
				}
			}
		} catch (e) {
			// 定时清除出错
		}
	}, 500)
}

window.stopHighlightCleanup = function () {
	if (highlightCleanupInterval) {
		clearInterval(highlightCleanupInterval)
		highlightCleanupInterval = null
	}
}

// 搜索计数器相关函数
function createSearchCounter() {
	const searchSection = document.querySelector('.search-section')
	if (searchSection && !document.getElementById('search-counter')) {
		const counter = document.createElement('div')
		counter.id = 'search-counter'
		counter.style.cssText = `
			color: #666;
			font-size: 12px;
			margin-left: 8px;
			white-space: nowrap;
		`
		searchSection.appendChild(counter)
	}
}

// updateSearchCounter function is defined later as window.updateSearchCounter

// 创建搜索框
function createSearchBox() {
	// 检查搜索框是否已存在
	if (document.getElementById('event-content-search-box')) {
		return
	}

	// 找到事件内容容器
	const eventContent =
		document.querySelector('.event-content') ||
		document.querySelector('[data-editor-type="event"]') ||
		document.querySelector('command-list')?.parentNode

	if (!eventContent) {
		return
	}

	// 创建搜索框容器
	const searchContainer = document.createElement('div')
	searchContainer.className = 'search-section'
	searchContainer.id = 'search-container'
	searchContainer.style.cssText = `
		position: absolute;
		top: 20px;
		right: 50px;
		z-index: 100;
		display: none;
		align-items: center;
		gap: 8px;
	`
	// 添加隐藏标记，确保默认隐藏
	searchContainer.setAttribute('data-hidden', 'true')

	// 创建搜索输入框
	const searchInput = document.createElement('input')
	searchInput.id = 'event-content-search-box'
	searchInput.type = 'text'
	searchInput.placeholder = '搜索命令或跳转行号'
	searchInput.style.cssText = `
		width: 200px;
		height: 24px;
		padding: 4px 8px;
		border: 1px solid #555;
		background-color: #2a2a2a;
		color: #ccc;
		font-size: 12px;
		border-radius: 4px;
		outline: none;
	`

	// 添加聚焦样式
	searchInput.addEventListener('focus', () => {
		searchInput.style.borderColor = '#007acc'
	})

	searchInput.addEventListener('blur', () => {
		searchInput.style.borderColor = '#555'
	})

	searchContainer.appendChild(searchInput)
	eventContent.appendChild(searchContainer)
}

// HTML中已有搜索框，不需要自动创建

// 切换搜索框显示/隐藏
function toggleSearchBox() {
	// 直接操作HTML中的搜索框
	const searchBox = document.getElementById('event-content-search-box')

	if (!searchBox) {
		return
	}

	const isHidden =
		searchBox.style.display === 'none' ||
		window.getComputedStyle(searchBox).display === 'none'

	// 获取搜索按钮和计数器
	const searchPrev = document.getElementById('event-search-prev')
	const searchNext = document.getElementById('event-search-next')
	const searchClose = document.getElementById('event-search-close')
	const searchCounter = document.getElementById('search-counter')

	if (isHidden) {
		// 显示搜索框和按钮
		searchBox.style.display = 'block'
		if (searchPrev) searchPrev.style.display = 'block'
		if (searchNext) searchNext.style.display = 'block'
		if (searchClose) {
			searchClose.style.display = 'block'
			searchClose.textContent = '×' // 确保显示×符号
		}
		// 搜索计数器在JavaScript中动态创建，不需要控制display
		searchBox.focus()
	} else {
		// 隐藏搜索框和按钮
		searchBox.style.display = 'none'
		if (searchPrev) searchPrev.style.display = 'none'
		if (searchNext) searchNext.style.display = 'none'
		if (searchClose) searchClose.style.display = 'none'
		// 隐藏搜索计数器
		if (searchCounter) {
			searchCounter.style.opacity = '0'
		}

		// 完全清除搜索状态
		const commandList = document.querySelector('command-list')
		if (commandList) {
			// 清除所有搜索相关状态
			commandList.clearAllHighlights()
			commandList.currentSearchTerm = null
			commandList.searchMatches = null
			commandList.currentMatchIndex = -1
			commandList.keyboardSelectedIndex = -1

			// 清除计数器
			if (window.updateSearchCounter) {
				window.updateSearchCounter(-1, 0, '')
			}

			// 强制清理高亮
			if (commandList.validateAndCleanHighlights) {
				commandList.validateAndCleanHighlights()
			}
		}

		// 清除全局搜索缓存
		delete window._correctSearchData
		delete window._eventCommandsArray

		// 取消可能正在进行的防抖计时器
		if (window._searchDebounceTimer) {
			clearTimeout(window._searchDebounceTimer)
			window._searchDebounceTimer = null
		}

		// 清除搜索内容并触发input事件确保清理逻辑执行
		searchBox.value = ''
		// 手动触发input事件，确保清除逻辑被执行
		const inputEvent = new Event('input', { bubbles: true })
		searchBox.dispatchEvent(inputEvent)
		// 失焦
		searchBox.blur()
	}
}

// 强制清除所有mark标签的全局函数
window.forceRemoveAllMarks = function () {
	let attempts = 0
	const maxAttempts = 5

	function removeMarks() {
		attempts++

		const marks = document.querySelectorAll('mark')

		if (marks.length === 0) {
			return
		}

		// 转换为数组避免动态NodeList问题
		const marksArray = Array.from(marks)
		let clearedCount = 0

		marksArray.forEach((mark, index) => {
			try {
				const text = mark.textContent || ''
				const parent = mark.parentNode

				// 尝试多种清除方法
				if (parent) {
					// 方法1: replaceChild
					try {
						const textNode = document.createTextNode(text)
						parent.replaceChild(textNode, mark)
						clearedCount++
						return
					} catch (e1) {
						// 方法2: outerHTML
						try {
							mark.outerHTML = text
							clearedCount++
							return
						} catch (e2) {
							// 方法3: remove + insertText
							try {
								const nextSibling = mark.nextSibling
								mark.remove()
								const textNode = document.createTextNode(text)
								if (nextSibling) {
									parent.insertBefore(textNode, nextSibling)
								} else {
									parent.appendChild(textNode)
								}
								clearedCount++
								return
							} catch (e3) {
								// 方法4: 直接删除
								try {
									mark.remove()
									clearedCount++
									return
								} catch (e4) {}
							}
						}
					}
				} else {
					// 孤立的mark，直接删除
					try {
						mark.remove()
						clearedCount++
					} catch (e) {}
				}
			} catch (e) {}
		})

		// 检查是否还有剩余，如果有且未达到最大尝试次数，再次尝试
		const remainingMarks = document.querySelectorAll('mark')
		if (remainingMarks.length > 0 && attempts < maxAttempts) {
			setTimeout(removeMarks, 100) // 延迟一点再试
		} else if (remainingMarks.length > 0) {
		} else {
		}
	}

	removeMarks()
}

// 启动高亮清除定时器
window.startHighlightCleanup = function () {
	if (highlightCleanupInterval) {
		clearInterval(highlightCleanupInterval)
	}

	highlightCleanupInterval = setInterval(() => {
		try {
			const searchBox = document.getElementById(
				'event-content-search-box'
			)
			const commandList = document.querySelector('command-list')

			// 检查搜索框是否为空
			const isSearchEmpty =
				!searchBox || !searchBox.value || searchBox.value.trim() === ''

			// 检查命令列表是否有活跃搜索
			const hasActiveSearch =
				commandList &&
				commandList.currentSearchTerm &&
				commandList.currentSearchTerm.trim() !== ''

			if (isSearchEmpty && !hasActiveSearch) {
				// 搜索框为空且没有活跃搜索，检查是否有残留高亮
				const marks = document.querySelectorAll('mark')
				if (marks.length > 0) {
					if (window.forceRemoveAllMarks) {
						window.forceRemoveAllMarks()
					}
				}
			}
		} catch (e) {}
	}, 500)
}

// 停止高亮清除定时器
window.stopHighlightCleanup = function () {
	if (highlightCleanupInterval) {
		clearInterval(highlightCleanupInterval)
		highlightCleanupInterval = null
	}
}

// 添加搜索框监听器
setTimeout(() => {
	const searchBox = document.getElementById('event-content-search-box')
	if (searchBox) {
		// 创建搜索计数器
		createSearchCounter(searchBox)

		// 启动定时清除
		window.startHighlightCleanup()

		// 添加滚动监听器，用于实时更新计数器
		addScrollListener()

		// 统一的输入处理 - 防抖处理和清除逻辑
		searchBox.addEventListener('input', (e) => {
			const originalValue = e.target.value
			const trimmedValue = originalValue.trim()

			// 清除之前的定时器
			if (window._searchDebounceTimer) {
				clearTimeout(window._searchDebounceTimer)
				window._searchDebounceTimer = null
			}

			// 如果搜索框为空（包括只有空格的情况），立即清除高亮
			if (
				!originalValue ||
				originalValue === '' ||
				!trimmedValue ||
				trimmedValue === ''
			) {
				const commandList = document.querySelector('command-list')
				if (commandList) {
					commandList.clearAllHighlights()
					commandList.currentSearchTerm = null
					commandList.searchMatches = null
					commandList.currentMatchIndex = -1
					commandList.keyboardSelectedIndex = -1

					// 清除计数器 - 明确传递空字符串
					if (window.updateSearchCounter) {
						window.updateSearchCounter(-1, 0, '')
					}

					// 强制清理高亮
					setTimeout(() => {
						if (commandList.validateAndCleanHighlights) {
							commandList.validateAndCleanHighlights()
						}
						// 强制移除所有mark标签
						const marks = document.querySelectorAll(
							'mark[data-search-highlight="true"]'
						)
						marks.forEach((mark) => {
							const parent = mark.parentNode
							if (parent) {
								parent.replaceChild(
									document.createTextNode(mark.textContent),
									mark
								)
								parent.normalize()
							}
						})

						// 额外确保计数器被清除
						const counter = document.getElementById(
							'search-counter-display'
						)
						if (counter) {
							counter.style.opacity = '0'
							counter.textContent = ''
						}
					}, 50)
				}
				return
			}

			// 150ms 防抖
			window._searchDebounceTimer = setTimeout(() => {
				if (/^\d+$/.test(trimmedValue)) {
					// 纯数字 - 行号跳转
					jumpToLine(parseInt(trimmedValue))
				} else {
					// 文本搜索
					searchText(trimmedValue)
				}
				window._searchDebounceTimer = null
			}, 150)
		})

		// 添加额外的检查，确保搜索框完全清空时清除状态
		searchBox.addEventListener('keyup', (e) => {
			const value = e.target.value
			if (!value || value === '') {
				const commandList = document.querySelector('command-list')
				if (commandList) {
					commandList.clearAllHighlights()
					commandList.currentSearchTerm = null
					commandList.searchMatches = null
					commandList.currentMatchIndex = -1
					commandList.keyboardSelectedIndex = -1

					if (window.updateSearchCounter) {
						window.updateSearchCounter(-1, 0, '')
					}
				}
			}
		})

		// 添加搜索按钮事件监听器
		const searchPrev = document.getElementById('event-search-prev')
		const searchNext = document.getElementById('event-search-next')
		const searchClose = document.getElementById('event-search-close')

		if (searchPrev) {
			searchPrev.addEventListener('click', () => {
				const commandList = document.querySelector('command-list')
				if (
					commandList &&
					typeof commandList.navigateToPrevMatch === 'function' &&
					commandList.currentSearchTerm
				) {
					commandList.navigateToPrevMatch(
						commandList.currentSearchTerm
					)
				}
			})
		}

		if (searchNext) {
			searchNext.addEventListener('click', () => {
				const commandList = document.querySelector('command-list')
				if (
					commandList &&
					typeof commandList.navigateToNextMatch === 'function' &&
					commandList.currentSearchTerm
				) {
					commandList.navigateToNextMatch(
						commandList.currentSearchTerm
					)
				}
			})
		}

		if (searchClose) {
			// 确保关闭按钮显示×符号
			searchClose.textContent = '×'
			searchClose.addEventListener('click', () => {
				toggleSearchBox()
			})
		}
	} else {
	}
}, 1000)

// 创建搜索计数器
function createSearchCounter(searchBox) {
	// 检查是否已经存在计数器
	let counter = document.getElementById('search-counter')
	if (counter) {
		return counter
	}

	// 创建计数器元素
	counter = document.createElement('div')
	counter.id = 'search-counter'
	counter.style.cssText = `
		position: absolute;
		right: 336px;
		top: 20px;
		width: 80px;
		height: 26px;
		padding: 4px 8px;
		background-color: #2a2a2a;
		border: 1px solid #555;
		color: #ccc;
		font-size: 11px;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		text-align: center;
		line-height: 18px;
		border-radius: 0;
		box-sizing: border-box;
		z-index: 101;
		user-select: none;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	`
	counter.textContent = ''

	// 插入到页面中（在搜索框的父容器中）
	const parent = searchBox.parentNode
	if (parent) {
		parent.appendChild(counter)

		// 确保搜索框容器默认隐藏
		if (parent.id === 'search-container') {
			parent.style.display = 'none'
			parent.setAttribute('data-hidden', 'true')
		}
	}

	// 添加键盘快捷键支持
	addNavigationKeyboardShortcuts()

	return counter
}

// 删除导航按钮，只使用小键盘上下键导航

// 添加导航键盘快捷键
function addNavigationKeyboardShortcuts() {
	// 避免重复添加
	if (window._navigationKeyboardAdded) {
		return
	}
	window._navigationKeyboardAdded = true

	// 全局Ctrl+F快捷键处理（不限制搜索状态）
	document.addEventListener('keydown', (e) => {
		// Ctrl+F 切换搜索框
		if (e.ctrlKey && e.key === 'f') {
			e.preventDefault()
			toggleSearchBox()
			return
		}

		// ESC键隐藏搜索框（只在搜索框获得焦点时）
		if (e.key === 'Escape') {
			const searchBox = document.getElementById(
				'event-content-search-box'
			)
			if (
				searchBox &&
				document.activeElement === searchBox &&
				window.getComputedStyle(searchBox).display !== 'none'
			) {
				e.preventDefault()
				// 使用统一的关闭逻辑
				toggleSearchBox()
				return
			}
		}
	})

	document.addEventListener('keydown', (e) => {
		// 检查是否在搜索状态
		const commandList = document.querySelector('command-list')
		if (!commandList || !commandList.currentSearchTerm) {
			return
		}

		// Ctrl + 上箭头 = 上一项
		if (e.ctrlKey && e.key === 'ArrowUp') {
			e.preventDefault()

			if (
				typeof commandList.navigateToPrevMatch === 'function' &&
				commandList.currentSearchTerm
			) {
				commandList.navigateToPrevMatch(commandList.currentSearchTerm)
			}
		}
		// Ctrl + 下箭头 = 下一项
		else if (e.ctrlKey && e.key === 'ArrowDown') {
			e.preventDefault()

			if (
				typeof commandList.navigateToNextMatch === 'function' &&
				commandList.currentSearchTerm
			) {
				commandList.navigateToNextMatch(commandList.currentSearchTerm)
			}
		}
		// F3 = 下一项 (常见的查找下一项快捷键)
		else if (e.key === 'F3' && !e.shiftKey) {
			e.preventDefault()

			if (
				typeof commandList.navigateToNextMatch === 'function' &&
				commandList.currentSearchTerm
			) {
				commandList.navigateToNextMatch(commandList.currentSearchTerm)
			}
		}
		// Shift + F3 = 上一项
		else if (e.key === 'F3' && e.shiftKey) {
			e.preventDefault()

			if (
				typeof commandList.navigateToPrevMatch === 'function' &&
				commandList.currentSearchTerm
			) {
				commandList.navigateToPrevMatch(commandList.currentSearchTerm)
			}
		}
	})
}

// 更新搜索计数器（基于快捷键导航的选择）
window.updateSearchCounter = function (
	keyboardIndex,
	totalCount,
	searchTerm = '',
	hasAutoExpanded = false,
	expandedCount = 0
) {
	const counter = document.getElementById('search-counter')

	if (!counter) return

	if (!searchTerm || searchTerm.trim() === '') {
		// 没有搜索词，隐藏计数器
		counter.style.opacity = '0'
		counter.textContent = ''
		return
	}

	if (totalCount === 0) {
		// 有搜索词但没有结果，显示"没有匹配的数据"
		counter.style.opacity = '1'
		counter.textContent = '没有匹配的数据'
		counter.style.color = '#ff6666' // 红色表示没有结果
		return
	}

	// 显示计数器
	counter.style.opacity = '1'

	// 构建基础文本
	let baseText = ''
	if (keyboardIndex >= 0 && keyboardIndex < totalCount) {
		// 显示当前项和总数（快捷键选择的项）
		baseText = `第${keyboardIndex + 1}项 共${totalCount}项`
		counter.style.color = '#66ff66' // 绿色表示有选中项
	} else {
		// 只显示总数，没有快捷键选中项
		baseText = `共${totalCount}项`
		counter.style.color = '#ccc' // 灰色表示没有选中项
	}

	counter.textContent = baseText
}

// 按钮状态更新函数已删除，只使用小键盘导航

// 根据当前视窗位置智能确定当前搜索项
window.determineCurrentSearchItem = function (searchMatches) {
	if (!searchMatches || searchMatches.length === 0) {
		return -1
	}

	const commandList = document.querySelector('command-list')
	if (!commandList) {
		return -1
	}

	// 获取当前视窗的中心位置
	const listRect = commandList.getBoundingClientRect()
	const viewportCenter = listRect.top + listRect.height / 2

	let closestIndex = -1
	let closestDistance = Infinity
	let visibleMatches = 0

	// 找到距离视窗中心最近的匹配项
	searchMatches.forEach((match, index) => {
		// 尝试多种方式获取元素
		let element = null

		// 方法1: 直接使用match.element
		if (match.element && match.element.getBoundingClientRect) {
			element = match.element
		}
		// 方法2: 通过lineNumber查找元素
		if (!element && match.lineNumber) {
			// 方法2a: 通过allCommands映射查找
			if (
				commandList.allCommands &&
				commandList.allCommands.has(match.lineNumber)
			) {
				const commandInfo = commandList.allCommands.get(
					match.lineNumber
				)
				if (commandInfo && commandInfo.element) {
					element = commandInfo.element
				}
			}

			// 方法2b: 通过dataIndex查找
			if (!element) {
				const commandItems =
					commandList.querySelectorAll('command-item')
				for (const item of commandItems) {
					if (item.dataIndex === match.lineNumber) {
						// 现在都使用0-based系统
						element = item

						break
					}
				}
			}

			// 方法2c: 通过可见元素的文本匹配
			if (!element) {
				const commandItems =
					commandList.querySelectorAll('command-item')
				for (const item of commandItems) {
					if (
						item.textContent &&
						match.text &&
						item.textContent.includes(match.text.substring(0, 15))
					) {
						element = item

						break
					}
				}
			}
		}

		if (element && element.getBoundingClientRect) {
			try {
				const elementRect = element.getBoundingClientRect()
				const elementCenter = elementRect.top + elementRect.height / 2
				const distance = Math.abs(elementCenter - viewportCenter)

				// 检查是否在视窗内
				if (
					elementRect.bottom > listRect.top &&
					elementRect.top < listRect.bottom
				) {
					visibleMatches++

					if (distance < closestDistance) {
						closestDistance = distance
						closestIndex = index
					}
				} else {
				}
			} catch (e) {}
		} else {
		}
	})

	// 只有当最近的元素在视窗内且距离合理时才返回其索引
	if (closestIndex >= 0 && closestDistance < listRect.height / 2) {
		return closestIndex
	}

	return -1
}

window.updateCurrentSearchItem = function () {
	// 手动滚动不影响计数器显示
	return
}

// 添加滚动监听器
function addScrollListener() {
	const commandList = document.querySelector('command-list')
	if (!commandList) {
		return
	}

	let scrollTimeout = null

	const handleScroll = () => {
		// 防抖处理，避免频繁触发
		if (scrollTimeout) {
			clearTimeout(scrollTimeout)
		}

		scrollTimeout = setTimeout(() => {
			// 更新搜索计数器
			if (window.updateCurrentSearchItem) {
				window.updateCurrentSearchItem()
			}

			// 高亮新出现的匹配元素
			if (
				commandList.currentSearchTerm &&
				commandList.highlightVisibleMatches
			) {
				commandList.highlightVisibleMatches()
			}
		}, 100) // 滚动停止100ms后更新
	}

	// 监听滚动事件
	commandList.addEventListener('scroll', handleScroll, { passive: true })

	// 监听自定义的userscroll事件（如果存在）
	commandList.addEventListener('userscroll', handleScroll, { passive: true })
}

// 页面卸载时清理定时器，防止内存泄漏
window.addEventListener('beforeunload', () => {
	if (window.stopHighlightCleanup) {
		window.stopHighlightCleanup()
	}
})

// ******************************** 脚本参数面板 ********************************

class ParameterPane extends HTMLElement {
	scriptList //:element
	headPad //:element
	metas //:array
	wraps //:array
	detailBoxes //:array
	checkBoxes //:array
	numberBoxes //:array
	numberVars //:array
	textBoxes //:array
	selectBoxes //:array
	keyboardBoxes //:array
	colorBoxes //:array
	customBoxes //:array
	updateEventEnabled //:boolean
	windowLocalize //:function
	scriptChange //:function

	constructor() {
		super()

		// 设置属性
		this.scriptList = null
		this.headPad = null
		this.metas = []
		this.wraps = []
		this.detailBoxes = []
		this.checkBoxes = []
		this.numberBoxes = []
		this.numberVars = []
		this.textBoxes = []
		this.selectBoxes = []
		this.keyboardBoxes = []
		this.colorBoxes = []
		this.customBoxes = []
		this.updateEventEnabled = false
		this.windowLocalize = ParameterPane.windowLocalize.bind(this)
		this.scriptChange = ParameterPane.scriptChange.bind(this)

		// 侦听事件
		window.on('localize', this.windowLocalize)
		this.on('change', this.componentChange)
	}

	// 绑定数据
	bind(scriptList) {
		this.scriptList = scriptList
		if (scriptList instanceof ParamList) {
			const { object } = scriptList
			const { update } = object
			this.getData = () => scriptList.data
			object.update = (...args) => {
				update.apply(object, args)
				this.update()
			}
		}
		if (scriptList instanceof TreeList) {
			this.getData = () => {
				const item = scriptList.read()
				return item ? [item] : []
			}
		}
	}

	// 重新写入
	rewrite(parameters, key) {
		for (const wrap of this.wraps) {
			const script = wrap.box.data
			const map = script.parameters
			if (map !== parameters) continue
			for (const { input } of wrap.children) {
				if (input.key === key) {
					input.write(parameters[key])
					this.scriptList?.dispatchChangeEvent()
					// 更新参数可见性
					if (input.branched) {
						PluginManager.reconstruct(script)
						this.updateParamDisplay(wrap.box)
						this.onResize?.()
					}
					return
				}
			}
		}
	}

	// 更新
	update() {
		this.clear()
		this.appendHeadPad()
		let changed = false
		const scripts = this.getData()
		const map = Data.manifest.guidMap
		for (const script of scripts) {
			const meta = map[script.id]
			if (!meta) continue
			this.metas.push(meta)
			if (PluginManager.reconstruct(script)) {
				changed = true
			}
			const paramList = meta.parameters
			if (!paramList.length) continue
			const langMap = meta.langMap.update()
			const parameters = script.parameters
			const detailWrap = this.createDetailBox()
			const { box, summary, grid, children } = detailWrap
			box.meta = meta
			box.data = script
			this.wraps.push(detailWrap)
			// 如果传递了细节概要元素则设置脚本名称
			if (summary instanceof DetailSummary) {
				summary.textContent =
					langMap.get(meta.overview.plugin) ||
					File.parseMetaName(meta)
			}
			for (const parameter of paramList) {
				const inputWrap = this.createParamInput(parameter)
				const { label, input } = inputWrap
				const key = parameter.key
				const name = langMap.get(parameter.alias) ?? key
				const desc = langMap.get(parameter.desc)
				const tip = desc ? `<b>${name}</b>\n${desc}` : ''
				this.updateParamInput(inputWrap, parameters[key])
				label.textContent = name
				input.setTooltip(tip)
				input.parameters = parameters
				input.key = key
				grid.appendChild(label)
				grid.appendChild(input)
				children.push(inputWrap)
			}
			this.updateParamDisplay(box)
			this.appendChild(box)
		}
		// 脚本列表 - 发送改变事件
		if (changed) {
			this.scriptList?.dispatchChangeEvent()
		}
		// 发送更新事件
		if (this.updateEventEnabled) {
			this.dispatchUpdateEvent()
		}
		this.onResize?.()
		// 侦听属性改变事件
		window.on('script-change', this.scriptChange)
	}

	// 添加头部填充元素
	appendHeadPad() {
		let { headPad } = this
		if (headPad === null) {
			// 用填充元素占据首元素的位置
			// 从而改变首个summary的样式
			headPad = document.createElement('empty')
			headPad.style.display = 'none'
			this.headPad = headPad
		}
		this.appendChild(headPad)
	}

	// 创建细节框
	createDetailBox() {
		const { detailBoxes } = this
		if (detailBoxes.length !== 0) {
			return detailBoxes.pop()
		}
		const tag = 'detail-box'
		const box = document.createElement('detail-box')
		const summary = document.createElement('detail-summary')
		const grid = document.createElement('detail-grid')
		const wrap = { tag, box, summary, grid, children: [] }
		box.setAttribute('open', '')
		box.appendChild(summary)
		box.appendChild(grid)
		box.wrap = wrap
		return wrap
	}

	// 创建参数输入框
	createParamInput(parameter) {
		const { type } = parameter
		switch (type) {
			case 'boolean':
				return this.createCheckBox()
			case 'number': {
				const wrap = this.createNumberBox()
				wrap.input.input.min = parameter.min.toString()
				wrap.input.input.max = parameter.max.toString()
				wrap.input.decimals = parameter.decimals
				return wrap
			}
			case 'variable-number': {
				const wrap = this.createNumberVar()
				wrap.input.numBox.input.min = parameter.min.toString()
				wrap.input.numBox.input.max = parameter.max.toString()
				wrap.input.numBox.decimals = parameter.decimals
				wrap.input.varBox.isPluginInput = true
				return wrap
			}
			case 'string':
				return this.createTextBox()
			case 'option': {
				const wrap = this.createSelectBox()
				wrap.input.loadItems(parameter.dataItems)
				wrap.input.branched = !!parameter.wrap
				return wrap
			}
			case 'easing': {
				const wrap = this.createSelectBox()
				wrap.input.loadItems(Data.createEasingItems())
				return wrap
			}
			case 'team': {
				const wrap = this.createSelectBox()
				wrap.input.loadItems(Data.createTeamItems())
				return wrap
			}
			case 'variable': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'global-variable'
				wrap.input.filter = ''
				return wrap
			}
			case 'attribute':
			case 'attribute-key':
				if (parameter.filter === 'any') {
					const wrap = this.createCustomBox()
					wrap.input.type = 'attribute'
					return wrap
				} else {
					const wrap = this.createSelectBox()
					wrap.input.loadItems(
						Attribute.getAttributeItems(parameter.filter, '', true)
					)
					return wrap
				}
			case 'attribute-group': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'attribute-group'
				return wrap
			}
			case 'enum':
			case 'enum-value':
				if (parameter.filter === 'any') {
					const wrap = this.createCustomBox()
					wrap.input.type = 'enum-string'
					return wrap
				} else {
					const wrap = this.createSelectBox()
					wrap.input.loadItems(
						Enum.getStringItems(parameter.filter, true)
					)
					return wrap
				}
			case 'enum-group': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'enum-group'
				return wrap
			}
			case 'actor':
			case 'region':
			case 'light':
			case 'animation':
			case 'particle':
			case 'parallax':
			case 'tilemap': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'preset-object'
				wrap.input.filter = type
				return wrap
			}
			case 'element':
			case 'element-id': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'preset-element'
				wrap.input.filter = ''
				return wrap
			}
			case 'file': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'file'
				wrap.input.filter = parameter.filter
				return wrap
			}
			case 'variable-getter':
			case 'variable-setter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'variable'
				wrap.input.filter = 'all'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'actor-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'actor'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'skill-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'skill'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'state-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'state'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'equipment-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'equipment'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'item-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'item'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'element-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'element'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'position-getter': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'position'
				wrap.input.isPluginInput = true
				return wrap
			}
			case 'number[]':
			case 'string[]': {
				const wrap = this.createCustomBox()
				wrap.input.type = 'array'
				wrap.input.filter = type.slice(0, -2)
				return wrap
			}
			case 'keycode':
				return this.createKeyboardBox()
			case 'color':
				return this.createColorBox()
		}
	}

	// 更新参数输入框
	updateParamInput(wrap, value) {
		// if (value === undefined) {
		//   return
		// }
		switch (wrap.tag) {
			case 'check-box':
			case 'text-box':
				wrap.input.read() !== value && wrap.input.write(value)
				break
			case 'number-box':
				// 读取值与内部值不一定相同
				if (wrap.input.read() !== value) {
					wrap.input.write(value)
				} else {
					wrap.input.input.value = value.toString()
				}
				break
			case 'number-var':
				if (wrap.input.read() !== value) {
					wrap.input.write(value)
				} else if (typeof value === 'number') {
					wrap.input.numBox.input.value = value.toString()
				}
				break
			case 'keyboard-box':
			case 'color-box':
				wrap.input.read() !== value && wrap.input.write(value)
				break
			case 'select-box':
			case 'custom-box':
				// 由于选择框和自定义框选项内容不固定
				// 在数据值相等时还要更新一下显示信息
				if (wrap.input.read() !== value) {
					wrap.input.write(value)
				} else {
					wrap.input.update()
				}
				break
		}
	}

	// 更新参数可见性
	updateParamDisplay(detailBox) {
		const { states } = detailBox.meta.manager
		for (const wrap of detailBox.wrap.children) {
			switch (states[wrap.input.key]) {
				case false:
					wrap.label.hide()
					wrap.input.hide()
					continue
				default:
					wrap.label.show()
					wrap.input.show()
					continue
			}
		}
	}

	// 创建复选框
	createCheckBox() {
		const { checkBoxes } = this
		if (checkBoxes.length !== 0) {
			return checkBoxes.pop()
		}
		const tag = 'check-box'
		const label = document.createElement('text')
		const input = new CheckBox(true)
		input.inputEventEnabled = true
		input.addClass('standard')
		input.addClass('large')
		return { tag, label, input }
	}

	// 创建数字框
	createNumberBox() {
		const { numberBoxes } = this
		if (numberBoxes.length !== 0) {
			return numberBoxes.pop()
		}
		const tag = 'number-box'
		const label = document.createElement('text')
		const input = new NumberBox()
		return { tag, label, input }
	}

	// 创建可变数字框
	createNumberVar() {
		const { numberVars } = this
		if (numberVars.length !== 0) {
			return numberVars.pop()
		}
		const tag = 'number-var'
		const label = document.createElement('text')
		const input = new NumberVar()
		return { tag, label, input }
	}

	// 创建文本框
	createTextBox() {
		const { textBoxes } = this
		if (textBoxes.length !== 0) {
			return textBoxes.pop()
		}
		const tag = 'text-box'
		const label = document.createElement('text')
		const input = new TextBox()
		input.on('keydown', Selection.inputKeydown)
		input.on('keyup', Selection.inputKeyup)
		input.on('pointerdown', Selection.inputPointerdown)
		input.on('pointerup', Selection.inputPointerup)
		return { tag, label, input }
	}

	// 创建选择框
	createSelectBox() {
		const { selectBoxes } = this
		if (selectBoxes.length !== 0) {
			return selectBoxes.pop()
		}
		const tag = 'select-box'
		const label = document.createElement('text')
		const input = new SelectBox()
		return { tag, label, input }
	}

	// 创建按键框
	createKeyboardBox() {
		const { keyboardBoxes } = this
		if (keyboardBoxes.length !== 0) {
			return keyboardBoxes.pop()
		}
		const tag = 'keyboard-box'
		const label = document.createElement('text')
		const input = new KeyboardBox()
		return { tag, label, input }
	}

	// 创建颜色框
	createColorBox() {
		const { colorBoxes } = this
		if (colorBoxes.length !== 0) {
			return colorBoxes.pop()
		}
		const tag = 'color-box'
		const label = document.createElement('text')
		const input = new ColorBox()
		return { tag, label, input }
	}

	// 创建自定义框
	createCustomBox() {
		const { customBoxes } = this
		if (customBoxes.length !== 0) {
			return customBoxes.pop()
		}
		const tag = 'custom-box'
		const label = document.createElement('text')
		const input = new CustomBox()
		return { tag, label, input }
	}

	// 回收组件
	recycle(wrap) {
		switch (wrap.tag) {
			case 'detail-box': {
				const { children } = wrap
				let i = children.length
				while (--i >= 0) {
					this.recycle(children[i])
				}
				children.length = 0
				wrap.box.meta = null
				wrap.box.data = null
				this.detailBoxes.push(wrap)
				break
			}
			case 'check-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				this.checkBoxes.push(wrap)
				break
			case 'number-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				this.numberBoxes.push(wrap)
				break
			case 'number-var':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				this.numberVars.push(wrap)
				break
			case 'text-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				this.textBoxes.push(wrap)
				break
			case 'select-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				wrap.input.clear()
				this.selectBoxes.push(wrap)
				break
			case 'keyboard-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				this.keyboardBoxes.push(wrap)
				break
			case 'color-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				if (wrap.input.tabIndex === 0) {
					this.colorBoxes.push(wrap)
				}
				break
			case 'custom-box':
				wrap.label.remove()
				wrap.input.remove()
				wrap.input.parameters = null
				wrap.input.key = null
				// 禁止获取焦点的自定义框可能正被打开
				// 应该丢弃它避免接收过期的数据
				// 此时父元素change事件发挥了作用
				if (wrap.input.tabIndex === 0) {
					this.customBoxes.push(wrap)
				}
				break
		}
	}

	// 清除内容
	clear() {
		this.metas = []
		const { wraps } = this
		let i = wraps.length
		if (i !== 0) {
			while (--i >= 0) {
				this.recycle(wraps[i])
			}
			wraps.length = 0
			super.clear()
		}
		if (!this.scriptList?.data) {
			window.off('script-change', this.scriptChange)
		}
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'update':
				this.updateEventEnabled = true
				break
		}
	}

	// 组件 - 改变事件
	componentChange(event) {
		let element = event.target
		if (element.tagName === 'INPUT') {
			element = element.parentNode
		}
		if (element.parentNode instanceof NumberVar) {
			element = element.parentNode
		}
		const { parameters, key } = element
		const { scriptList } = this
		if (scriptList instanceof ParamList) {
			const { history } = scriptList
			const { editor } = history
			if (editor) {
				history.save({
					type: 'script-parameter-change',
					editor: editor,
					target: editor.target,
					meta: editor.meta,
					list: this,
					parameters: parameters,
					key: key,
					value: parameters[key]
				})
			}
		}
		parameters[key] = element.read()
		scriptList?.dispatchChangeEvent(1)
		// 更新参数可见性
		if (element.branched) {
			const grid = element.parentNode
			const detail = grid.parentNode
			PluginManager.reconstruct(detail.data)
			this.updateParamDisplay(detail)
			this.onResize?.()
		}
	}

	// 窗口 - 本地化事件
	static windowLocalize(event) {
		for (const { langMap } of this.metas) {
			const oldMap = langMap.active
			const newMap = langMap.update().active
			// 更新语言包后如果发生变化则重载脚本组件
			if (oldMap !== newMap) {
				return this.update()
			}
		}
	}

	// 脚本元数据改变事件
	static scriptChange(event) {
		for (const meta of this.metas) {
			if (meta === event.changedMeta) {
				if (this.contains(Select.target)) {
					Select.close()
				}
				this.update()
				return
			}
		}
	}
}

customElements.define('parameter-pane', ParameterPane)

// ******************************** 滚动条 ********************************

class ScrollBar extends HTMLElement {
	target //:element
	type //:string
	thumb //:element
	timer //:object
	dragging //:event
	windowPointerup //:function
	windowPointermove //:function

	constructor() {
		super()

		// 设置属性
		this.target = null
		this.type = null
		this.thumb = null
		this.timer = null
		this.dragging = null
		this.windowPointerup = ScrollBar.windowPointerup.bind(this)
		this.windowPointermove = ScrollBar.windowPointermove.bind(this)

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
	}

	// 绑定目标元素
	bind(target, type) {
		this.appendChild((this.thumb = document.createElement('scroll-thumb')))
		this.thumb.appendChild(document.createElement('scroll-thumb-inner'))
		this.target = target
		this.type = type
		this.addClass(type)
		switch (type) {
			case 'horizontal':
				this.thumb.style.height = '100%'
				break
			case 'vertical':
				this.thumb.style.width = '100%'
				break
		}
	}

	// 更新水平滚动条
	updateHorizontalBar() {
		const target = this.target
		const cw = target.clientWidth
		const sw = target.scrollWidth
		if (cw < sw) {
			const sl = target.scrollLeft
			const p1 = Math.roundTo((sl / sw) * 100, 6)
			const p2 = Math.roundTo((cw / sw) * 100, 6)
			this.updateHorizontalThumb(p1, p2)
			this.updateDisplay(true)
		} else {
			this.updateDisplay(false)
		}
	}

	// 更新垂直滚动条
	updateVerticalBar() {
		const target = this.target
		const ch = target.clientHeight
		const sh = target.scrollHeight
		if (ch < sh) {
			const st = target.scrollTop
			const p1 = Math.roundTo((st / sh) * 100, 6)
			const p2 = Math.roundTo((ch / sh) * 100, 6)
			this.updateVerticalThumb(p1, p2)
			this.updateDisplay(true)
		} else {
			this.updateDisplay(false)
		}
	}

	// 更新水平滑块
	updateHorizontalThumb(left, width) {
		const thumb = this.thumb
		if (thumb.left !== left) {
			thumb.left = left
			thumb.style.left = `${left}%`
		}
		if (thumb.width !== width) {
			thumb.width = width
			thumb.style.width = `${width}%`
		}
	}

	// 更新垂直滑块
	updateVerticalThumb(top, height) {
		const thumb = this.thumb
		if (thumb.top !== top) {
			thumb.top = top
			thumb.style.top = `${top}%`
		}
		if (thumb.height !== height) {
			thumb.height = height
			thumb.style.height = `${height}%`
		}
	}

	// 更新显示状态
	updateDisplay(state) {
		if (this.visible !== state) {
			this.visible = state
			switch (state) {
				case true:
					this.addClass('visible')
					break
				case false:
					this.removeClass('visible')
					break
			}
		}
	}

	// 滚动相对位置
	scrollRelative(sign) {
		const { target } = this
		let { timer } = this
		if (!timer) {
			timer = this.timer = new Timer({
				duration: 0,
				update: (timer) => {
					switch (timer.state) {
						case 'wait': {
							const { dragging } = this
							if (!dragging) {
								return false
							}
							if (dragging.target !== this) {
								break
							}
							const type = this.type
							const rect = this.thumb.rect()
							const offset = timer.offset
							if (type === 'horizontal') {
								const { clientX } = dragging
								const { left, right } = rect
								if (
									(offset < 0 && clientX < left) ||
									(offset > 0 && clientX > right)
								) {
								} else {
									break
								}
							}
							if (type === 'vertical') {
								const { clientY } = dragging
								const { top, bottom } = rect
								if (
									(offset < 0 && clientY < top) ||
									(offset > 0 && clientY > bottom)
								) {
								} else {
									break
								}
							}
							timer.state = 'repeat'
							timer.elapsed = Timer.deltaTime
							timer.duration = Math.abs(offset) / 5
							timer.start = timer.end
							timer.end += offset
						}
						case 'first':
						case 'repeat': {
							const { elapsed, duration } = timer
							const { start, end, offset } = timer
							const time = elapsed / duration
							const value = start * (1 - time) + end * time
							let max
							switch (this.type) {
								case 'horizontal':
									max =
										target.scrollWidth - target.clientWidth
									target.setScrollLeft(value)
									break
								case 'vertical':
									max =
										target.scrollHeight -
										target.clientHeight
									target.setScrollTop(value)
									break
							}
							if (
								(offset < 0 && value <= 0) ||
								(offset > 0 && value >= max)
							) {
								return false
							}
							break
						}
						case 'delay':
							break
					}
				},
				callback: (timer) => {
					if (this.dragging) {
						switch (timer.state) {
							case 'first':
								timer.state = 'delay'
								timer.elapsed = 0
								timer.duration = 100
								return true
							case 'delay':
							case 'repeat':
								timer.state = 'wait'
								timer.duration = Infinity
								return true
						}
					}
				}
			})
		}
		let start
		let offset
		switch (this.type) {
			case 'horizontal':
				start = target.scrollLeft
				offset = target.clientWidth * sign
				break
			case 'vertical':
				start = target.scrollTop
				offset = target.clientHeight * sign
				break
		}
		timer.state = 'first'
		timer.elapsed = 0
		timer.duration = Math.abs(offset) / 10
		timer.start = start
		timer.end = start + offset
		timer.offset = offset
		timer.add()
	}

	// 指针按下事件
	pointerdown(event) {
		if (this.dragging) {
			return
		}
		switch (event.button) {
			case 0:
				this.target.focus()
				event.preventDefault()
				event.stopImmediatePropagation()
				if (event.target === this.thumb) {
					this.dragging = event
					event.mode = 'scroll'
					event.scrollLeft = this.target.scrollLeft
					event.scrollTop = this.target.scrollTop
					window.on('pointerup', this.windowPointerup)
					window.on('pointermove', this.windowPointermove)
				} else {
					const rect = this.thumb.rect()
					switch (this.type) {
						case 'horizontal':
							this.scrollRelative(
								event.clientX < rect.left ? -1 : 1
							)
							break
						case 'vertical':
							this.scrollRelative(
								event.clientY < rect.top ? -1 : 1
							)
							break
					}
					this.dragging = event
					event.mode = 'repeat'
					window.on('pointerup', this.windowPointerup)
					window.on('pointermove', this.windowPointermove)
				}
				break
		}
	}

	// 窗口 - 指针弹起事件
	static windowPointerup(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'scroll':
					break
				case 'repeat':
					break
			}
			this.dragging = null
			window.off('pointerup', this.windowPointerup)
			window.off('pointermove', this.windowPointermove)
		}
	}

	// 窗口 - 指针移动事件
	static windowPointermove(event) {
		const { dragging } = this
		if (dragging.relate(event)) {
			switch (dragging.mode) {
				case 'scroll': {
					const target = this.target
					switch (this.type) {
						case 'horizontal':
							if (this.clientWidth !== 0) {
								target.setScrollLeft(
									dragging.scrollLeft +
										((event.clientX - dragging.clientX) *
											target.scrollWidth) /
											this.clientWidth
								)
							}
							break
						case 'vertical':
							if (this.clientHeight !== 0) {
								target.setScrollTop(
									dragging.scrollTop +
										((event.clientY - dragging.clientY) *
											target.scrollHeight) /
											this.clientHeight
								)
							}
							break
					}
					break
				}
				case 'repeat':
					this.dragging = event
					event.mode = 'repeat'
					break
			}
		}
	}
}

customElements.define('scroll-bar', ScrollBar)

// ******************************** 文件浏览器 ********************************

class FileBrowser extends HTMLElement {
	display //:string
	directory //:array
	dragging //:event
	filters //:array
	backupFolders //:array
	searchResults //:array
	nav //:element
	head //:element
	body //:element
	links //:array

	constructor() {
		super()

		// 设置属性
		this.display = 'normal'
		this.directory = null
		this.dragging = null
		this.filters = null
		this.keyword = null
		this.backupFolders = []
		this.searchResults = []
		this.nav = document.createElement('file-nav-pane')
		this.head = document.createElement('file-head-pane')
		this.body = document.createElement('file-body-pane')
		this.appendChild(this.nav)
		this.appendChild(this.head)
		this.appendChild(this.body)

		// 创建链接对象
		Promise.resolve().then(() => {
			const browser = this
			const nav = this.nav
			const head = this.head
			const body = this.body
			const links = {
				browser,
				nav,
				head,
				body
			}
			this.links = links
			nav.links = links
			head.links = links
			body.links = links
		})

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
		this.on('dragstart', this.dragstart)
		this.on('dragend', this.dragend)
		window.on('os-dragstart', this.osDragstart.bind(this))
		window.on('os-dragend', this.osDragend.bind(this))
		window.on('dirchange', this.dirchange.bind(this))
	}

	// 更新目录列表
	update() {
		this.body.updateFiles()
		this.head.updateAddress()
	}

	// 搜索文件: regexp or string
	searchFiles(keyword) {
		const { nav } = this
		if (keyword instanceof RegExp || keyword.length !== 0) {
			if (this.display === 'normal') {
				this.display = 'search'
				this.backupFolders = nav.selections
				nav.unselect()
			}
			if (typeof keyword === 'string') {
				keyword = keyword.replace(/[(){}\\^$*+?.|[\]]/g, '\\$&')
				keyword = new RegExp(keyword, 'i')
			}
			Directory.searchFiles(
				this.filters,
				(this.keyword = keyword),
				this.directory,
				(this.searchResults = [])
			)
			this.update()
		} else {
			if (this.display === 'search') {
				this.display = 'normal'
				nav.load(...this.backupFolders)
				this.keyword = null
				this.backupFolders = []
				this.searchResults = []
			}
		}
	}

	// 恢复显示模式
	restoreDisplay() {
		switch (this.display) {
			case 'normal':
				break
			case 'search':
				this.display = 'normal'
				this.backupFolders = []
				this.searchResults = []
				this.head.searcher.write('')
				break
		}
	}

	// 返回上一级目录
	backToParentFolder() {
		switch (this.display) {
			case 'normal': {
				const { nav } = this
				const folders = nav.selections
				if (folders.length === 1) {
					const path = folders[0].path
					const index = path.lastIndexOf('/')
					if (index !== -1) {
						nav.load(Directory.getFolder(path.slice(0, index)))
						return true
					}
				}
				return false
			}
			case 'search': {
				const active = document.activeElement
				this.head.searcher.deleteInputContent()
				active.focus()
				return true
			}
		}
	}

	// 目录改变事件
	dirchange(event) {
		switch (this.display) {
			case 'normal':
				break
			case 'search':
				this.searchFiles(this.keyword)
				break
		}
		const body = this.body
		const files = Array.from(body.selections)
		if (files.length !== 0) {
			const { inoMap } = Directory
			let modified = false
			let i = files.length
			while (--i >= 0) {
				const sFile = files[i]
				const ino = sFile.stats.ino
				const dFile = inoMap[ino]
				if (sFile !== dFile) {
					modified = true
					if (dFile) {
						files[i] = dFile
					} else {
						files.splice(i, 1)
					}
				}
			}
			if (modified) {
				body.select(...files)
			}
		}
	}

	// 关闭
	close() {
		if (this.directory) {
			this.directory = null
			this.restoreDisplay()
			this.nav.clear()
			this.head.address.clear()
			this.body.clear()
		}
	}

	// 获取活动页面
	getActivePage(event) {
		const { nav, body } = this
		return nav.contains(event.target)
			? nav
			: body.contains(event.target)
				? body
				: null
	}

	// 获取绝对路径列表
	getFilePaths(files) {
		const relativePaths = files.map((file) => file.path)
		const absolutePaths = relativePaths.map((path) => File.route(path))
		return { relativePaths, absolutePaths }
	}

	// 指针按下事件
	pointerdown(event) {
		// 如果丢失dragend事件，手动结束
		switch (this.dragging?.mode) {
			case 'drag':
				return this.dragend()
			case 'os-drag':
				return this.osDragend()
		}
	}

	// 拖拽开始事件
	dragstart(event) {
		const page = this.getActivePage(event)
		if (page && !this.dragging) {
			if (page.pressing) {
				page.pressing = null
			}
			const files = page.activeFile ? [page.activeFile] : page.selections
			if (!files.includes(Directory.assets) && !page.textBox.parentNode) {
				const { relativePaths, absolutePaths } =
					this.getFilePaths(files)
				this.dragging = event
				event.mode = 'drag'
				event.preventDefault = Function.empty
				event.allowMove = false
				event.allowCopy = false
				event.dragLeaved = false
				event.dropTarget = null
				event.dropPath = null
				event.dropMode = null
				event.page = page
				event.files = files
				event.filePaths = relativePaths
				event.promise = Directory.readdir(absolutePaths)
				event.promise.then((dir) => {
					// 若文件已删除则结束拖拽
					if (dir.length === 0) {
						this.dragend()
					}
				})
				event.dataTransfer.effectAllowed = 'copyMove'
				event.dataTransfer.hideDragImage()
				this.on('dragenter', this.dragover)
				this.on('dragleave', this.dragleave)
				this.on('dragover', this.dragover)
				this.on('drop', this.drop)
				if (files.length === 1 && files[0] instanceof FileItem) {
					const name = files[0].basename + files[0].extname
					event.dataTransfer.setData(
						'DownloadURL',
						`application/octet-stream:${name}:${absolutePaths[0]}`
					)
				}
			}
		}
	}

	// 拖拽结束事件
	dragend(event) {
		if (this.dragging) {
			const { dropTarget, page } = this.dragging
			if (dropTarget instanceof HTMLElement) {
				dropTarget.removeClass('drop-target')
			}
			// 取消激活文件
			if (this.dragging.dragLeaved) {
				page.deactivateFile?.()
			} else {
				page.selectActiveFile?.()
			}
			this.dragging = null
			this.off('dragenter', this.dragover)
			this.off('dragleave', this.dragleave)
			this.off('dragover', this.dragover)
			this.off('drop', this.drop)
		}
	}

	// 拖拽离开事件
	dragleave(event) {
		const { dragging } = this
		if (dragging?.dropTarget && !this.contains(event.relatedTarget)) {
			dragging.dropTarget.removeClass('drop-target')
			dragging.dropTarget = null
			// 排除drop时触发的dragleave事件
			if (event.relatedTarget) {
				dragging.dragLeaved = true
			}
		}
	}

	// 拖拽悬停事件
	dragover(event) {
		const { dragging } = this
		if (dragging) {
			const { dropTarget } = dragging
			let element = event.target
			if (!dragging.allowCopy && !dragging.target.contains(element)) {
				dragging.allowCopy = true
			}
			while (
				!(
					element instanceof FileBrowser ||
					element instanceof FileNavPane ||
					element instanceof FileBodyPane ||
					element.file instanceof FolderItem
				)
			) {
				element = element.parentNode
			}
			if (dropTarget !== element) {
				if (dropTarget instanceof HTMLElement) {
					dropTarget.removeClass('drop-target')
				}
				dragging.allowMove = false
				dragging.dropTarget = element
				if (element.file instanceof FolderItem) {
					element.addClass('drop-target')
					dragging.dropPath = element.file.path
					dragging.promise
						.then((dir) => {
							const { path } = element.file
							const { filePaths } = dragging
							for (const filePath of filePaths) {
								if (
									path === filePath ||
									(path.indexOf(filePath) === 0 &&
										path[filePath.length] === '/')
								) {
									return true
								}
							}
							return Directory.existFiles(path, dir)
						})
						.then((existed) => {
							if (!existed && dragging.dropTarget === element) {
								dragging.allowMove = true
							}
						})
				} else {
					if (element instanceof FileBodyPane) {
						const { selections } = this.nav
						dragging.dropPath =
							selections.length === 1 ? selections[0].path : null
					} else {
						dragging.dropPath = null
					}
				}
			}
			if (!dragging.dropPath) {
				return
			}
			if (event.cmdOrCtrlKey) {
				if (dragging.allowCopy) {
					dragging.dropMode = 'copy'
					event.dataTransfer.dropEffect = 'copy'
					event.preventDefault()
				}
			} else {
				if (dragging.allowMove) {
					dragging.dropMode = 'move'
					event.dataTransfer.dropEffect = 'move'
					event.preventDefault()
				}
			}
		}
	}

	// 拖拽释放事件
	drop(event) {
		const { dragging } = this
		if (dragging) {
			event.stopPropagation()
			if (!dragging.dropPath) return
			const dropPath = File.route(dragging.dropPath)
			const dropName = Path.basename(dropPath)
			const get = Local.createGetter('menuFileOnDrop')

			// 创建菜单选项
			const menuItems = []
			switch (dragging.dropMode) {
				case 'move':
					menuItems.push({
						label: get('moveTo').replace('<dirName>', dropName),
						click: () => {
							dragging.promise
								.then((dir) =>
									Directory.moveFiles(dropPath, dir)
								)
								.finally(() => {
									Directory.update()
								})
						}
					})
					break
				case 'copy':
					menuItems.push({
						label: get('copyTo').replace('<dirName>', dropName),
						click: () => {
							dragging.promise
								.then((dir) =>
									Directory.saveFiles(dragging.files).then(
										() => Directory.copyFiles(dropPath, dir)
									)
								)
								.finally(() => {
									Directory.update()
								})
						}
					})
					break
			}

			// 弹出菜单
			Menu.popup(
				{
					x: event.clientX,
					y: event.clientY
				},
				menuItems
			)

			// 创建项目后不能触发拖拽结束事件
			this.dragend()
		}
	}

	// 操作系统 - 拖拽开始事件
	osDragstart(event) {
		if (!this.dragging) {
			this.dragging = event
			event.mode = 'os-drag'
			event.dropTarget = null
			event.dropPath = null
			this.on('dragenter', this.osDragover)
			this.on('dragleave', this.osDragleave)
			this.on('dragover', this.osDragover)
			this.on('drop', this.osDrop)
		}
	}

	// 操作系统 - 拖拽结束事件
	osDragend(event) {
		if (this.dragging) {
			const { dropTarget } = this.dragging
			if (dropTarget instanceof HTMLElement) {
				dropTarget.removeClass('drop-target')
			}
			this.dragging = null
			this.off('dragenter', this.osDragover)
			this.off('dragleave', this.osDragleave)
			this.off('dragover', this.osDragover)
			this.off('drop', this.osDrop)
		}
	}

	// 操作系统 - 拖拽离开事件
	osDragleave(event) {
		return this.dragleave(event)
	}

	// 操作系统 - 拖拽悬停事件
	osDragover(event) {
		const { dragging } = this
		if (dragging) {
			const { dropTarget } = dragging
			let element = event.target
			while (
				!(
					element instanceof FileBrowser ||
					element instanceof FileNavPane ||
					element instanceof FileBodyPane ||
					element.file instanceof FolderItem
				)
			) {
				element = element.parentNode
			}
			if (dropTarget !== element) {
				if (dropTarget instanceof HTMLElement) {
					dropTarget.removeClass('drop-target')
				}
				dragging.dropTarget = element
				if (element.file instanceof FolderItem) {
					element.addClass('drop-target')
					dragging.dropPath = element.file.path
				} else {
					if (element instanceof FileBodyPane) {
						const { selections } = this.nav
						dragging.dropPath =
							selections.length === 1 ? selections[0].path : null
					} else {
						dragging.dropPath = null
					}
				}
			}
			if (dragging.dropPath) {
				event.preventDefault()
				event.dataTransfer.dropEffect = 'copy'
			}
		}
	}

	// 操作系统 - 拖拽释放事件
	osDrop(event) {
		const { files } = event.dataTransfer
		if (files.length === 0) {
			return
		}
		const { dragging } = this
		if (dragging) {
			let { dropPath } = dragging
			if (!dropPath) return
			dropPath = File.route(dropPath)
			const map = Array.prototype.map
			const paths = map.call(files, (file) => file.path)
			Directory.readdir(paths)
				.then((dir) => {
					return Directory.copyFiles(dropPath, dir, '')
				})
				.finally(() => {
					Directory.update()
				})
		}
	}
}

customElements.define('file-browser', FileBrowser)

// ******************************** 文件导航面板 ********************************

class FileNavPane extends HTMLElement {
	timer //:object
	elements //:array
	selections //:array
	pressing //:function
	selectEventEnabled //:boolean
	textBox //:element

	constructor() {
		super()

		// 创建重命名计时器
		const timer = new Timer({
			duration: 500,
			callback: (timer) => {
				const files = this.selections
				if (files.length === 1) {
					const file = files[0]
					const target = timer.target
					const context = file.getContext(this)
					const element = context.element
					if (element.contains(target)) {
						this.rename(file)
					}
				}
				timer.target = null
				timer.running = false
			}
		})

		// 设置属性
		this.tabIndex = -1
		this.timer = timer
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.elements.head = null
		this.elements.foot = null
		this.selections = []
		this.pressing = null
		this.selectEventEnabled = false
		this.textBox = FileNavPane.textBox
		this.listenDraggingScrollbarEvent()

		// 侦听事件
		this.on('scroll', this.resize)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
		this.on('doubleclick', this.doubleclick)
		this.on('select', this.listSelect)
		window.on('dirchange', this.dirchange.bind(this))
	}

	// 加载文件夹
	load(...folders) {
		this.select(...folders)
		for (let folder of folders) {
			while ((folder = folder.parent)) {
				folder.getContext(this).expanded = true
			}
		}
		this.update()
	}

	// 更新列表
	update() {
		const { elements } = this
		elements.start = -1
		elements.count = 0

		// 创建列表项目
		const { directory } = this.parentNode
		if (directory) {
			this.createItems(directory, 0)
		}

		// 清除多余的元素
		this.clearElements(elements.count)

		// 重新调整
		this.resize()
	}

	// 重新调整
	resize() {
		return CommonList.resize(this)
	}

	// 更新头部和尾部元素
	updateHeadAndFoot() {
		return CommonList.updateHeadAndFoot(this)
	}

	// 在重新调整时更新
	updateOnResize(element) {
		if (element.changed) {
			element.changed = false
			this.updateFolderElement(element)
		}
	}

	// 创建项目
	createItems(dir, indent) {
		if (dir.sorted === undefined) {
			dir.sorted = true
			Directory.sortFiles(dir)
		}
		const elements = this.elements
		const length = dir.length
		for (let i = 0; i < length; i++) {
			const file = dir[i]
			elements[elements.count++] = this.createFolderElement(file, indent)
			const context = file.getContext(this)
			if (context.expanded && file.subfolders) {
				this.createItems(file.subfolders, indent + 1)
			}
		}
	}

	// 创建文件夹元素
	createFolderElement(file, indent) {
		const context = file.getContext(this)
		let element = context.element
		if (element === undefined) {
			// 创建文件夹
			element = document.createElement('file-nav-item')
			element.file = file
			element.context = context
			context.element = element

			// 激活选中状态
			const { selections } = this
			if (selections.length !== 0 && selections.includes(file)) {
				element.addClass('selected')
			}
		}
		element.indent = indent
		element.changed = true
		return element
	}

	// 更新文件夹元素
	updateFolderElement(element) {
		const { file, context } = element
		if (!element.textNode) {
			// 创建折叠标记
			const folderMark = document.createElement('folder-mark')
			element.appendChild(folderMark)

			// 创建文件夹图标
			const fileIcon = document.createElement('file-nav-icon')
			fileIcon.addClass('icon-folder')
			element.appendChild(fileIcon)

			// 创建文本节点
			const textNode = document.createTextNode(file.name)
			element.appendChild(textNode)

			// 设置元素属性
			element.draggable = true
			element.expanded = false
			element.markVisible = true
			element.textIndent = 0
			element.folderMark = folderMark
			element.fileIcon = fileIcon
			element.textNode = textNode
		}

		// 开关折叠标记
		const markVisible = file.subfolders.length !== 0
		if (element.markVisible !== markVisible) {
			element.markVisible = markVisible
			element.folderMark.style.visibility = markVisible
				? 'inherit'
				: 'hidden'
		}

		// 设置折叠标记
		const expanded = markVisible && context.expanded
		if (element.expanded !== expanded) {
			element.expanded = expanded
			switch (expanded) {
				case true:
					element.folderMark.addClass('expanded')
					element.fileIcon.addClass('expanded')
					break
				case false:
					element.folderMark.removeClass('expanded')
					element.fileIcon.removeClass('expanded')
					break
			}
		}

		// 设置文本缩进
		const textIndent = element.indent * 12
		if (element.textIndent !== textIndent) {
			element.textIndent = textIndent
			element.style.textIndent = `${textIndent}px`
		}
	}

	// 选择项目
	select(...files) {
		this.unselect()
		this.selections = files
		for (const file of files) {
			const context = file.getContext(this)
			const element = context.element
			if (element !== undefined) {
				element.addClass('selected')
			}
		}
		if (this.selectEventEnabled) {
			const select = new Event('select')
			select.value = files
			this.dispatchEvent(select)
		}
	}

	// 取消选择
	unselect() {
		const files = this.selections
		if (files.length !== 0) {
			FileNavPane.textBox.input.blur()
			for (const file of files) {
				const context = file.getContext(this)
				const element = context.element
				if (element !== undefined) {
					element.removeClass('selected')
				}
			}
			this.selections = []
		}
	}

	// 选择相对位置的项目
	selectRelative(direction) {
		const elements = this.elements
		const count = elements.count
		if (count > 0) {
			let index
			let start = Infinity
			let end = -Infinity
			const last = count - 1
			const { selections } = this
			for (const file of selections) {
				const { element } = file.getContext(this)
				const index = elements.indexOf(element)
				if (index !== -1) {
					start = Math.min(start, index)
					end = Math.max(end, index)
				}
			}
			switch (direction) {
				case 'up':
					index = Math.clamp(start - 1, 0, last)
					break
				case 'down':
					index = Math.clamp(end + 1, 0, last)
					break
			}
			const file = elements[index]?.file
			if (!(selections.length === 1 && selections[0] === file)) {
				this.select(file)
			}
			this.scrollToSelection()
		}
	}

	// 滚动到选中项
	scrollToSelection(mode = 'active') {
		const { selections } = this
		if (selections.length === 1 && this.hasScrollBar()) {
			const selection = selections[0]
			const elements = this.elements
			const count = elements.count
			for (let i = 0; i < count; i++) {
				if (elements[i].file === selection) {
					let scrollTop
					switch (mode) {
						case 'active':
							scrollTop = Math.clamp(
								this.scrollTop,
								i * 20 + 20 - this.innerHeight,
								i * 20
							)
							break
						case 'middle':
							scrollTop =
								Math.round(
									(i * 20 + 10 - this.innerHeight / 2) / 20
								) * 20
							break
						default:
							return
					}
					if (this.scrollTop !== scrollTop) {
						this.scrollTop = scrollTop
					}
					break
				}
			}
		}
	}

	// 获取选项
	getSelections() {
		const { browser } = this.links
		switch (browser.display) {
			case 'normal':
				return this.selections
			case 'search':
				return browser.backupFolders
		}
	}

	// 重命名
	rename(file) {
		const { textBox } = FileNavPane
		if (
			document.activeElement === this &&
			file !== Directory.assets &&
			!textBox.parentNode
		) {
			const context = file.getContext(this)
			const element = context.element
			if (element && element.parentNode) {
				element.textNode.nodeValue = ''
				element.appendChild(textBox)
				textBox.write(file.name)
				textBox.getFocus('all')
				textBox.fitContent()
			}
		}
	}

	// 取消重命名
	cancelRenaming() {
		const { timer } = this
		if (timer.target) {
			timer.target = null
		}
		if (timer.running) {
			timer.running = false
			timer.remove()
		}
	}

	// 清除元素
	clearElements(start) {
		// 有条件地调整缓存大小
		const { elements } = this
		if (elements.length > 256 && elements.length !== start) {
			elements.length = start
		}
		let i = start
		while (elements[i] !== undefined) {
			elements[i++] = undefined
		}
	}

	// 清除列表
	clear() {
		this.unselect()
		this.textContent = ''
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.updateHeadAndFoot()
		return this
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'select':
				this.selectEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
				default:
					return
			}
			event.stopImmediatePropagation()
		} else if (event.altKey) {
			return
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault()
					// this.links.body.content.focus()
					// 返回：为了不占用这个按键
					return
				case 'ArrowRight': {
					event.preventDefault()
					const files = this.selections
					if (files.length === 1) {
						const file = files[0]
						if (file.subfolders.length !== 0) {
							const context = file.getContext(this)
							context.expanded = !context.expanded
							this.update()
						}
					}
					break
				}
				// case 'Enter':
				// case 'NumpadEnter': {
				//   const item = this.selection
				//   if (!item || item.children) {
				//     event.stopPropagation()
				//   }
				//   break
				// }
				case 'ArrowUp':
					event.preventDefault()
					this.selectRelative('up')
					break
				case 'ArrowDown':
					event.preventDefault()
					this.selectRelative('down')
					break
				case 'F2': {
					const files = this.selections
					if (files.length === 1) {
						this.cancelRenaming()
						this.rename(files[0])
					}
					break
				}
				default:
					return
			}
			event.stopImmediatePropagation()
		}
	}

	// 指针按下事件
	pointerdown(event) {
		this.cancelRenaming()
		switch (event.button) {
			case 0:
			case 2: {
				let element = event.target
				if (element.tagName === 'FOLDER-MARK') {
					// 阻止拖拽开始事件
					event.preventDefault()
					if (event.button === 0) {
						const file = element.parentNode.file
						const context = file.getContext(this)
						context.expanded = !context.expanded
						this.update()
					}
				} else {
					if (element.tagName === 'FILE-NAV-ICON') {
						element = element.parentNode
					}
					if (element.tagName === 'FILE-NAV-ITEM') {
						const selections = this.selections
						const length = selections.length
						if (event.cmdOrCtrlKey && length !== 0) {
							const files = Array.from(selections)
							if (!selections.includes(element.file)) {
								files.append(element.file)
								this.select(...files)
							} else if (length > 1) {
								files.remove(element.file)
								const pointerup = (event) => {
									if (this.pressing === pointerup) {
										this.pressing = null
										if (element.contains(event.target)) {
											this.select(...files)
										}
									}
								}
								this.pressing = pointerup
								window.on('pointerup', pointerup, {
									once: true
								})
							}
							return
						}
						if (event.shiftKey && length !== 0) {
							const elements = this.elements
							let start = elements.indexOf(element)
							let end = start
							for (const file of selections) {
								const { element } = file.getContext(this)
								const index = elements.indexOf(element)
								if (index !== -1) {
									start = Math.min(start, index)
									end = Math.max(end, index)
								}
							}
							if (start !== -1) {
								const slice = elements.slice(start, end + 1)
								this.select(
									...slice.map((element) => element.file)
								)
								return
							}
						}
						if (!element.hasClass('selected')) {
							this.select(element.file)
						} else if (event.button === 0) {
							if (length > 1) {
								const pointerup = (event) => {
									if (this.pressing === pointerup) {
										this.pressing = null
										if (element.contains(event.target)) {
											this.select(element.file)
										}
									}
								}
								this.pressing = pointerup
								window.on('pointerup', pointerup, {
									once: true
								})
							} else if (
								Menu.state === 'closed' &&
								document.activeElement === this &&
								event.clientX > element.fileIcon.rect().right
							) {
								this.timer.target = event.target
							}
						}
					}
				}
				break
			}
			// case 2: {
			//   const element = event.target.seek('file-nav-item')
			//   if (element.tagName === 'DIR-ITEM' &&
			//     !element.hasClass('selected')) {
			//     this.select(element.file)
			//   }
			//   break
			// }
		}
	}

	// 指针弹起事件
	pointerup(event) {
		switch (event.button) {
			case 0:
				if (
					document.activeElement === this &&
					this.timer.target === event.target
				) {
					this.timer.running = true
					this.timer.elapsed = 0
					this.timer.add()
				}
				break
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		let element = event.target
		if (element.tagName === 'FILE-NAV-ICON') {
			element = element.parentNode
		}
		if (element.tagName === 'FILE-NAV-ITEM') {
			this.cancelRenaming()
			const folder = element.file
			if (folder.subfolders.length !== 0) {
				const context = folder.getContext(this)
				context.expanded = !context.expanded
				this.update()
			}
		}
	}

	// 选择事件
	listSelect(event) {
		const { browser } = this.links
		browser.restoreDisplay()
		browser.update()
	}

	// 目录改变事件
	dirchange(event) {
		const folders = []
		const { inoMap } = Directory
		for (const folder of this.getSelections()) {
			const { ino } = folder.stats
			const { path } = inoMap[ino] || folder
			folders.append(Directory.getFolder(path))
		}
		const { browser } = this.links
		switch (browser.display) {
			case 'normal':
				this.unselect()
				this.load(...folders)
				break
			case 'search':
				this.update()
				break
		}
	}

	// 静态 - 创建文本输入框
	static textBox = (function IIFE() {
		const textBox = new TextBox()
		textBox.setMaxLength(64)
		textBox.addClass('file-nav-text-box')
		textBox.input.addClass('file-nav-text-box-input')

		// 键盘按下事件
		textBox.on('keydown', function (event) {
			event.stopPropagation()
			switch (event.code) {
				case 'Enter':
				case 'NumpadEnter':
				case 'Escape': {
					const item = this.parentNode
					const nav = item.parentNode
					this.input.blur()
					nav.focus()
					break
				}
			}
		})

		// 输入前事件
		textBox.on('beforeinput', function (event) {
			if (
				event.inputType === 'insertText' &&
				typeof event.data === 'string'
			) {
				const regexp = /[\\/:*?"<>|]/
				if (regexp.test(event.data)) {
					event.preventDefault()
					event.stopPropagation()
				}
			}
		})

		// 输入事件
		textBox.on('input', function (event) {
			this.fitContent()
		})

		// 选择事件
		textBox.on('select', function (event) {
			event.stopPropagation()
		})

		// 失去焦点事件
		textBox.on('blur', function (event) {
			const item = this.parentNode
			const file = item.file
			const name = this.read().trim()
			this.remove()
			if (name && name !== file.name) {
				const dir = Path.dirname(file.path)
				const path = File.route(`${dir}/${name}`)
				if (!FS.existsSync(path)) {
					return FSP.rename(File.route(file.path), path)
						.then(() => {
							return Directory.update()
						})
						.then((changed) => {
							if (!changed) {
								throw new Error()
							}
						})
						.catch((error) => {
							item.textNode.nodeValue = file.name
						})
				}
			}
			item.textNode.nodeValue = file.name
		})

		return textBox
	})()
}

customElements.define('file-nav-pane', FileNavPane)

// ******************************** 文件头部面板 ********************************

class FileHeadPane extends HTMLElement {
	address //:element
	searcher //:element
	view //:element

	constructor() {
		super()

		// 设置属性
		this.address = document.createElement('file-head-address')
		this.back = document.createElement('item')
		this.back.addClass('upper-level-directory')
		this.back.name = 'back'
		this.back.setAttribute('hotkey', 'Escape/MouseBackButton')
		this.back.textContent = '\uf0a8'
		this.searcher = new TextBox()
		this.searcher.addCloseButton()
		this.searcher.addClass('file-head-searcher')
		this.searcher.name = 'search'
		this.view = new SliderBox()
		this.view.addClass('file-head-view')
		this.view.setAttribute('hotkey', 'Ctrl+Wheel')
		this.view.name = 'view'
		this.view.input.max = '4'
		this.view.activeWheel = true
		this.appendChild(this.address)
		this.appendChild(this.back)
		this.appendChild(this.searcher)
		this.appendChild(this.view)

		// 侦听事件
		this.on('pointerdown', this.pointerdown)
		this.address.on('pointerdown', this.addressPointerdown)
		this.back.on('click', this.backButtonClick)
		this.searcher.on('input', this.searcherInput)
		this.searcher.on('compositionend', this.searcherInput)
		this.view.on('focus', this.viewFocus)
		this.view.on('input', this.viewInput)
	}

	// 更新地址
	updateAddress() {
		const { browser, nav, body } = this.links
		const folders = nav.selections
		const address = this.address.clear()
		switch (browser.display) {
			case 'normal':
				if (folders.length === 1) {
					let folder = folders[0]
					const nodes = []
					while (true) {
						const elFolder = document.createElement(
							'file-head-address-folder'
						)
						elFolder.file = folder
						elFolder.textContent = folder.name
						nodes.push(elFolder)
						const { parent } = folder
						if (parent instanceof FolderItem) {
							const elArrow = document.createElement(
								'file-head-address-arrow'
							)
							elArrow.folders = parent.subfolders
							elArrow.target = folder
							nodes.push(elArrow)
							folder = parent
						} else {
							break
						}
					}
					nodes[0].disabled = true
					for (const node of nodes.reverse()) {
						address.appendChild(node)
					}
				} else if (folders.length > 1) {
					const length = folders.length
					for (let i = 0; i < length; i++) {
						const folder = folders[i]
						const elFolder = document.createElement(
							'file-head-address-folder'
						)
						elFolder.file = folder
						elFolder.textContent = folder.name
						address.appendChild(elFolder)
						if (folders[i + 1]) {
							const elLink = document.createElement(
								'file-head-address-link'
							)
							elLink.textContent = '&'
							address.appendChild(elLink)
						}
					}
				}
				break
			case 'search': {
				const elText = document.createElement('file-head-address-text')
				elText.textContent = `${body.elements.count} 个文件`
				address.appendChild(elText)
				break
			}
		}
	}

	// 指针按下事件
	pointerdown(event) {
		if (!(event.target instanceof HTMLInputElement)) {
			event.preventDefault()
			const { content } = this.links.body
			if (document.activeElement !== content) {
				content.focus()
			}
		}
	}

	// 地址栏 - 指针按下事件
	addressPointerdown(event) {
		switch (event.button) {
			case 0: {
				const element = event.target
				if (element.parentNode === this) {
					if (element.hasClass('active')) {
						return
					}
					window.on(
						'pointerup',
						(event) => {
							if (
								event.button === 0 &&
								element === event.target
							) {
								const head = this.parentNode
								const nav = head.links.nav
								switch (element.tagName) {
									case 'FILE-HEAD-ADDRESS-FOLDER':
										if (!element.disabled) {
											nav.load(element.file)
											nav.scrollToSelection('middle')
										}
										break
									case 'FILE-HEAD-ADDRESS-ARROW': {
										const MAX_MENU_ITEMS = 32
										const { folders, target } = element
										const rect = element.rect()
										const length = Math.min(
											folders.length,
											MAX_MENU_ITEMS
										)
										const menuItems = new Array(length)
										const click = function () {
											nav.load(this.folder)
											nav.scrollToSelection('middle')
										}
										for (let i = 0; i < length; i++) {
											const folder = folders[i]
											menuItems[i] = {
												label: folder.name,
												checked: folder === target,
												folder: folder,
												click: click
											}
										}
										if (folders.length > MAX_MENU_ITEMS) {
											menuItems.push({
												label: '...',
												enabled: false
											})
										}
										element.addClass('active')
										Menu.popup(
											{
												x: rect.left,
												y: rect.bottom,
												close: () => {
													element.removeClass(
														'active'
													)
												}
											},
											menuItems
										)
										break
									}
								}
							}
						},
						{ once: true }
					)
				}
				break
			}
		}
	}

	// 返回按钮 - 鼠标点击事件
	backButtonClick(event) {
		const head = this.parentNode
		const { browser } = head.links
		browser.backToParentFolder()
	}

	// 搜索框 - 输入事件
	searcherInput(event) {
		if (event.inputType !== 'insertCompositionText') {
			const head = this.parentNode
			const text = this.input.value
			head.links.browser.searchFiles(text)
		}
	}

	// 视图模式 - 获得焦点事件
	viewFocus(event) {
		const head = this.parentNode
		head.links.body.content.focus()
	}

	// 视图模式 - 输入事件
	viewInput(event) {
		const head = this.parentNode
		head.links.body.setViewIndex(this.read())
	}
}

customElements.define('file-head-pane', FileHeadPane)

// ******************************** 文件身体面板 ********************************

class FileBodyPane extends HTMLElement {
	viewIndex //:number
	viewMode //:string
	timer //:object
	elements //:array
	activeFile //:object
	selections //:array
	content //:element
	pressing //:function
	windowKeydown //:function
	windowKeyup //:function
	windowPointermove //:function
	openEventEnabled //:boolean
	selectEventEnabled //:boolean
	unselectEventEnabled //:boolean
	popupEventEnabled //:boolean
	textBox //:element

	constructor() {
		super()

		// 创建重命名计时器
		const timer = new Timer({
			duration: 500,
			callback: (timer) => {
				const files = this.selections
				if (files.length === 1) {
					const file = files[0]
					const target = timer.target
					const context = file.getContext(this)
					const element = context.element
					if (element.contains(target)) {
						this.rename(file)
					}
				}
				timer.target = null
				timer.running = false
			}
		})

		// 设置属性
		this.viewIndex = null
		this.viewMode = null
		this.timer = timer
		this.elements = []
		this.elements.versionId = 0
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.activeFile = null
		this.selections = []
		this.content = document.createElement('file-body-content')
		this.content.tabIndex = 0
		this.content.range = new Uint32Array(2)
		this.pressing = null
		this.windowKeydown = FileBodyPane.windowKeydown.bind(this)
		this.windowKeyup = FileBodyPane.windowKeyup.bind(this)
		this.windowPointermove = FileBodyPane.windowPointermove.bind(this)
		this.openEventEnabled = false
		this.selectEventEnabled = false
		this.unselectEventEnabled = false
		this.popupEventEnabled = false
		this.textBox = FileBodyPane.textBox
		this.appendChild(this.content)

		// 设置内容元素属性访问器
		const { elements } = this
		Object.defineProperty(this.content, 'countPerLine', {
			get: function () {
				return elements.count < this.scrollCount
					? this.normalCountPerLine
					: this.scrollCountPerLine
			}
		})

		// 侦听事件
		this.on('scroll', this.resize)
		this.on('keydown', this.keydown)
		this.on('pointerdown', this.pointerdown)
		this.on('pointerup', this.pointerup)
		this.on('doubleclick', this.doubleclick)
		this.on('wheel', this.wheel)
		window.on('keydown', this.windowKeydown)
		// this.on('scroll', this.scroll)
	}

	// 设置视图索引
	setViewIndex(viewIndex) {
		viewIndex = Math.clamp(viewIndex, 0, 4)
		if (this.viewIndex !== viewIndex) {
			const { head } = this.links
			this.viewIndex = viewIndex
			head.view.write(viewIndex)
			this.updateViewMode()
		}
	}

	// 更新视图模式
	updateViewMode() {
		let viewMode = null
		switch (this.viewIndex) {
			case 0:
				viewMode = 'list'
				break
			case 1:
				viewMode = 'small'
				break
			case 2:
				viewMode = 'medium'
				break
			case 3:
				viewMode = 'large'
				break
			case 4:
				viewMode = 'huge'
				break
		}
		if (this.viewMode !== viewMode) {
			viewMode === 'list'
				? this.addClass('horizontal')
				: this.removeClass('horizontal')
			this.content.removeClass(this.viewMode)
			this.content.addClass(viewMode)
			this.resetContentStyle()
			this.viewMode = viewMode
			this.computeGridProperties()
			this.resize()
			this.updateContentOffset()
		}
	}

	// 获取文件
	getFiles() {
		const { browser, nav } = this.links
		const folders = nav.selections
		const filters = browser.filters
		if (!filters) {
			let length = 0
			for (const folder of folders) {
				length += folder.children.length
			}
			let i = 0
			const items = new Array(length)
			for (const folder of folders) {
				for (const item of folder.children) {
					items[i++] = item
				}
			}
			return items
		}
		const items = []
		for (const folder of folders) {
			for (const item of folder.children) {
				if (item instanceof FolderItem || filters.includes(item.type)) {
					items.push(item)
				}
			}
		}
		return items
	}

	// 更新文件
	updateFiles() {
		const { elements } = this
		elements.start = -1
		elements.count = 0

		// 创建列表项目
		const { browser } = this.links
		switch (browser.display) {
			case 'normal':
				this.createFlatItems(this.getFiles())
				break
			case 'search':
				this.createFlatItems(browser.searchResults)
				break
		}

		// 清除多余的元素
		this.clearElements(elements.count)

		// 重新调整
		this.resize()
	}

	// 重新调整
	resize() {
		const ch = this.clientHeight
		const elements = this.elements
		if (ch === 0) {
			return
		}
		const [start, end] = this.computeStartAndEnd()
		this.updateContentSize()
		if (elements.start !== start || elements.end !== end) {
			elements.start = start
			elements.end = end
			this.updateContentOffset()
			const versionId = elements.versionId++
			for (let i = start; i < end; i++) {
				const element = elements[i]
				element.versionId = versionId
				this.updateOnResize(element)
			}
			const content = this.content
			const nodes = content.childNodes
			const last = nodes.length - 1
			for (let i = last; i >= 0; i--) {
				const element = nodes[i]
				if (element.versionId !== versionId) {
					element.remove()
				}
			}
			// 保证尾部元素已经被添加
			const foot = elements[end - 1]
			if (foot && !foot.parentNode) {
				content.appendChild(foot)
			}
			for (let i = end - 2; i >= start; i--) {
				const element = elements[i]
				if (element.parentNode === null) {
					const next = elements[i + 1]
					content.insertBefore(element, next)
				}
			}
		}
	}

	// 计算网格属性
	computeGridProperties() {
		this.content.count = -1
		switch (this.viewMode) {
			case 'list':
				return this.computeListGridProperties()
			case 'small':
				return this.computeTileGridProperties(40, 72)
			case 'medium':
				return this.computeTileGridProperties(72, 104)
			case 'large':
				return this.computeTileGridProperties(136, 168)
			case 'huge':
				return this.computeTileGridProperties(264, 296)
		}
	}

	// 计算列表网格属性
	computeListGridProperties() {
		const { content } = this
		const WIDTH = 240
		const HEIGHT = 20
		const PADDING = 4
		const GAP = 2
		const SCROLLBAR_HEIGHT = 12
		const rect = this.rect()
		const cw = rect.width
		const ch = rect.height
		const ow = Math.max(cw - PADDING * 2 + GAP, 0)
		const oh = Math.max(ch - PADDING * 2, 0)
		const iw = WIDTH + GAP
		const ih = HEIGHT
		const visibleLines = Math.ceil((cw + GAP) / iw) + 1
		const normalCountPerLine = Math.max(Math.floor(oh / ih), 1)
		const scrollCountPerLine = Math.max(
			Math.floor((oh - SCROLLBAR_HEIGHT) / ih),
			1
		)
		const scrollCount = Math.floor(ow / iw) * normalCountPerLine + 1
		content.itemSize = iw
		content.visibleLines = visibleLines
		content.normalCountPerLine = normalCountPerLine
		content.scrollCountPerLine = scrollCountPerLine
		content.scrollCount = scrollCount
	}

	// 计算平铺网格属性
	computeTileGridProperties(width, height) {
		const { content } = this
		const PADDING = 4
		const GAP = 2
		const SCROLLBAR_WIDTH = 12
		const rect = this.rect()
		const cw = rect.width
		const ch = rect.height
		const ow = Math.max(cw - PADDING * 2 + GAP, 0)
		const oh = Math.max(ch - PADDING * 2 + GAP, 0)
		const iw = width + GAP
		const ih = height + GAP
		const visibleLines = Math.ceil((ch + GAP) / ih) + 1
		const normalCountPerLine = Math.max(Math.floor(ow / iw), 1)
		const scrollCountPerLine = Math.max(
			Math.floor((ow - SCROLLBAR_WIDTH) / iw),
			1
		)
		const scrollCount = Math.floor(oh / ih) * normalCountPerLine + 1
		content.itemSize = ih
		content.visibleLines = visibleLines
		content.normalCountPerLine = normalCountPerLine
		content.scrollCountPerLine = scrollCountPerLine
		content.scrollCount = scrollCount
	}

	// 计算开始和结束索引
	computeStartAndEnd() {
		const { range } = this.content
		const { count } = this.elements
		const scroll =
			this.viewMode === 'list'
				? Math.max(this.scrollLeft - 4, 0)
				: Math.max(this.scrollTop - 4, 0)
		const { countPerLine, itemSize, visibleLines } = this.content
		const lines = Math.ceil(count / countPerLine)
		const sLine = Math.clamp(Math.floor(scroll / itemSize), 0, lines - 1)
		const start = countPerLine * sLine
		const length = countPerLine * visibleLines
		const end = Math.min(start + length, count)
		range[0] = start
		range[1] = end
		return range
	}

	// 更新内容元素的尺寸
	updateContentSize() {
		const { content } = this
		const { count } = this.elements
		if (this.clientHeight !== 0 && content.count !== count) {
			content.count = count
			const PADDING = 4
			const GAP = 2
			const { style, countPerLine, itemSize } = content
			const lines = Math.ceil(count / countPerLine)
			const length = Math.max(lines * itemSize - GAP, 0) + PADDING * 2
			if (this.viewMode === 'list') {
				style.width = `${length}px`
			} else {
				style.height = `${length}px`
			}
		}
	}

	// 更新内容元素的偏移
	updateContentOffset() {
		const PADDING = 4
		const { start } = this.elements
		const { style, countPerLine, itemSize } = this.content
		const padding = (start / countPerLine) * itemSize + PADDING
		if (this.viewMode === 'list') {
			style.paddingLeft = `${padding}px`
		} else {
			style.paddingTop = `${padding}px`
		}
	}

	// 重置内容元素的样式
	resetContentStyle() {
		this.content.count = -1
		const { style } = this.content
		switch (this.viewMode) {
			case 'list':
				style.width = ''
				style.paddingLeft = ''
				break
			default:
				style.height = ''
				style.paddingTop = ''
				break
		}
	}

	// 在重新调整时更新
	updateOnResize(element) {
		if (element.changed) {
			element.changed = false
			const { file } = element
			if (file instanceof FileItem) {
				this.updateFileElement(element)
				return
			}
			if (file instanceof FolderItem) {
				this.updateFolderElement(element)
				return
			}
		}
	}

	// 创建扁平排列的项目
	createFlatItems(dir) {
		Directory.sortFiles(dir)
		const elements = this.elements
		const length = dir.length
		for (let i = 0; i < length; i++) {
			const file = dir[i]
			if (file instanceof FileItem) {
				elements[elements.count++] = this.createFileElement(file)
				continue
			}
			if (file instanceof FolderItem) {
				elements[elements.count++] = this.createFolderElement(file)
				continue
			}
		}
	}

	// 创建文件夹元素
	createFolderElement(file) {
		const context = file.getContext(this)
		let element = context.element
		if (element === undefined) {
			// 创建文件夹
			element = document.createElement('file-body-item')
			element.file = file
			element.context = context
			context.element = element

			// 激活选中状态
			const { selections } = this
			if (selections.length !== 0 && selections.includes(file)) {
				element.addClass('selected')
			}
		}
		element.changed = true
		return element
	}

	// 更新文件夹元素
	updateFolderElement(element) {
		if (!element.nameBox) {
			// 创建文件夹图标
			const fileIcon = document.createElement('file-body-icon')
			fileIcon.addClass('icon-folder')
			element.appendChild(fileIcon)

			// 创建名字输入框
			const nameBox = document.createElement('file-body-name')
			nameBox.textContent = element.file.name
			element.appendChild(nameBox)

			// 设置元素属性
			element.draggable = true
			element.fileIcon = fileIcon
			element.nameBox = nameBox
		}
	}

	// 创建文件元素
	createFileElement(file) {
		const context = file.getContext(this)
		let element = context.element
		if (element === undefined) {
			// 创建文件
			element = document.createElement('file-body-item')
			element.addClass('file-item')
			element.file = file
			element.context = context
			context.element = element
		}
		element.changed = true
		return element
	}

	// 更新文件元素
	updateFileElement(element) {
		const { file } = element
		if (!element.nameBox) {
			// 创建文件图标
			const fileIcon = this.createIcon(file)
			element.appendChild(fileIcon)

			// 创建名字输入框
			const nameBox = document.createElement('file-body-name')
			nameBox.textContent = file.basename
			element.appendChild(nameBox)

			// 设置元素属性
			element.draggable = true
			element.fileIcon = fileIcon
			element.nameBox = nameBox

			// 激活选中状态
			const { selections } = this
			if (selections.length !== 0 && selections.includes(file)) {
				element.addClass('selected')
			}
		}
		// 当图像改变时更新图标
		if (element.fileIcon.isImageChanged?.()) {
			this.updateIcon(file)
		}
	}

	// 创建图标
	createIcon(file) {
		const icon = document.createElement('file-body-icon')
		switch (file.type) {
			case 'actor': {
				const data = file.data
				if (!data?.portrait) {
					icon.addClass('icon-file-actor')
					break
				}
				const meta = Data.manifest.guidMap[data.portrait]
				const [cx, cy, cw, ch] = data.clip
				if (!meta || cw * ch === 0) break
				const version = meta.mtimeMs
				const path = `${File.getPath(data.portrait)}?ver=${version}`
				icon.isImageChanged = () => version !== meta.mtimeMs
				this.setIconClip(icon, path, cx, cy, cw, ch)
				break
			}
			case 'skill':
			case 'item':
			case 'equipment':
			case 'state': {
				const data = file.data
				if (!data?.icon) {
					icon.addClass('icon-file-cube')
					break
				}
				const meta = Data.manifest.guidMap[data.icon]
				const [cx, cy, cw, ch] = data.clip
				if (!meta || cw * ch === 0) break
				const version = meta.mtimeMs
				const path = `${File.getPath(data.icon)}?ver=${version}`
				icon.isImageChanged = () => version !== meta.mtimeMs
				this.setIconClip(icon, path, cx, cy, cw, ch)
				break
			}
			case 'trigger':
				icon.addClass('icon-file-trigger')
				break
			case 'event':
				icon.addClass('icon-file-event')
				icon.textContent = 'EV'
				if (!file.data?.enabled) {
					icon.addClass('disabled')
				}
				break
			case 'scene':
				icon.addClass('icon-file-scene')
				break
			case 'tileset':
				icon.addClass('icon-file-tileset')
				break
			case 'ui':
				icon.addClass('icon-file-ui')
				break
			case 'animation':
				icon.addClass('icon-file-animation')
				break
			case 'particle':
				icon.addClass('icon-file-particle')
				break
			case 'image': {
				const version = file.stats.mtimeMs
				const path = `${file.path}?ver=${version}`
				icon.style.backgroundImage = CSS.encodeURL(File.route(path))
				File.getImageResolution(path).then(({ width, height }) => {
					if (width <= 128 && height <= 128) {
						icon.style.imageRendering = 'pixelated'
					}
					if (Math.max(width, height) > GL.maxTexSize) {
						FileItem.addOversizeImagePaths(file.path)
					}
				})
				break
			}
			case 'audio':
				icon.addClass('icon-file-event')
				icon.addClass('icon-file-audio')
				icon.textContent = '\uf028'
				break
			case 'video':
				icon.addClass('icon-file-event')
				icon.addClass('icon-file-video')
				icon.textContent = '\uf008'
				break
			case 'font':
				icon.addClass('icon-file-font')
				break
			case 'script':
				icon.addClass('icon-file-event')
				icon.addClass('icon-file-script')
				switch (file.extname) {
					case '.js':
						icon.textContent = 'JS'
						break
					case '.ts':
						icon.textContent = 'TS'
						break
				}
				break
			default:
				icon.addClass('icon-file-other')
				icon.textContent = file.extname.slice(1)
				break
		}
		return icon
	}

	// 更新图标
	updateIcon(file) {
		const { element } = file.getContext(this)
		if (element?.fileIcon) {
			const icon = this.createIcon(file)
			element.replaceChild(icon, element.fileIcon)
			element.fileIcon = icon
		}
	}

	// 设置图标剪辑
	setIconClip(icon, path, cx, cy, cw, ch) {
		File.getImageResolution(path).then(({ width, height }) => {
			// 当cw和ch为负数时为划分模式
			if (cw < 0) {
				cw = Math.floor(width / -cw)
				ch = Math.floor(height / -ch)
				if (cw * ch === 0) {
					return
				}
			}
			if (cw !== ch) {
				if (cw > ch) {
					const oy = (cw - ch) / 2
					const t = (100 * oy) / cw
					const b = 100 - t
					cy -= oy
					icon.style.clipPath = `polygon(0 ${t}%, 100% ${t}%, 100% ${b}%, 0 ${b}%)`
				} else {
					const ox = (ch - cw) / 2
					const l = (100 * ox) / ch
					const r = 100 - l
					cx -= ox
					icon.style.clipPath = `polygon(${l}% 0, ${r}% 0, ${r}% 100%, ${l}% 100%)`
				}
			}
			const size = Math.max(cw, ch)
			const sx = width / size
			const sy = height / size
			const px = sx !== 1 ? cx / size / (sx - 1) : 0
			const py = sy !== 1 ? cy / size / (sy - 1) : 0
			icon.style.backgroundImage = CSS.encodeURL(File.route(path))
			icon.style.backgroundPosition = `${px * 100}% ${py * 100}%`
			icon.style.backgroundSize = `${sx * 100}% ${sy * 100}%`
			if (size <= 128) {
				icon.style.imageRendering = 'pixelated'
			}
		})
	}

	// 激活文件
	activateFile(file) {
		if (file instanceof FolderItem) {
			return this.select(file)
		}
		this.activeFile = file
		// 如果已激活文件未在选中列表中
		// 暂时高亮已激活文件
		// 取消对选中文件的高亮
		if (!this.selections.includes(file)) {
			const context = file.getContext(this)
			context.element.addClass('selected')
			for (const file of this.selections) {
				const context = file.getContext(this)
				context.element?.removeClass('selected')
			}
		}
		const pointerup = (event) => {
			if (this.pressing === pointerup) {
				this.pressing = null
				this.selectActiveFile()
			}
		}
		this.pressing = pointerup
		window.on('pointerup', pointerup, { once: true })
	}

	// 取消激活文件
	deactivateFile() {
		if (this.activeFile instanceof FileItem) {
			// 如果已激活文件未在选中列表中
			// 取消对已激活文件的高亮
			// 恢复对选中文件的高亮
			if (!this.selections.includes(this.activeFile)) {
				const context = this.activeFile.getContext(this)
				context.element.removeClass('selected')
				for (const file of this.selections) {
					const context = file.getContext(this)
					context.element?.addClass('selected')
				}
			}
			this.activeFile = null
		}
	}

	// 选择激活的文件
	selectActiveFile() {
		if (this.activeFile instanceof FileItem) {
			if (!this.selections.includes(this.activeFile)) {
				this.select(this.activeFile)
			}
			this.activeFile = null
		}
	}

	// 选择文件
	select(...files) {
		this.unselect()
		this.selections = files
		for (const file of files) {
			const context = file.getContext(this)
			context.element?.addClass('selected')
		}
		if (this.selectEventEnabled) {
			const select = new Event('select')
			select.value = files
			this.dispatchEvent(select)
		}
	}

	// 选择全部
	selectAll() {
		const { elements } = this
		const { count } = elements
		const files = new Array(count)
		for (let i = 0; i < count; i++) {
			files[i] = elements[i].file
		}
		this.select(...files)
	}

	// 取消选择
	unselect() {
		const files = this.selections
		if (files.length !== 0) {
			FileBodyPane.textBox.input.blur()
			for (const file of files) {
				const context = file.getContext(this)
				const element = context.element
				if (element !== undefined) {
					element.removeClass('selected')
				}
			}
			this.selections = []
			if (this.unselectEventEnabled) {
				const unselect = new Event('unselect')
				unselect.value = files
				this.dispatchEvent(unselect)
			}
		}
	}

	// 选择路径匹配的项目
	selectByPath(path) {
		const { elements } = this
		const { count } = elements
		for (let i = 0; i < count; i++) {
			const { file } = elements[i]
			if (file.path === path) {
				return this.select(file)
			}
		}
		this.unselect()
	}

	// 选择默认项目
	selectDefault() {
		const { elements } = this
		const { count } = elements
		for (let i = 0; i < count; i++) {
			if (elements[i].hasClass('selected')) {
				return
			}
		}
		if (count !== 0) {
			this.select(elements[0].file)
		}
	}

	// 在网格列表中选择相对位置的项目
	selectRelativeInGridMode(direction) {
		const { elements } = this
		const { count } = elements
		if (count > 0) {
			let index
			let start = Infinity
			let end = -Infinity
			const { selections } = this
			for (const file of selections) {
				const { element } = file.getContext(this)
				const index = elements.indexOf(element)
				if (index !== -1) {
					start = Math.min(start, index)
					end = Math.max(end, index)
				}
			}
			if (start === Infinity) {
				switch (direction) {
					case 'prev':
					case 'prev-line':
						index = count - 1
						break
					case 'next':
					case 'next-line':
						index = 0
						break
				}
			} else {
				const { countPerLine } = this.content
				switch (direction) {
					case 'prev':
						index = start - 1
						break
					case 'next':
						index = end + 1
						break
					case 'prev-line':
						index = start - countPerLine
						break
					case 'next-line':
						index = end + countPerLine
						if (index >= count) {
							const line = Math.floor(index / countPerLine)
							const head = line * countPerLine
							if (count > head) {
								index = count - 1
							}
						}
						break
				}
			}
			const file = elements[index]?.file
			if (file === undefined) return
			if (!(selections.length === 1 && selections[0] === file)) {
				this.select(file)
			}
			this.scrollToSelectionInGridMode()
		}
	}

	// 在网格列表中滚动到选中项
	scrollToSelectionInGridMode(mode = 'active') {
		const { selections } = this
		if (selections.length === 1 && this.hasScrollBar()) {
			const selection = selections[0]
			const elements = this.elements
			const count = elements.count
			for (let i = 0; i < count; i++) {
				if (elements[i].file === selection) {
					const size = this.content.itemSize
					const apl = this.content.countPerLine
					const pos = Math.floor(i / apl) * size
					const PADDING = 4
					const GAP = 2
					let property
					let clientSize
					switch (this.viewMode) {
						case 'list':
							property = 'scrollLeft'
							clientSize = this.clientWidth
							break
						default:
							property = 'scrollTop'
							clientSize = this.clientHeight
							break
					}
					let scroll = this[property]
					switch (mode) {
						case 'active':
							scroll = Math.clamp(
								scroll,
								pos + size + PADDING * 2 - GAP - clientSize,
								pos
							)
							break
						default:
							return
					}
					if (this[property] !== scroll) {
						this[property] = scroll
					}
					break
				}
			}
		}
	}

	// 获取目录名
	getDirName() {
		let dirname = ''
		const files = this.selections
		switch (files.length) {
			case 0: {
				const { nav } = this.links
				const folders = nav.selections
				if (folders.length === 1) {
					dirname = folders[0].path
				}
				break
			}
			case 1: {
				const file = files[0]
				dirname = file.path
				if (file instanceof FileItem) {
					dirname = Path.dirname(dirname)
				}
				break
			}
		}
		return dirname
	}

	// 创建文件夹
	createFolder() {
		const dirname = this.getDirName()
		if (dirname) {
			const { path, route } = File.getFileName(dirname, 'New Folder')
			FSP.mkdir(route, { recursive: true })
				.then(() => {
					return Directory.update()
				})
				.then((changed) => {
					if (changed) {
						const folder = Directory.getFolder(path)
						if (folder.path === path) {
							this.links.nav.load(folder.parent)
							this.select(folder)
							this.rename(folder)
						}
					}
				})
		}
	}

	// 在资源管理器中显示
	showInExplorer() {
		let length = 0
		const elements = this.elements
		for (const file of this.selections) {
			const { element } = file.getContext(this)
			if (elements.includes(element)) {
				File.showInExplorer(File.route(file.path))
				if (++length === 10) {
					break
				}
			}
		}
	}

	// 打开文件位置
	openFileLocation(file) {
		if (file) {
			const folder = Directory.getFolder(file.path)
			if (folder instanceof FolderItem) {
				const { nav } = this.links
				nav.load(folder)
				nav.scrollToSelection('middle')
			}
		}
	}

	// 打开文件
	openFile(file) {
		if (file instanceof FolderItem) {
			const { nav } = this.links
			nav.load(file)
			nav.scrollToSelection('middle')
		}
		if (file instanceof FileItem && this.openEventEnabled) {
			const open = new Event('open')
			open.value = file
			this.dispatchEvent(open)
		}
	}

	// 复制文件
	copyFiles(cut = false) {
		const guids = []
		for (const file of this.selections) {
			if (file instanceof FolderItem) return
			if (file instanceof FileItem) {
				guids.push(file.meta.guid)
			}
		}
		if (guids.length !== 0) {
			Clipboard.write('yami.files', { cut, guids })
		}
	}

	// 粘贴文件
	pasteFiles(targetPath) {
		const { browser, nav } = this.links
		if (!targetPath && nav.selections.length === 1) {
			targetPath = nav.selections[0].path
		}
		if (!targetPath) return
		const copy = Clipboard.read('yami.files')
		if (copy) {
			const files = []
			for (const guid of copy.guids) {
				const meta = Data.manifest.guidMap[guid]
				if (meta) files.push(meta.file)
			}
			if (files.length !== 0) {
				const { absolutePaths } = browser.getFilePaths(files)
				Directory.readdir(absolutePaths)
					.then((dir) => {
						const path = File.route(targetPath)
						return copy.cut
							? Directory.moveFiles(path, dir)
							: Directory.saveFiles(files).then(() =>
									Directory.copyFiles(path, dir)
								)
					})
					.finally(() => {
						Directory.update()
					})
			}
			// 剪切后擦除剪切板数据
			if (copy.cut) {
				Clipboard.write('yami.no-files', null)
			}
		}
	}

	// 删除文件
	deleteFiles() {
		const files = []
		const { selections } = this
		if (!selections.includes(Directory.assets)) {
			const elements = this.elements
			for (const file of selections) {
				const { element } = file.getContext(this)
				if (elements.includes(element)) {
					files.push(file)
				}
			}
		}
		const { length } = files
		if (length === 0) {
			return
		}
		const get = Local.createGetter('confirmation')
		if (length === 1 && files[0] instanceof FileItem) {
			const list = Reference.findRelated(files[0].meta.guid)
			if (!list.isEmpty) {
				Reference.openList(list)
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
								Directory.deleteFiles(files).then(() => {
									return Directory.update()
								})
							}
						},
						{
							label: get('no')
						}
					]
				)
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
							return Directory.update()
						})
					}
				},
				{
					label: get('no')
				}
			]
		)
	}

	// 重命名
	rename(file) {
		const { textBox } = FileBodyPane
		if (
			document.activeElement === this.content &&
			file !== Directory.assets &&
			!textBox.parentNode
		) {
			const context = file.getContext(this)
			const element = context.element
			if (element && element.parentNode) {
				element.nameBox.hide()
				element.appendChild(textBox)
				textBox.write(file.basename ?? file.name)
				textBox.getFocus('all')
				switch (this.viewMode) {
					case 'list':
						textBox.fitContent()
						break
					default:
						textBox.style.width = ''
						break
				}
			}
		}
	}

	// 取消重命名
	cancelRenaming() {
		const { timer } = this
		if (timer.target) {
			timer.target = null
		}
		if (timer.running) {
			timer.running = false
			timer.remove()
		}
	}

	// 导入文件
	importFiles() {
		const { nav } = this.links
		const folders = nav.selections
		if (folders.length !== 1) {
			return
		}
		const folder = folders[0]
		const dialogs = Editor.config.dialogs
		const location = Path.normalize(dialogs.import)
		const images = ['png', 'jpg', 'jpeg', 'cur', 'webp']
		const audio = ['mp3', 'm4a', 'ogg', 'wav', 'flac']
		const videos = ['mp4', 'mkv', 'webm']
		const fonts = ['ttf', 'otf', 'woff', 'woff2']
		File.showOpenDialog({
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
		}).then(({ filePaths }) => {
			if (filePaths.length !== 0) {
				const dir = folder.path
				const promises = []
				const length = filePaths.length
				for (let i = 0; i < length; i++) {
					const src = Path.slash(filePaths[i])
					const ext = Path.extname(src)
					const base = Path.basename(src, ext)
					const dst = File.getFileName(dir, base, ext).route
					promises.push(FSP.copyFile(src, dst))
				}
				Promise.all(promises).then(() => {
					return Directory.update()
				}) /* .then(changed => {
          if (changed) {
            browser.dirchange()
          }
        }) */
				dialogs.import = Path.slash(Path.dirname(filePaths[0]))
			}
		})
	}

	// 导出文件
	exportFile() {
		const files = this.selections
		const dialogs = Editor.config.dialogs

		if (files.length === 1 && files[0] instanceof FileItem) {
			// 导出单个文件
			const file = files[0]
			const name = file.basename + file.extname
			File.showSaveDialog({
				defaultPath: Path.resolve(dialogs.export, name)
			})
				.then(({ filePath }) => {
					if (filePath) {
						dialogs.export = Path.slash(Path.dirname(filePath))
						return FSP.copyFile(File.route(file.path), filePath)
					}
				})
				.finally(() => {
					Directory.update()
				})
		} else {
			// 导出文件夹或多个文件
			File.showOpenDialog({
				defaultPath: Path.normalize(dialogs.export),
				properties: ['openDirectory']
			})
				.then(({ filePaths }) => {
					if (filePaths.length === 1) {
						const dirPath = filePaths[0]
						dialogs.export = Path.slash(dirPath)
						return Directory.readdir(
							files.map((file) => File.route(file.path))
						).then((dir) => {
							return Directory.copyFiles(dirPath, dir, '')
						})
					}
				})
				.finally(() => {
					Directory.update()
				})
		}
	}

	// 清除元素
	clearElements(start) {
		// 有条件地调整缓存大小
		const { elements } = this
		if (elements.length > 256 && elements.length !== start) {
			elements.length = start
		}
		let i = start
		while (elements[i] !== undefined) {
			elements[i++] = undefined
		}
	}

	// 清除列表
	clear() {
		this.unselect()
		this.content.textContent = ''
		this.clearElements(0)
		this.elements.count = 0
		this.elements.start = -1
		this.elements.end = -1
		this.resetContentStyle()
		return this
	}

	// 添加事件
	on(type, listener, options) {
		super.on(type, listener, options)
		switch (type) {
			case 'open':
				this.openEventEnabled = true
				break
			case 'select':
				this.selectEventEnabled = true
				break
			case 'unselect':
				this.unselectEventEnabled = true
				break
			case 'popup':
				this.popupEventEnabled = true
				break
		}
	}

	// 键盘按下事件
	keydown(event) {
		if (event.cmdOrCtrlKey) {
			switch (event.code) {
				case 'ArrowUp':
					this.scrollTop -= 20
					break
				case 'ArrowDown':
					this.scrollTop += 20
					break
				case 'KeyA':
					this.selectAll()
					break
				default:
					return
			}
			event.stopImmediatePropagation()
		} else if (event.altKey) {
			return
		} else {
			switch (event.code) {
				case 'Space':
					event.preventDefault()
					// this.links.nav.focus()
					// 返回：为了不占用这个按键
					return
				case 'Enter':
				case 'NumpadEnter': {
					const files = this.selections
					if (files.length === 1) {
						const file = files[0]
						const { element } = file.getContext(this)
						if (this.elements.includes(element)) {
							this.openFile(file)
						}
					}
					break
				}
				case 'Delete':
					this.deleteFiles()
					break
				case 'Escape':
				case 'Backspace': {
					const { browser } = this.links
					if (!browser.backToParentFolder()) return
					break
				}
				case 'ArrowLeft':
					event.preventDefault()
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('prev-line')
							break
						default:
							this.selectRelativeInGridMode('prev')
							break
					}
					break
				case 'ArrowRight':
					event.preventDefault()
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('next-line')
							break
						default:
							this.selectRelativeInGridMode('next')
							break
					}
					break
				case 'ArrowUp':
					event.preventDefault()
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('prev')
							break
						default:
							this.selectRelativeInGridMode('prev-line')
							break
					}
					break
				case 'ArrowDown':
					event.preventDefault()
					switch (this.viewMode) {
						case 'list':
							this.selectRelativeInGridMode('next')
							break
						default:
							this.selectRelativeInGridMode('next-line')
							break
					}
					break
				case 'F2': {
					const files = this.selections
					if (files.length === 1) {
						this.cancelRenaming()
						this.rename(files[0])
					}
					break
				}
				default:
					return
			}
			event.stopImmediatePropagation()
		}
	}

	// 指针按下事件
	pointerdown(event) {
		this.cancelRenaming()
		switch (event.button) {
			case 0:
			case 2: {
				let element = event.target
				if (element === this.content) {
					element = this
				}
				if (element === this) {
					if (
						this.contains(document.activeElement) &&
						this.isInContent(event)
					) {
						this.unselect()
					}
				} else {
					if (
						element.tagName === 'FILE-BODY-ICON' ||
						element.tagName === 'FILE-BODY-NAME'
					) {
						element = element.parentNode
					}
					if (element.tagName === 'FILE-BODY-ITEM') {
						if (event.altKey && element.file instanceof FileItem) {
							Reference.openRelated(element.file.meta.guid)
							// 阻止focus后快捷键不被禁用的情况
							event.preventDefault()
							event.stopImmediatePropagation()
							return
						}
						const selections = this.selections
						const length = selections.length
						if (event.cmdOrCtrlKey && length !== 0) {
							const elements = this.elements
							const files = Array.from(selections)
							for (let i = length - 1; i >= 0; i--) {
								const { element } = files[i].getContext(this)
								if (!elements.includes(element)) {
									files.splice(i, 1)
								}
							}
							if (!selections.includes(element.file)) {
								files.append(element.file)
								this.select(...files)
							} else if (event.button === 0) {
								files.remove(element.file)
								const pointerup = (event) => {
									if (this.pressing === pointerup) {
										this.pressing = null
										if (element.contains(event.target)) {
											this.select(...files)
										}
									}
								}
								this.pressing = pointerup
								window.on('pointerup', pointerup, {
									once: true
								})
							}
							return
						}
						if (event.shiftKey && length !== 0) {
							const elements = this.elements
							let start = elements.indexOf(element)
							let end = start
							for (let i = 0; i < length; i++) {
								const { element } =
									selections[i].getContext(this)
								const index = elements.indexOf(element)
								if (index !== -1) {
									start = Math.min(start, index)
									end = Math.max(end, index)
								}
							}
							if (start !== -1) {
								const slice = elements.slice(start, end + 1)
								this.select(
									...slice.map((element) => element.file)
								)
								return
							}
						}
						if (!element.hasClass('selected')) {
							switch (event.button) {
								case 0:
									this.activateFile(element.file)
									break
								case 2:
									this.select(element.file)
									break
							}
						} else if (event.button === 0) {
							if (length > 1) {
								const pointerup = (event) => {
									if (this.pressing === pointerup) {
										this.pressing = null
										if (element.contains(event.target)) {
											this.select(element.file)
										}
									}
								}
								this.pressing = pointerup
								window.on('pointerup', pointerup, {
									once: true
								})
							} else {
								this.activateFile(element.file)
								if (
									Menu.state === 'closed' &&
									document.activeElement === this.content &&
									event.target.tagName === 'FILE-BODY-NAME'
								) {
									this.timer.target = event.target
								}
							}
						}
					}
				}
				if (event.target === this) {
					event.preventDefault()
					this.content.focus()
				}
				break
			}
			case 3: {
				const { browser } = this.links
				browser.backToParentFolder()
				break
			}
		}
	}

	// 指针弹起事件
	pointerup(event) {
		switch (event.button) {
			case 0:
				if (
					document.activeElement === this.content &&
					this.timer.target === event.target
				) {
					this.timer.running = true
					this.timer.elapsed = 0
					this.timer.add()
				}
				break
			case 2:
				if (
					document.activeElement === this.content &&
					this.popupEventEnabled
				) {
					const popup = new Event('popup')
					popup.raw = event
					popup.clientX = event.clientX
					popup.clientY = event.clientY
					this.dispatchEvent(popup)
				}
				break
		}
	}

	// 鼠标双击事件
	doubleclick(event) {
		let element = event.target
		if (
			element.tagName === 'FILE-BODY-ICON' ||
			element.tagName === 'FILE-BODY-NAME'
		) {
			element = element.parentNode
		}
		if (element.tagName === 'FILE-BODY-ITEM') {
			// 阻止打开文件夹时目标元素消失导致列表失去焦点
			event.preventDefault()
			this.cancelRenaming()
			this.openFile(element.file)
		}
	}

	// 鼠标滚轮事件
	wheel(event) {
		const { deltaY } = event
		if (deltaY !== 0) {
			if (event.cmdOrCtrlKey) {
				event.preventDefault()
				const index = this.viewIndex
				const delta = Math.sign(-deltaY)
				return this.setViewIndex(index + delta)
			}
			if (
				this.viewMode === 'list' &&
				this.clientWidth < this.scrollWidth
			) {
				this.scrollLeft += deltaY < 0 ? -60 : 60
			}
		}
	}

	// 滚动事件
	// 有可能没必要
	// 切换视图模式的情况也要执行相同操作
	// scroll(event) {
	//   const {textBox} = this
	//   if (textBox.parentNode) {
	//     textBox.input.blur()
	//     this.focus()
	//   }
	// }

	// 窗口 - 键盘按下事件
	static windowKeydown(event) {
		if (event.altKey) {
			switch (event.code) {
				case 'AltLeft':
					if (
						!Window.getTopWindow() ||
						Window.getTopWindow()?.id === 'selector'
					) {
						this.content.addClass('alt')
						window.on('keyup', this.windowKeyup)
						window.on('pointermove', this.windowPointermove)
					}
					break
			}
		}
	}

	// 窗口 - 键盘弹起事件
	static windowKeyup(event) {
		if (!event.altKey) {
			switch (event.code) {
				case 'AltLeft':
					this.content.removeClass('alt')
					window.off('keyup', this.windowKeyup)
					window.off('pointermove', this.windowPointermove)
					break
			}
		}
	}

	// 窗口 - 指针移动事件
	static windowPointermove(event) {
		if (!event.altKey) {
			this.content.removeClass('alt')
			window.off('keyup', this.windowKeyup)
			window.off('pointermove', this.windowPointermove)
		}
	}

	// 静态 - 创建文本输入框
	static textBox = (function IIFE() {
		const textBox = new TextBox()
		textBox.setMaxLength(64)
		textBox.addClass('file-body-text-box')
		textBox.input.addClass('file-body-text-box-input')

		// 键盘按下事件
		textBox.on('keydown', function (event) {
			event.stopPropagation()
			switch (event.code) {
				case 'Enter':
				case 'NumpadEnter':
				case 'Escape': {
					const item = this.parentNode
					const content = item.parentNode
					this.input.blur()
					content.focus()
					break
				}
			}
		})

		// 输入前事件
		textBox.on('beforeinput', function (event) {
			if (
				event.inputType === 'insertText' &&
				typeof event.data === 'string'
			) {
				const regexp = /[\\/:*?"<>|]/
				if (regexp.test(event.data)) {
					event.preventDefault()
					event.stopPropagation()
				}
			}
		})

		// 输入事件
		textBox.on('input', function (event) {
			if (this.style.width !== '') {
				this.fitContent()
			}
		})

		// 选择事件
		textBox.on('select', function (event) {
			event.stopPropagation()
		})

		// 失去焦点事件
		textBox.on('blur', function (event) {
			const item = this.parentNode
			const file = item.file
			const name = this.read().trim()
			let filename = name
			this.remove()
			item.nameBox.show()
			if (!name) return
			if (file instanceof FileItem) {
				const guid = file.meta?.guid
				if (typeof guid === 'string') {
					filename += '.' + guid
				}
				filename += file.extname
			}
			if (filename !== file.name) {
				const dir = Path.dirname(file.path)
				const path = File.route(`${dir}/${filename}`)
				// 当目标文件不存在或就是自己时重命名
				FSP.stat(path, FolderItem.bigint)
					.then((stats) => {
						if (stats.ino === file.stats.ino) {
							throw new Error('same file')
						}
					})
					.catch((error) => {
						return FSP.rename(File.route(file.path), path).then(
							() => {
								item.nameBox.textContent = name
								return Directory.update()
							}
						)
					})
			}
		})

		return textBox
	})()
}

customElements.define('file-body-pane', FileBodyPane)
