import { describe, expect, it } from 'vitest';
import { roomLabels, totalAreaM2, wallDimensions } from './dimensions';
import { emptyScene, makeRoomRect, type Scene } from './scene';

function roomScene(): Scene {
	const { walls, room } = makeRoomRect(0, 0, 400, 300, 10, 'Спальня');
	return { ...emptyScene(), walls, rooms: [room] };
}

describe('wallDimensions', () => {
	it('one segment per wall with a length label', () => {
		const dims = wallDimensions(roomScene(), 'm');
		expect(dims).toHaveLength(4);
		const labels = dims.map((d) => d.label).sort();
		expect(labels).toEqual(['3', '3', '4', '4']);
	});

	it('keeps label text upright (angle within ±90°)', () => {
		const dims = wallDimensions(roomScene(), 'm');
		for (const d of dims) {
			expect(Math.abs(d.angleDeg)).toBeLessThanOrEqual(90.001);
		}
	});
});

describe('roomLabels / totalAreaM2', () => {
	it('computes area and name', () => {
		const labels = roomLabels(roomScene());
		expect(labels).toHaveLength(1);
		expect(labels[0].name).toBe('Спальня');
		expect(labels[0].areaM2).toBeCloseTo(12);
		expect(labels[0].areaText).toBe('12 м²');
	});

	it('total area sums all rooms', () => {
		const s = roomScene();
		s.rooms.push(makeRoomRect(500, 0, 700, 200, 10, 'Ванна').room);
		expect(totalAreaM2(s)).toBeCloseTo(16);
	});
});
