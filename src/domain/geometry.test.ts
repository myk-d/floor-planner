import { describe, expect, it } from 'vitest';
import {
	bboxOf,
	centroid,
	distance,
	pointToSegment,
	polygonAreaM2,
	polygonPerimeterCm,
	rotatePoint,
	snapAngle,
} from './geometry';

describe('geometry', () => {
	it('distance', () => {
		expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
	});

	it('polygon area of a 300x400 cm room = 12 m²', () => {
		const rect = [
			{ x: 0, y: 0 },
			{ x: 300, y: 0 },
			{ x: 300, y: 400 },
			{ x: 0, y: 400 },
		];
		expect(polygonAreaM2(rect)).toBeCloseTo(12);
	});

	it('polygon area is orientation-independent', () => {
		const cw = [
			{ x: 0, y: 0 },
			{ x: 0, y: 200 },
			{ x: 200, y: 200 },
			{ x: 200, y: 0 },
		];
		expect(polygonAreaM2(cw)).toBeCloseTo(4);
	});

	it('perimeter', () => {
		const rect = [
			{ x: 0, y: 0 },
			{ x: 300, y: 0 },
			{ x: 300, y: 200 },
			{ x: 0, y: 200 },
		];
		expect(polygonPerimeterCm(rect)).toBe(1000);
	});

	it('centroid of a square is its center', () => {
		const sq = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 },
		];
		const c = centroid(sq);
		expect(c.x).toBeCloseTo(5);
		expect(c.y).toBeCloseTo(5);
	});

	it('pointToSegment clamps to endpoints', () => {
		const r = pointToSegment({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
		expect(r.t).toBe(0);
		expect(r.point).toEqual({ x: 0, y: 0 });
	});

	it('pointToSegment projects onto the middle', () => {
		const r = pointToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
		expect(r.point.x).toBeCloseTo(5);
		expect(r.distance).toBeCloseTo(5);
	});

	it('rotatePoint 90° around origin', () => {
		const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
		expect(p.x).toBeCloseTo(0);
		expect(p.y).toBeCloseTo(10);
	});

	it('snapAngle to 90° grid', () => {
		expect(snapAngle((80 * Math.PI) / 180, 90)).toBeCloseTo(Math.PI / 2);
		expect(snapAngle((10 * Math.PI) / 180, 90)).toBeCloseTo(0);
	});

	it('bboxOf', () => {
		expect(bboxOf([{ x: -1, y: 2 }, { x: 5, y: -3 }])).toEqual({ minX: -1, minY: -3, maxX: 5, maxY: 2 });
	});
});
