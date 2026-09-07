import { distance } from './geometry';
import type { Scene } from './scene';

export type PlanPhase = 'both' | 'before' | 'after';

/** Чи ховати елемент з таким `status` у поточній фазі плану (before ховає нові, after — демонтаж). */
export const hiddenInPhase = (phase: PlanPhase, status?: string): boolean =>
	(phase === 'before' && status === 'new') || (phase === 'after' && status === 'demolish');

export interface ReconfigSummary {
	wallsDemolish: { count: number; lengthM: number };
	wallsNew: { count: number; lengthM: number };
	openingsDemolish: number;
	openingsNew: number;
	/** чи є хоч одна зміна */
	any: boolean;
}

/** Зведення перепланування: що зноситься / додається (за полем `status`). */
export function reconfigSummary(scene: Scene): ReconfigSummary {
	let dl = 0;
	let nl = 0;
	let dc = 0;
	let nc = 0;
	for (const w of scene.walls) {
		if (w.status === 'demolish') {
			dc++;
			dl += distance(w.a, w.b);
		} else if (w.status === 'new') {
			nc++;
			nl += distance(w.a, w.b);
		}
	}
	const od = scene.openings.filter((o) => o.status === 'demolish').length;
	const on = scene.openings.filter((o) => o.status === 'new').length;
	const r: ReconfigSummary = {
		wallsDemolish: { count: dc, lengthM: Math.round(dl) / 100 },
		wallsNew: { count: nc, lengthM: Math.round(nl) / 100 },
		openingsDemolish: od,
		openingsNew: on,
		any: dc + nc + od + on > 0,
	};
	return r;
}
