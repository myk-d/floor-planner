import { describe, expect, it } from 'vitest';
import { emptyScene, makeRoomRect, newId } from '../domain/scene';
import { fitViewToBBox, selectionPoints } from './usePlannerStore';

describe('fitViewToBBox', () => {
	it('centres and scales a bbox into the stage with padding', () => {
		const v = fitViewToBBox({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 1000, 1000, 100, 20);
		expect(v).not.toBeNull();
		// 100cm into 800px usable → scale 8, centred → offset 100
		expect(v!.scale).toBeCloseTo(8);
		expect(v!.offsetX).toBeCloseTo(100);
		expect(v!.offsetY).toBeCloseTo(100);
	});

	it('returns null for an empty (infinite) bbox', () => {
		expect(fitViewToBBox({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }, 800, 600)).toBeNull();
	});

	it('clamps scale to maxScale', () => {
		const v = fitViewToBBox({ minX: 0, minY: 0, maxX: 1, maxY: 1 }, 1000, 1000, 0, 4);
		expect(v!.scale).toBe(4);
	});
});

describe('selectionPoints', () => {
	it('returns wall endpoints', () => {
		const s = emptyScene('t');
		s.walls.push({ id: 'w1', a: { x: 10, y: 20 }, b: { x: 300, y: 20 }, thickness: 10, material: 'brick', status: 'existing' });
		expect(selectionPoints(s, { id: 'w1', type: 'wall' })).toEqual([
			{ x: 10, y: 20 },
			{ x: 300, y: 20 },
		]);
	});

	it('returns rotated furniture corners', () => {
		const s = emptyScene('t');
		s.furniture.push({ id: 'f1', kind: 'sofa', x: 100, y: 100, rotation: 0, w: 40, d: 20, label: '', color: '#fff' });
		const pts = selectionPoints(s, { id: 'f1', type: 'furniture' });
		expect(pts).toHaveLength(4);
		expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(80);
		expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(120);
	});

	it('returns room polygon points', () => {
		const { room } = makeRoomRect(0, 0, 200, 300, 10, 'K', 'brick');
		room.id = 'r1';
		const s = emptyScene('t');
		s.rooms.push(room);
		expect(selectionPoints(s, { id: 'r1', type: 'room' }).length).toBeGreaterThan(0);
	});

	it('is empty for an unknown id', () => {
		expect(selectionPoints(emptyScene('t'), { id: newId(), type: 'wall' })).toEqual([]);
	});
});
