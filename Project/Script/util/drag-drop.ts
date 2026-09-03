{
	let dragging = false;
	let osdragging = false;

	const dragstart = function (event: DragEvent): void {
		dragging = true;
		event.preventDefault();
		window.on('pointerup', pointerup);
	};

	const dragend = function (event: DragEvent): void {
		if (dragging) {
			dragging = false;
			window.off('pointerup', pointerup);
		}
	};

	const pointerup = function (event: PointerEvent): void {
		if (dragging) {
			dragging = false;
			window.off('pointerup', pointerup);
		}
	};

	const dragenter = function (event: DragEvent): void {
		if (!dragging && !osdragging && !event.relatedTarget) {
			osdragging = true;
			window.dispatchEvent(new DragEvent('os-dragstart'));
			window.on('dragleave', dragleave);
			window.on('dragover', dragover);
			window.on('drop', drop);
		}
	};

	const dragleave = function (event: DragEvent): void {
		if (osdragging && !event.relatedTarget) {
			osdragging = false;
			window.dispatchEvent(new DragEvent('os-dragend'));
			window.off('dragleave', dragleave);
			window.off('dragover', dragover);
			window.off('drop', drop);
		}
	};

	const dragover = function (event: DragEvent): void {
		event.preventDefault();
	};

	const drop = function (event: DragEvent): void {
		event.preventDefault();
		event.stopPropagation();
		if (osdragging) {
			osdragging = false;
			window.dispatchEvent(new DragEvent('os-dragend'));
			window.off('dragleave', dragleave);
			window.off('dragover', dragover);
			window.off('drop', drop);
		}
	};

	window.on('dragstart', dragstart);
	window.on('dragend', dragend);
	window.on('dragenter', dragenter);
}
