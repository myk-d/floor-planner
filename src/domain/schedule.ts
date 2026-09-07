import { polygonAreaM2 } from './geometry';
import type { Scene } from './scene';
import { catalogByKind } from '../constants/catalog';

export interface FurnitureRow {
	kind: string;
	label: string;
	count: number;
	w: number;
	d: number;
}

/** Легенда меблів: згруповано за (kind + розмір), з підрахунком. */
export function furnitureSchedule(scene: Scene): FurnitureRow[] {
	const map = new Map<string, FurnitureRow>();
	for (const f of scene.furniture) {
		const key = `${f.kind}|${f.w}x${f.d}`;
		const existing = map.get(key);
		if (existing) existing.count++;
		else
			map.set(key, {
				kind: f.kind,
				label: f.label || catalogByKind[f.kind]?.label || f.kind,
				count: 1,
				w: f.w,
				d: f.d,
			});
	}
	return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'uk'));
}

export interface RoomRow {
	name: string;
	areaM2: number;
}

export function roomSchedule(scene: Scene): { rows: RoomRow[]; totalM2: number } {
	const rows = scene.rooms
		.filter((r) => r.points.length >= 3)
		.map((r) => ({ name: r.name, areaM2: Math.round(polygonAreaM2(r.points) * 100) / 100 }))
		.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
	const totalM2 = Math.round(rows.reduce((s, r) => s + r.areaM2, 0) * 100) / 100;
	return { rows, totalM2 };
}
