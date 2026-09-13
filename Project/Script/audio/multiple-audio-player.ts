import { File } from '@/file/file-system-core.ts';
import { AudioManager } from './audio-manager.ts';

// HTMLAudioElement 运行时挂载的扩展字段（getAudio 内赋值）
interface MultipleAudioElement extends HTMLAudioElement {
	onStop: () => void;
	source: MediaElementAudioSourceNode;
	guid: string;
}

export class MultipleAudioPlayer {
	audioPool: MultipleAudioElement[];
	audios: MultipleAudioElement[];

	constructor() {
		this.audioPool = [];
		this.audios = [];
	}

	getAudio(): MultipleAudioElement {
		let audio = this.audioPool.pop();
		if (audio === undefined) {
			audio = new Audio() as unknown as MultipleAudioElement;
			const source = AudioManager.context.createMediaElementSource(audio);
			const onStop = () => {
				if (this.audios.remove(audio)) {
					this.audioPool.push(audio);
					source.disconnect(AudioManager.context.destination);
				}
			};
			audio.onStop = onStop;
			audio.autoplay = true;
			audio.source = source;
			audio.on('ended', onStop);
			audio.on('error', onStop);
		}
		this.audios.push(audio);
		audio.source.connect(AudioManager.context.destination);
		return audio;
	}

	getRecentlyAudio(guid: string): MultipleAudioElement | undefined {
		for (const audio of this.audios) {
			if (audio.guid === guid && audio.currentTime < 0.05) {
				return audio;
			}
		}
		return undefined;
	}

	/** 播放音效 */
	play(guid: string, volume: number = 1): MultipleAudioElement | undefined {
		if (guid) {
			const path = File.getPath(guid);
			if (!path) return undefined;
			const audio = this.getRecentlyAudio(guid);
			if (audio) {
				audio.volume = Math.clamp(volume, 0, 1);
				return audio;
			} else {
				const audio = this.getAudio();
				audio.guid = guid;
				audio.src = File.route(path);
				audio.volume = Math.clamp(volume, 0, 1);
				return audio;
			}
		}
	}

	/** 停止播放 */
	stop() {
		const { audios } = this;
		let i = audios.length;
		while (--i >= 0) {
			audios[i].src = '';
			audios[i].onStop();
		}
	}
}
