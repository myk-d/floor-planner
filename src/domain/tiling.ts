import { roomSurfaceAreas } from './finishes';
import { DEFAULT_TILE, type Room, type Scene, type TileSpec } from './scene';

export { DEFAULT_TILE } from './scene';
export type { TilePattern, TileSpec } from './scene';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface TileEstimate {
	/** площа поверхні, м² */
	areaM2: number;
	/** площа однієї плитки з половиною шва по кожному боку, м² */
	tileAreaM2: number;
	/** плиток «в тіло» (площа / площа плитки з швом), без запасу */
	baseCount: number;
	/** з урахуванням запасу, заокруглено вгору */
	withWaste: number;
	/** сумарний запас (базовий + надбавка за розкладку), % */
	wastePct: number;
	/** пачок (0, якщо `perBox` не заданий) */
	boxes: number;
}

/** Надбавка до запасу за складність розкладки: пряма 0, зі зсувом 5, по діагоналі 15 %. */
export const patternWaste = (p: TileSpec['pattern']): number => (p === 'diagonal' ? 15 : p === 'brick' ? 5 : 0);

/** Скільки плитки треба на задану площу за цими параметрами. */
export function tileCount(areaM2: number, spec: TileSpec): TileEstimate {
	const groutCm = Math.max(0, spec.grout) / 10;
	const cellAreaM2 = ((spec.w + groutCm) * (spec.h + groutCm)) / 10000;
	const baseCount = cellAreaM2 > 0 && areaM2 > 0 ? areaM2 / cellAreaM2 : 0;
	const wastePct = Math.max(0, spec.wastePct) + patternWaste(spec.pattern);
	const withWaste = Math.ceil(baseCount * (1 + wastePct / 100));
	return {
		areaM2: round2(areaM2),
		tileAreaM2: Math.round(cellAreaM2 * 10000) / 10000,
		baseCount: Math.round(baseCount * 10) / 10,
		withWaste,
		wastePct,
		boxes: spec.perBox > 0 ? Math.ceil(withWaste / spec.perBox) : 0,
	};
}

export interface RoomTiling {
	roomName: string;
	floor?: TileEstimate;
	walls?: TileEstimate;
}

/** Розкладка плитки для одного приміщення — підлога та/або стіни, якщо там плитка. */
export function roomTiling(scene: Scene, room: Room, spec: TileSpec): RoomTiling {
	const a = roomSurfaceAreas(scene, room);
	const out: RoomTiling = { roomName: room.name };
	if (room.floor.kind === 'tile') out.floor = tileCount(a.floorM2, spec);
	if (room.wallFinish === 'tile') out.walls = tileCount(a.wallNetM2, spec);
	return out;
}

export interface TilingSchedule {
	rooms: RoomTiling[];
	floorAreaM2: number;
	wallAreaM2: number;
	/** плиток з запасом, підлога / стіни */
	floorTiles: number;
	wallTiles: number;
	boxes: number;
}

/** Зведена розкладка плитки по всіх приміщеннях з плиткою. */
export function tilingSchedule(scene: Scene): TilingSchedule {
	const spec = scene.settings.tile ?? DEFAULT_TILE;
	const rooms = scene.rooms
		.filter((r) => r.points.length >= 3 && (r.floor.kind === 'tile' || r.wallFinish === 'tile'))
		.map((r) => roomTiling(scene, r, spec));

	let floorAreaM2 = 0;
	let wallAreaM2 = 0;
	let floorTiles = 0;
	let wallTiles = 0;
	let boxes = 0;
	for (const rt of rooms) {
		if (rt.floor) {
			floorAreaM2 += rt.floor.areaM2;
			floorTiles += rt.floor.withWaste;
			boxes += rt.floor.boxes;
		}
		if (rt.walls) {
			wallAreaM2 += rt.walls.areaM2;
			wallTiles += rt.walls.withWaste;
			boxes += rt.walls.boxes;
		}
	}
	return { rooms, floorAreaM2: round2(floorAreaM2), wallAreaM2: round2(wallAreaM2), floorTiles, wallTiles, boxes };
}
