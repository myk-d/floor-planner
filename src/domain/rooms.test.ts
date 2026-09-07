import { describe, expect, it } from 'vitest';
import { polygonAreaM2 } from './geometry';
import { detectRooms, reconcileRooms } from './rooms';
import { makeRoomRect, type Room, type Wall } from './scene';

function rect(x0: number, y0: number, x1: number, y1: number): Wall[] {
	return makeRoomRect(x0, y0, x1, y1, 10).walls;
}

describe('detectRooms', () => {
	it('single rectangular room', () => {
		const polys = detectRooms(rect(0, 0, 400, 300));
		expect(polys).toHaveLength(1);
		expect(polygonAreaM2(polys[0])).toBeCloseTo(12, 1);
	});

	it('two adjacent rooms sharing a wall', () => {
		const walls = [...rect(0, 0, 400, 300), ...rect(400, 0, 700, 300)];
		const polys = detectRooms(walls);
		expect(polys).toHaveLength(2);
		const areas = polys.map((p) => polygonAreaM2(p)).sort((a, b) => a - b);
		expect(areas[0]).toBeCloseTo(9, 1);
		expect(areas[1]).toBeCloseTo(12, 1);
	});

	it('L-shaped apartment = two rooms', () => {
		const walls = [...rect(0, 0, 300, 500), ...rect(300, 0, 600, 250)];
		const polys = detectRooms(walls);
		expect(polys.length).toBeGreaterThanOrEqual(2);
	});

	it('T-junction: room split off a longer wall', () => {
		// велика кімната 0..600 × 0..400, всередині перегородка з x=300 зверху вниз
		const walls: Wall[] = [
			{ id: 'n', a: { x: 0, y: 0 }, b: { x: 600, y: 0 }, thickness: 10, material: 'block' },
			{ id: 'e', a: { x: 600, y: 0 }, b: { x: 600, y: 400 }, thickness: 10, material: 'block' },
			{ id: 's', a: { x: 600, y: 400 }, b: { x: 0, y: 400 }, thickness: 10, material: 'block' },
			{ id: 'w', a: { x: 0, y: 400 }, b: { x: 0, y: 0 }, thickness: 10, material: 'block' },
			{ id: 'mid', a: { x: 300, y: 0 }, b: { x: 300, y: 400 }, thickness: 10, material: 'block' },
		];
		const polys = detectRooms(walls);
		expect(polys).toHaveLength(2);
		polys.forEach((p) => expect(polygonAreaM2(p)).toBeCloseTo(12, 1));
	});

	it('open contour yields no rooms', () => {
		const walls: Wall[] = [
			{ id: 'a', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'block' },
			{ id: 'b', a: { x: 400, y: 0 }, b: { x: 400, y: 300 }, thickness: 10, material: 'block' },
			{ id: 'c', a: { x: 400, y: 300 }, b: { x: 0, y: 300 }, thickness: 10, material: 'block' },
		];
		expect(detectRooms(walls)).toHaveLength(0);
	});
});

describe('reconcileRooms', () => {
	it('keeps name of a matched room and adds new ones', () => {
		const old: Room[] = [
			{ id: 'r1', name: 'Спальня', points: [
				{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 },
			], floor: { kind: 'parquet', color: '#c9a27a' } },
		];
		const walls = [...makeRoomRect(0, 0, 400, 300, 10).walls, ...makeRoomRect(400, 0, 700, 300, 10).walls];
		const polys = detectRooms(walls);
		const rooms = reconcileRooms(old, polys);
		expect(rooms).toHaveLength(2);
		const bedroom = rooms.find((r) => r.name === 'Спальня');
		expect(bedroom).toBeTruthy();
		expect(bedroom!.floor.kind).toBe('parquet');
	});
});
