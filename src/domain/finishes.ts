import { pointToSegment, polygonAreaCm2, polygonPerimeterCm } from './geometry';
import type { CeilingFinish, Opening, Room, Scene, WallFinish } from './scene';

export const WALL_FINISHES: { v: WallFinish; l: string }[] = [
	{ v: 'none', l: '—' },
	{ v: 'paint', l: 'Фарба' },
	{ v: 'wallpaper', l: 'Шпалери' },
	{ v: 'plaster', l: 'Декоративна штукатурка' },
	{ v: 'tile', l: 'Плитка' },
	{ v: 'panel', l: 'Панелі' },
];

export const CEILING_FINISHES: { v: CeilingFinish; l: string }[] = [
	{ v: 'none', l: '—' },
	{ v: 'paint', l: 'Фарба' },
	{ v: 'stretch', l: 'Натяжна' },
	{ v: 'plasterboard', l: 'Гіпсокартон' },
	{ v: 'whitewash', l: 'Побілка' },
];

export const wallFinishLabel = (v: WallFinish | undefined): string => WALL_FINISHES.find((f) => f.v === (v ?? 'none'))!.l;
export const ceilingFinishLabel = (v: CeilingFinish | undefined): string => CEILING_FINISHES.find((f) => f.v === (v ?? 'none'))!.l;

/** Висота отвору по фасаду, см (для вирахування з площі стін). */
export function openingFaceHeight(o: Opening, wallHeightCm: number): number {
	if (o.type === 'opening') return Math.max(0, (o.head ?? wallHeightCm) - (o.sill ?? 0));
	if (o.type === 'window') return Math.max(0, (o.head ?? 230) - (o.sill ?? 90));
	return Math.max(0, (o.head ?? 210) - (o.sill ?? 0)); // двері
}

export interface RoomSurfaceAreas {
	floorM2: number;
	ceilingM2: number;
	perimeterM: number;
	heightM: number;
	wallGrossM2: number;
	openingsM2: number;
	wallNetM2: number;
}

/** Площі поверхонь приміщення для оздоблення: підлога, стеля, стіни (з вирахуванням отворів). */
export function roomSurfaceAreas(scene: Scene, room: Room): RoomSurfaceAreas {
	const floorM2 = polygonAreaCm2(room.points) / 10000;
	const perimCm = polygonPerimeterCm(room.points);
	const heightCm = room.ceilingHeight ?? scene.settings.wallHeight;
	const wallGrossM2 = (perimCm * heightCm) / 10000;

	// отвори на стінах, що межують з полігоном кімнати
	let openingsCm2 = 0;
	for (const o of scene.openings) {
		const wall = scene.walls.find((w) => w.id === o.wallId);
		if (!wall) continue;
		const mid = { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 };
		if (!nearPolygonEdge(mid, room.points, wall.thickness / 2 + 10)) continue;
		openingsCm2 += o.width * openingFaceHeight(o, heightCm);
	}
	const openingsM2 = openingsCm2 / 10000;

	return {
		floorM2: round2(floorM2),
		ceilingM2: round2(floorM2),
		perimeterM: round2(perimCm / 100),
		heightM: round2(heightCm / 100),
		wallGrossM2: round2(wallGrossM2),
		openingsM2: round2(openingsM2),
		wallNetM2: round2(Math.max(0, wallGrossM2 - openingsM2)),
	};
}

function nearPolygonEdge(p: { x: number; y: number }, poly: { x: number; y: number }[], tolCm: number): boolean {
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		if (pointToSegment(p, a, b).distance <= tolCm) return true;
	}
	return false;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
