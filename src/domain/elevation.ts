import { distance, normalize, pointInPolygon, pointToSegment, sub } from './geometry';
import type { Scene, Vec } from './scene';

/** Висота стелі в точці `p`: максимум серед кімнат, що її містять; інакше — глобальна `wallHeight`. */
export function wallHeightAt(scene: Scene, p: Vec): number {
	let h = 0;
	for (const r of scene.rooms) {
		if (r.points.length >= 3 && pointInPolygon(p, r.points)) h = Math.max(h, r.ceilingHeight ?? scene.settings.wallHeight);
	}
	return h || scene.settings.wallHeight;
}

export interface ElevationOpening {
	x: number; // від лівого краю стіни, см
	width: number;
	sill: number;
	head: number;
	type: 'door' | 'window' | 'opening';
}

export interface ElevationFurniture {
	x: number; // центр від лівого краю, см
	w: number;
	h: number;
	label: string;
}

export interface WallElevation {
	length: number;
	height: number;
	openings: ElevationOpening[];
	furniture: ElevationFurniture[];
}

const DEFAULT_H: Record<string, number> = {
	'bed-double': 55,
	'bed-single': 55,
	'bed-queen': 55,
	'bed-king': 55,
	sofa: 85,
	'sofa-2': 85,
	'sofa-3': 85,
	armchair: 90,
	wardrobe: 230,
	'wardrobe-3': 230,
	fridge: 185,
	'kitchen-cabinet': 85,
	'kitchen-counter': 90,
	'dining-table': 75,
	desk: 75,
	'tv-stand': 45,
	toilet: 75,
	bathtub: 55,
	sink: 85,
	radiator: 55,
};

/** Приблизна висота меблів за kind. */
export function furnitureHeight(kind: string, fallback?: number): number {
	return fallback ?? DEFAULT_H[kind] ?? 80;
}

/**
 * Розгортка стіни: проєктує отвори й прилеглі меблі на площину стіни.
 */
export function wallElevation(scene: Scene, wallId: string): WallElevation | null {
	const wall = scene.walls.find((w) => w.id === wallId);
	if (!wall) return null;
	const length = distance(wall.a, wall.b);
	const dir = normalize(sub(wall.b, wall.a));
	const height = wallHeightAt(scene, { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 });

	const openings: ElevationOpening[] = scene.openings
		.filter((o) => o.wallId === wallId)
		.map((o) => ({
			x: o.offset - o.width / 2,
			width: o.width,
			sill: o.sill ?? (o.type === 'window' ? 90 : 0),
			head: o.head ?? (o.type === 'window' ? 230 : 210),
			type: o.type,
		}));

	const furniture: ElevationFurniture[] = [];
	for (const f of scene.furniture) {
		const proj = pointToSegment({ x: f.x, y: f.y }, wall.a, wall.b);
		const reach = Math.max(f.w, f.d) / 2 + wall.thickness / 2 + 8;
		if (proj.distance <= reach && proj.t > -0.05 && proj.t < 1.05) {
			// проєкція центра меблів на вісь стіни
			const along = (f.x - wall.a.x) * dir.x + (f.y - wall.a.y) * dir.y;
			// фронтальна ширина: залежить від повороту меблів відносно стіни
			const wallAng = Math.atan2(dir.y, dir.x);
			const rel = ((f.rotation * Math.PI) / 180 - wallAng + Math.PI * 4) % (Math.PI / 2);
			const front = Math.abs(Math.cos(rel)) * f.w + Math.abs(Math.sin(rel)) * f.d;
			furniture.push({ x: along, w: front, h: furnitureHeight(f.kind, f.h), label: f.label });
		}
	}

	return { length, height, openings, furniture: furniture.sort((a, b) => a.x - b.x) };
}

export function projectPointToWall(scene: Scene, wallId: string, p: Vec): number {
	const wall = scene.walls.find((w) => w.id === wallId);
	if (!wall) return 0;
	const dir = normalize(sub(wall.b, wall.a));
	return (p.x - wall.a.x) * dir.x + (p.y - wall.a.y) * dir.y;
}
