const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..', 'Project');
const headFile = path.join(projectDir, 'html', 'head.html');
const initOut = path.join(projectDir, 'Script', 'main', 'module-init.js');

const head = fs.readFileSync(headFile, 'utf-8');
const scriptMatches = [...head.matchAll(/src="(Script\/[^"]+)"/g)];
const scriptPaths = scriptMatches.map((m) => m[1]);
const userScripts = scriptPaths.filter((p) => !p.startsWith('Script/vs/'));

// 已由真 ESM 改造、显式 import/export 的文件，跳过全局绑定注入
const realEsmExclude = new Set([
	'Script/animation/animation-player.ts',
	'Script/animation/animation-window.ts',
	'Script/animation/curve-window.ts',
	'Script/attribute/attribute-context.ts',
	'Script/attribute/attribute-window.ts',
	'Script/audio/audio-manager.ts',
	'Script/audio/audio-player.ts',
	'Script/audio/multiple-audio-player.ts',
	'Script/audio/reverb.ts',
	'Script/browser/project-browser.ts',
	'Script/browser/resource-selector.ts',
	'Script/codec/codec.ts',
	'Script/command/actor-accessor-window.ts',
	'Script/command/ancestor-accessor-window.ts',
	'Script/command/angle-accessor-window.ts',
	'Script/command/command-color.ts',
	'Script/command/command-custom.ts',
	'Script/command/command-object.ts',
	'Script/command/command-parse.ts',
	'Script/command/command-tip.ts',
	'Script/command/command-util.ts',
	'Script/command/conditional-branch-window.ts',
	'Script/command/conditional-condition-window.ts',
	'Script/command/custom-command-window.ts',
	'Script/command/element-accessor-window.ts',
	'Script/command/equipment-accessor-window.ts',
	'Script/command/event-editor.ts',
	'Script/command/item-accessor-window.ts',
	'Script/command/light-accessor-window.ts',
	'Script/command/mark-string-manager.ts',
	'Script/command/match-branch-window.ts',
	'Script/command/match-condition-window.ts',
	'Script/command/move-element-property-window.ts',
	'Script/command/move-light-property-window.ts',
	'Script/command/position-accessor-window.ts',
	'Script/command/property-window-factory.ts',
	'Script/command/region-accessor-window.ts',
	'Script/command/scene-object-accessor-window.ts',
	'Script/command/set-animation-property-window.ts',
	'Script/command/set-button-property-window.ts',
	'Script/command/set-dialog-property-window.ts',
	'Script/command/set-image-property-window.ts',
	'Script/command/set-progress-property-window.ts',
	'Script/command/set-text-property-window.ts',
	'Script/command/set-textbox-property-window.ts',
	'Script/command/set-value-operand-window.ts',
	'Script/command/set-video-property-window.ts',
	'Script/command/set-window-property-window.ts',
	'Script/command/show-options-window.ts',
	'Script/command/skill-accessor-window.ts',
	'Script/command/state-accessor-window.ts',
	'Script/command/text-tip.ts',
	'Script/command/tilemap-accessor-window.ts',
	'Script/command/trigger-accessor-window.ts',
	'Script/command/variable-accessor-window.ts',
	'Script/components/check-box.ts',
	'Script/components/color-box.ts',
	'Script/components/command-history.ts',
	'Script/components/command-list.ts',
	'Script/components/common-list.ts',
	'Script/components/custom-box.ts',
	'Script/components/detail-box.ts',
	'Script/components/detail-summary.ts',
	'Script/components/drag-and-drop-hint.ts',
	'Script/components/element-methods.ts',
	'Script/components/empty-state.ts',
	'Script/components/file-body-pane.ts',
	'Script/components/file-browser.ts',
	'Script/components/file-head-pane.ts',
	'Script/components/file-nav-pane.ts',
	'Script/components/file-var.ts',
	'Script/components/filter-box.ts',
	'Script/components/gamepad-box.ts',
	'Script/components/history-timer.ts',
	'Script/components/keyboard-box.ts',
	'Script/components/loading-overlay.ts',
	'Script/components/marquee-area.ts',
	'Script/components/menu-list.ts',
	'Script/components/nav-bar.ts',
	'Script/components/number-box.ts',
	'Script/components/number-history.ts',
	'Script/components/number-var.ts',
	'Script/components/page-manager.ts',
	'Script/components/param-history.ts',
	'Script/components/param-list.ts',
	'Script/components/parameter-pane.ts',
	'Script/components/radio-box.ts',
	'Script/components/radio-proxy.ts',
	'Script/components/scroll-bar.ts',
	'Script/components/scroll-listener.ts',
	'Script/components/select-box.ts',
	'Script/components/select-list.ts',
	'Script/components/select-var.ts',
	'Script/components/slider-box.ts',
	'Script/components/string-var.ts',
	'Script/components/switch-item.ts',
	'Script/components/tab-bar.ts',
	'Script/components/text-area.ts',
	'Script/components/text-box.ts',
	'Script/components/text-history.ts',
	'Script/components/textarea-var.ts',
	'Script/components/title-bar.ts',
	'Script/components/toast.ts',
	'Script/components/tree-data-context.ts',
	'Script/components/tree-list.ts',
	'Script/components/type-registry.ts',
	'Script/components/window-frame.ts',
	'Script/data/data-object.ts',
	'Script/data/metadata-manifest.ts',
	'Script/data/metadata.ts',
	'Script/data/project-settings-window.ts',
	'Script/data/team-window.ts',
	'Script/data/transition-window.ts',
	'Script/enum/enum-context.ts',
	'Script/enum/enum-window.ts',
	'Script/file/directory-object.ts',
	'Script/file/file-item.ts',
	'Script/file/file-system-core.ts',
	'Script/file/file-system.ts',
	'Script/file/folder-item.ts',
	'Script/file/guid.ts',
	'Script/file/path-utils.ts',
	'Script/inspector/animation-action-page.ts',
	'Script/inspector/animation-bone-frame-page.ts',
	'Script/inspector/animation-bone-layer-page.ts',
	'Script/inspector/animation-particle-frame-page.ts',
	'Script/inspector/animation-particle-layer-page.ts',
	'Script/inspector/animation-sound-frame-page.ts',
	'Script/inspector/animation-sound-layer-page.ts',
	'Script/inspector/animation-sprite-frame-page.ts',
	'Script/inspector/animation-sprite-layer-page.ts',
	'Script/inspector/element-animation-page.ts',
	'Script/inspector/element-button-page.ts',
	'Script/inspector/element-container-page.ts',
	'Script/inspector/element-dialog-page.ts',
	'Script/inspector/element-image-page.ts',
	'Script/inspector/element-page.ts',
	'Script/inspector/element-progress-page.ts',
	'Script/inspector/element-reference-page.ts',
	'Script/inspector/element-text-page.ts',
	'Script/inspector/element-textbox-page.ts',
	'Script/inspector/element-video-page.ts',
	'Script/inspector/element-window-page.ts',
	'Script/inspector/file-actor-page.ts',
	'Script/inspector/file-animation-page.ts',
	'Script/inspector/file-audio-page.ts',
	'Script/inspector/file-equipment-page.ts',
	'Script/inspector/file-event-page.ts',
	'Script/inspector/file-font-page.ts',
	'Script/inspector/file-image-page.ts',
	'Script/inspector/file-item-page.ts',
	'Script/inspector/file-particle-page.ts',
	'Script/inspector/file-scene-page.ts',
	'Script/inspector/file-script-page.ts',
	'Script/inspector/file-skill-page.ts',
	'Script/inspector/file-state-page.ts',
	'Script/inspector/file-tileset-page.ts',
	'Script/inspector/file-trigger-page.ts',
	'Script/inspector/file-ui-page.ts',
	'Script/inspector/file-video-page.ts',
	'Script/inspector/inspector.ts',
	'Script/inspector/particle-layer-page.ts',
	'Script/inspector/scene-actor-page.ts',
	'Script/inspector/scene-animation-page.ts',
	'Script/inspector/scene-light-page.ts',
	'Script/inspector/scene-parallax-page.ts',
	'Script/inspector/scene-particle-page.ts',
	'Script/inspector/scene-region-page.ts',
	'Script/inspector/scene-tilemap-page.ts',
	'Script/layout/layout.ts',
	'Script/local/export-language-window.ts',
	'Script/local/import-language-window.ts',
	'Script/local/local-object.ts',
	'Script/local/local-window.ts',
	'Script/log/log-window.ts',
	'Script/log/related-references.ts',
	'Script/log/update-log-window.ts',
	'Script/main/close.ts',
	'Script/main/config.ts',
	'Script/main/editor.ts',
	'Script/main/hotkey.ts',
	'Script/main/initialize.ts',
	'Script/main/main.ts',
	'Script/main/module-init.js',
	'Script/main/open.ts',
	'Script/main/path.ts',
	'Script/main/project.ts',
	'Script/main/version.ts',
	'Script/module/apkbuilder.ts',
	'Script/module/browserSearchHistory.ts',
	'Script/module/command/activateScene.ts',
	'Script/module/command/addAnimationComponent.ts',
	'Script/module/command/appendTarget.ts',
	'Script/module/command/block.ts',
	'Script/module/command/break.ts',
	'Script/module/command/callEvent.ts',
	'Script/module/command/castSkill.ts',
	'Script/module/command/changeActorAnimation.ts',
	'Script/module/command/changeActorEquipment.ts',
	'Script/module/command/changeActorMotion.ts',
	'Script/module/command/changeActorPortrait.ts',
	'Script/module/command/changeActorSkill.ts',
	'Script/module/command/changeActorSprite.ts',
	'Script/module/command/changeActorState.ts',
	'Script/module/command/changeActorTeam.ts',
	'Script/module/command/changePassableTerrain.ts',
	'Script/module/command/changeThreat.ts',
	'Script/module/command/clampCamera.ts',
	'Script/module/command/commandLine.ts',
	'Script/module/command/comment.ts',
	'Script/module/command/continue.ts',
	'Script/module/command/continueGame.ts',
	'Script/module/command/controlButton.ts',
	'Script/module/command/controlDialog.ts',
	'Script/module/command/createActor.ts',
	'Script/module/command/createElement.ts',
	'Script/module/command/createGlobalActor.ts',
	'Script/module/command/createObject.ts',
	'Script/module/command/createTrigger.ts',
	'Script/module/command/deleteActor.ts',
	'Script/module/command/deleteElement.ts',
	'Script/module/command/deleteGlobalActor.ts',
	'Script/module/command/deleteObject.ts',
	'Script/module/command/deleteScene.ts',
	'Script/module/command/deleteTile.ts',
	'Script/module/command/deleteVariable.ts',
	'Script/module/command/detectTargets.ts',
	'Script/module/command/discardTargets.ts',
	'Script/module/command/downloadFile.ts',
	'Script/module/command/fixAngle.ts',
	'Script/module/command/followActor.ts',
	'Script/module/command/forEach.ts',
	'Script/module/command/gameData.ts',
	'Script/module/command/getActor.ts',
	'Script/module/command/getMultipleActors.ts',
	'Script/module/command/getObjectProperty.ts',
	'Script/module/command/getTarget.ts',
	'Script/module/command/httpRequest.ts',
	'Script/module/command/if.ts',
	'Script/module/command/independent.ts',
	'Script/module/command/jumpTo.ts',
	'Script/module/command/label.ts',
	'Script/module/command/loadImage.ts',
	'Script/module/command/loadScene.ts',
	'Script/module/command/loadSubscene.ts',
	'Script/module/command/loop.ts',
	'Script/module/command/moveActor.ts',
	'Script/module/command/moveCamera.ts',
	'Script/module/command/moveElement.ts',
	'Script/module/command/moveLight.ts',
	'Script/module/command/nestElement.ts',
	'Script/module/command/pauseGame.ts',
	'Script/module/command/playActorAnimation.ts',
	'Script/module/command/playAnimation.ts',
	'Script/module/command/playAudio.ts',
	'Script/module/command/preventSceneInput.ts',
	'Script/module/command/registerEvent.ts',
	'Script/module/command/relaunchApp.ts',
	'Script/module/command/removeAnimationComponent.ts',
	'Script/module/command/removeTarget.ts',
	'Script/module/command/renderOutline.ts',
	'Script/module/command/requestURL.ts',
	'Script/module/command/reset.ts',
	'Script/module/command/resetTargets.ts',
	'Script/module/command/restoreAudio.ts',
	'Script/module/command/restoreSceneInput.ts',
	'Script/module/command/return.ts',
	'Script/module/command/saveAudio.ts',
	'Script/module/command/schema.ts',
	'Script/module/command/script.ts',
	'Script/module/command/setActive.ts',
	'Script/module/command/setAmbientLight.ts',
	'Script/module/command/setAngle.ts',
	'Script/module/command/setAnimation.ts',
	'Script/module/command/setAnimationComponent.ts',
	'Script/module/command/setBoolean.ts',
	'Script/module/command/setButton.ts',
	'Script/module/command/setCooldown.ts',
	'Script/module/command/setCursor.ts',
	'Script/module/command/setDialogBox.ts',
	'Script/module/command/setElement.ts',
	'Script/module/command/setEvent.ts',
	'Script/module/command/setFocus.ts',
	'Script/module/command/setGameSpeed.ts',
	'Script/module/command/setImage.ts',
	'Script/module/command/setInventory.ts',
	'Script/module/command/setItem.ts',
	'Script/module/command/setLanguage.ts',
	'Script/module/command/setList.ts',
	'Script/module/command/setLoop.ts',
	'Script/module/command/setMovementSpeed.ts',
	'Script/module/command/setNumber.ts',
	'Script/module/command/setObject.ts',
	'Script/module/command/setObjectAnimation.ts',
	'Script/module/command/setPan.ts',
	'Script/module/command/setPartyMember.ts',
	'Script/module/command/setPlayerActor.ts',
	'Script/module/command/setPointerEventRoot.ts',
	'Script/module/command/setProgressBar.ts',
	'Script/module/command/setResolution.ts',
	'Script/module/command/setReverb.ts',
	'Script/module/command/setShortcut.ts',
	'Script/module/command/setSkill.ts',
	'Script/module/command/setState.ts',
	'Script/module/command/setString.ts',
	'Script/module/command/setTarget.ts',
	'Script/module/command/setTeamRelation.ts',
	'Script/module/command/setTerrain.ts',
	'Script/module/command/setText.ts',
	'Script/module/command/setTextBox.ts',
	'Script/module/command/setTile.ts',
	'Script/module/command/setTriggerAngle.ts',
	'Script/module/command/setTriggerDuration.ts',
	'Script/module/command/setTriggerMotion.ts',
	'Script/module/command/setTriggerSpeed.ts',
	'Script/module/command/setVideo.ts',
	'Script/module/command/setVolume.ts',
	'Script/module/command/setWeight.ts',
	'Script/module/command/setWindow.ts',
	'Script/module/command/setZoomFactor.ts',
	'Script/module/command/shakeScreen.ts',
	'Script/module/command/showChoices.ts',
	'Script/module/command/showText.ts',
	'Script/module/command/simulateKey.ts',
	'Script/module/command/stopActorAnimation.ts',
	'Script/module/command/stopAudio.ts',
	'Script/module/command/stopEvent.ts',
	'Script/module/command/switch.ts',
	'Script/module/command/switchCollisionSystem.ts',
	'Script/module/command/tintImage.ts',
	'Script/module/command/tintScreen.ts',
	'Script/module/command/transferGlobalActor.ts',
	'Script/module/command/transition.ts',
	'Script/module/command/translateActor.ts',
	'Script/module/command/unclampCamera.ts',
	'Script/module/command/unloadSubscene.ts',
	'Script/module/command/uploadFile.ts',
	'Script/module/command/useItem.ts',
	'Script/module/command/wait.ts',
	'Script/module/command/waitForVideo.ts',
	'Script/module/command/webSocketClose.ts',
	'Script/module/command/webSocketConnect.ts',
	'Script/module/command/webSocketSend.ts',
	'Script/module/editdata.ts',
	'Script/module/eslints.ts',
	'Script/module/eventbus.ts',
	'Script/module/global.ts',
	'Script/module/net.ts',
	'Script/module/resource.ts',
	'Script/module/searchstring.ts',
	'Script/module/settingconfig.ts',
	'Script/module/autoreload.ts',
	'Script/module/webserver.ts',
	'Script/palette/auto-tile.ts',
	'Script/palette/palette.ts',
	'Script/palette/tile-frame-generator.ts',
	'Script/palette/tile-frame-index.ts',
	'Script/palette/tile-node-window.ts',
	'Script/particle/particle-element.ts',
	'Script/particle/particle-emitter.ts',
	'Script/particle/particle-layer.ts',
	'Script/particle/particle-window.ts',
	'Script/plugin/plugin.ts',
	'Script/printer/printer.ts',
	'Script/scene/coordinate-point.ts',
	'Script/scene/default-object-folder.ts',
	'Script/scene/light.ts',
	'Script/scene/move-scene.ts',
	'Script/scene/parallax.ts',
	'Script/scene/scene-animate.ts',
	'Script/scene/scene-camera.ts',
	'Script/scene/scene-context.ts',
	'Script/scene/scene-create-default-animation.ts',
	'Script/scene/scene-draw.ts',
	'Script/scene/scene-edit.ts',
	'Script/scene/scene-events.ts',
	'Script/scene/scene-list.ts',
	'Script/scene/scene-map-record.ts',
	'Script/scene/scene-marquee.ts',
	'Script/scene/scene-selection.ts',
	'Script/scene/scene-target.ts',
	'Script/scene/scene-utility.ts',
	'Script/scene/scene-window.ts',
	'Script/scene/texture-set.ts',
	'Script/scene/tilemap-shortcut-list.ts',
	'Script/sprite/sprite.ts',
	'Script/title/deploy-project-window.ts',
	'Script/title/home-page.ts',
	'Script/title/menu-bar.ts',
	'Script/title/new-project-window.ts',
	'Script/title/title-bar.ts',
	'Script/tools/array-window.ts',
	'Script/tools/color-picker-window.ts',
	'Script/tools/condition-list.ts',
	'Script/tools/event-list.ts',
	'Script/tools/history.ts',
	'Script/tools/image-crop-window.ts',
	'Script/tools/localization.ts',
	'Script/tools/pointer-object.ts',
	'Script/tools/preset-element-window.ts',
	'Script/tools/property-list.ts',
	'Script/tools/rename-window.ts',
	'Script/tools/scene-preset-window.ts',
	'Script/tools/script-list.ts',
	'Script/tools/set-key-window.ts',
	'Script/tools/set-number-window.ts',
	'Script/tools/shortcut-registry.ts',
	'Script/tools/text-capture.ts',
	'Script/tools/undo-manager.ts',
	'Script/tools/window-object.ts',
	'Script/tools/zoom-window.ts',
	'Script/ui/animation-element.ts',
	'Script/ui/button-element.ts',
	'Script/ui/container-element.ts',
	'Script/ui/dialog-element.ts',
	'Script/ui/element-base.ts',
	'Script/ui/element-instance-list.ts',
	'Script/ui/image-element.ts',
	'Script/ui/progress-bar-element.ts',
	'Script/ui/reference-element.ts',
	'Script/ui/root-element.ts',
	'Script/ui/text-box-element.ts',
	'Script/ui/text-element.ts',
	'Script/ui/ui-window.ts',
	'Script/ui/video-element.ts',
	'Script/ui/window-element.ts',
	'Script/update/actors.ts',
	'Script/update/animations.ts',
	'Script/update/backup.ts',
	'Script/update/config.ts',
	'Script/update/elements.ts',
	'Script/update/equipments.ts',
	'Script/update/events.ts',
	'Script/update/incremental.ts',
	'Script/update/items.ts',
	'Script/update/localization.ts',
	'Script/update/particles.ts',
	'Script/update/project.ts',
	'Script/update/scenes.ts',
	'Script/update/skills.ts',
	'Script/update/states.ts',
	'Script/update/teams.ts',
	'Script/update/tilesets.ts',
	'Script/update/to-latest.ts',
	'Script/update/triggers.ts',
	'Script/update/updater.ts',
	'Script/update/version-warning.ts',
	'Script/util/color-utils.ts',
	'Script/util/config.ts',
	'Script/util/dom.ts',
	'Script/util/event-accessors.ts',
	'Script/util/safe.ts',
	'Script/util/stage-color.ts',
	'Script/util/timer.ts',
	'Script/variable/data.ts',
	'Script/variable/history.ts',
	'Script/variable/id.ts',
	'Script/variable/initialize.ts',
	'Script/variable/keyboard-events.ts',
	'Script/variable/list-events.ts',
	'Script/variable/list-methods.ts',
	'Script/variable/open.ts',
	'Script/variable/panel.ts',
	'Script/variable/variable.ts',
	'Script/variable/window-events.ts',
	'Script/webgl/base-texture.ts',
	'Script/webgl/batch-renderer.ts',
	'Script/webgl/image-texture.ts',
	'Script/webgl/matrix2.ts',
	'Script/webgl/texture-manager.ts',
	'Script/webgl/texture.ts',
	'Script/webgl/vector2.ts',
	'Script/webgl/webgl-init.ts',
	'Script/webgl/webgl-methods.ts'
]);

// Generate module-init.js
const imports = userScripts.map((p) => {
	const relative = path.relative(path.dirname(initOut), path.resolve(projectDir, p));
	const normalized = relative.replace(/\\/g, '/');
	return `import '${normalized.startsWith('.') ? normalized : './' + normalized}'`;
});
// monaco-editor 改由 pnpm 包载入（删 vs/ 手动源码 AMD 标签），namespace import 入口载入让包打进 bundle；
// 各调用文件顶部自行 `import * as monaco from 'monaco-editor'`（script.js/editdata.js 等），不绑 window.monaco
imports.unshift("import * as monaco from 'monaco-editor'");
fs.writeFileSync(
	initOut,
	`// Auto-generated by scripts/build-module.js\n// Imports all modules in dependency order (from head.html)\n\n${imports.join('\n')}\n`,
	'utf-8'
);
console.log(`[build-module] ✓ Generated module-init.js (${userScripts.length} imports)`);

let modifiedCount = 0;
let exportCount = 0;
let requireFixCount = 0;

for (const relPath of userScripts) {
	const fullPath = path.resolve(projectDir, relPath);
	if (!fs.existsSync(fullPath)) {
		console.warn(`[build-module] ⚠ File not found: ${fullPath}`);
		continue;
	}

	if (realEsmExclude.has(relPath)) {
		console.log(`[build-module] ⊘ skipped (real ESM) → ${relPath}`);
		continue;
	}

	let content = fs.readFileSync(fullPath, 'utf-8');
	const hadExports = /^\s*export\s+(const|var|let|function|class|default)/m.test(content);

	// --- Step 1: add exports + window bindings (if not already done) ---
	let lines = content.split('\n');
	const names = hadExports ? [] : scanTopDeclNames(lines);
	let changed = false;

	if (names.length > 0) {
		for (const { lineIdx, pattern, replacement } of names) {
			lines[lineIdx] = lines[lineIdx].replace(pattern, replacement);
		}
		lines.push('');
		for (const { name } of names) {
			lines.push(`window.${name} = ${name}`);
		}
		changed = true;
		exportCount += names.length;
	}

	// --- Step 2: add bare require() support for modules ---
	if (
		usesBareRequire(content) &&
		!content.includes('__nodeRequire') &&
		!content.includes('const require =')
	) {
		const requireLine = 'const require = window.__nodeRequire || window.require';
		// Insert right after 'use strict' (or at top if no strict mode)
		let insertAt = 0;
		for (let i = 0; i < lines.length; i++) {
			const t = lines[i].trim();
			if (t === "'use strict'" || t === '"use strict"') {
				insertAt = i + 1;
				break;
			}
		}
		lines.splice(insertAt, 0, requireLine);
		changed = true;
		requireFixCount++;
	}

	if (changed) {
		content = lines.join('\n');
		fs.writeFileSync(fullPath, content, 'utf-8');
		modifiedCount++;
		const msg = [];
		if (names.length) msg.push(`${names.length} export(s)`);
		if (requireFixCount > 0 && changed && content.includes('__nodeRequire'))
			msg.push('require fix');
		console.log(`[build-module] ✓ ${msg.join(' + ')} → ${relPath}`);
	}
}

console.log(
	`[build-module] ✓ Done. Modified ${modifiedCount} files, added ${exportCount} exports, fixed ${requireFixCount} require() calls.`
);

function usesBareRequire(content) {
	return /\brequire\s*\(/.test(content);
}

function scanTopDeclNames(lines) {
	const results = [];
	let braceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		const depthBefore = braceDepth;
		for (const ch of line) {
			if (ch === '{') braceDepth++;
			else if (ch === '}') braceDepth--;
		}

		if (depthBefore !== 0) continue;

		if (
			trimmed.startsWith('//') ||
			trimmed.startsWith('/*') ||
			trimmed.startsWith('*') ||
			trimmed === '' ||
			trimmed.startsWith('}')
		)
			continue;

		const varMatchEq = trimmed.match(/^(const|let|var)\s+([\w$]+)\s*=\s*/);
		if (varMatchEq && !trimmed.match(/^(const|let|var)\s*\{/) && varMatchEq[2] !== 'require') {
			const escName = varMatchEq[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			results.push({
				lineIdx: i,
				name: varMatchEq[2],
				pattern: new RegExp(`^(${varMatchEq[1]})\\s+${escName}\\s*=\\s*`),
				replacement: `export ${varMatchEq[1]} ${varMatchEq[2]} = `
			});
			continue;
		}

		const varMatchNoEq = trimmed.match(/^(const|let|var)\s+([\w$]+)\s*(;|\/\/.*)?$/);
		if (
			varMatchNoEq &&
			!trimmed.match(/^(const|let|var)\s*\{/) &&
			varMatchNoEq[2] !== 'require'
		) {
			const escName = varMatchNoEq[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			results.push({
				lineIdx: i,
				name: varMatchNoEq[2],
				pattern: new RegExp(`^(${varMatchNoEq[1]})\\s+${escName}\\s*(;|//.*)?$`),
				replacement: `export ${varMatchNoEq[1]} ${varMatchNoEq[2]}`
			});
			continue;
		}

		const funcMatch = trimmed.match(/^function\s+([\w$]+)\s*\(/);
		if (funcMatch) {
			results.push({
				lineIdx: i,
				name: funcMatch[1],
				pattern: /^function\s+/,
				replacement: 'export function '
			});
			continue;
		}

		const classMatch = trimmed.match(/^class\s+([\w$]+)/);
		if (classMatch) {
			results.push({
				lineIdx: i,
				name: classMatch[1],
				pattern: /^class\s+/,
				replacement: 'export class '
			});
		}
	}

	return results;
}
