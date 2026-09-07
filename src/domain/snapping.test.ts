import { describe, expect, it } from 'vitest';
import { emptyScene, type Scene } from './scene';
import { snapToGrid, snapToVertices, snapWallAngle } from './snapping';

describe('snapToGrid', () => {
	it('rounds to nearest grid step', () => {
		expect(snapToGrid({ x: 12, y: 27 }, 10)).toEqual({ x: 10, y: 30 });
	});
	it('grid 0 is a no-op', () => {
		expect(snapToGrid({ x: 12.3, y: 27.8 }, 0)).toEqual({ x: 12.3, y: 27.8 });
	});
});

describe('snapToVertices', () => {
	const scene: Scene = {
		...emptyScene(),
		walls: [{ id: 'w1', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'block' }],
	};

	it('snaps to a wall endpoint within tolerance', () => {
		const r = snapToVertices({ x: 395, y: 3 }, scene, 20);
		expect(r.snapped).toBe(true);
		expect(r.point).toEqual({ x: 400, y: 0 });
	});

	it('leaves the point alone when far', () => {
		const r = snapToVertices({ x: 200, y: 200 }, scene, 20);
		expect(r.snapped).toBe(false);
		expect(r.point).toEqual({ x: 200, y: 200 });
	});
});

describe('snapWallAngle', () => {
	it('snaps a near-horizontal segment to exactly horizontal, keeping length', () => {
		const b = snapWallAngle({ x: 0, y: 0 }, { x: 300, y: 12 }, 15);
		expect(b.x).toBeCloseTo(Math.hypot(300, 12));
		expect(b.y).toBeCloseTo(0);
	});
});
