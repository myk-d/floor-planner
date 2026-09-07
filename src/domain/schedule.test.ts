import { describe, expect, it } from 'vitest';
import { furnitureSchedule, roomSchedule } from './schedule';
import { emptyScene, makeRoomRect, newId, type Scene } from './scene';

function scene(): Scene {
	const s = emptyScene();
	s.rooms.push(makeRoomRect(0, 0, 400, 300, 10, 'Спальня').room);
	s.rooms.push(makeRoomRect(500, 0, 700, 200, 10, 'Ванна').room);
	s.furniture.push(
		{ id: newId(), kind: 'chair', x: 0, y: 0, rotation: 0, w: 45, d: 45, label: 'Стілець', color: '#000' },
		{ id: newId(), kind: 'chair', x: 10, y: 0, rotation: 0, w: 45, d: 45, label: 'Стілець', color: '#000' },
		{ id: newId(), kind: 'sofa', x: 100, y: 100, rotation: 0, w: 220, d: 95, label: 'Диван', color: '#000' },
	);
	return s;
}

describe('furnitureSchedule', () => {
	it('groups identical items and counts them', () => {
		const rows = furnitureSchedule(scene());
		expect(rows).toHaveLength(2);
		const chair = rows.find((r) => r.kind === 'chair')!;
		expect(chair.count).toBe(2);
	});
});

describe('roomSchedule', () => {
	it('lists rooms with area and total', () => {
		const { rows, totalM2 } = roomSchedule(scene());
		expect(rows).toHaveLength(2);
		expect(totalM2).toBeCloseTo(16, 1);
	});
});
