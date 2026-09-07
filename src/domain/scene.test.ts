import { describe, expect, it } from 'vitest';
import { polygonAreaM2 } from './geometry';
import { emptyScene, makeRoomL, makeRoomT, makeRoomU, normalizeScene } from './scene';

describe('normalizeScene migration', () => {
	it('back-fills all v3 arrays and settings on a bare object', () => {
		const s = normalizeScene({ walls: [] }, 'X');
		expect(s.surfaces).toEqual([]);
		expect(s.zones).toEqual([]);
		expect(s.styleboards).toEqual([]);
		expect(s.settings.showDemolition).toBe(false);
		expect(s.settings.colorByCircuit).toBe(false);
		expect(s.settings.wallHeight).toBe(270);
	});

	it('migrates legacy heatZones → zones', () => {
		const s = normalizeScene(
			{
				heatZones: [
					{ id: 'z1', points: [{ x: 0, y: 0 }], mode: 'water' },
					{ id: 'z2', points: [{ x: 0, y: 0 }], mode: 'cable' },
				],
			},
			'X',
		);
		expect(s.zones).toHaveLength(2);
		expect(s.zones[0].kind).toBe('heat-water');
		expect(s.zones[1].kind).toBe('heat-cable');
	});

	it('adds status:existing to legacy walls/openings', () => {
		const s = normalizeScene(
			{
				walls: [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, thickness: 10, material: 'brick' }],
				openings: [{ id: 'o', wallId: 'w', offset: 50, width: 80, type: 'door', flip: false }],
			},
			'X',
		);
		expect(s.walls[0].status).toBe('existing');
		expect(s.walls[0].material).toBe('brick');
		expect(s.walls[0].loadBearing).toBe(false);
		expect(s.openings[0].status).toBe('existing');
	});

	it('defaults doorKind swing and keeps an explicit one', () => {
		const s = normalizeScene(
			{
				openings: [
					{ id: 'a', wallId: 'w', offset: 50, width: 80, type: 'door', flip: false },
					{ id: 'b', wallId: 'w', offset: 150, width: 140, type: 'door', flip: true, doorKind: 'double', hingeRight: true },
				],
			},
			'X',
		);
		expect(s.openings[0].doorKind).toBe('swing');
		expect(s.openings[0].hingeRight).toBe(false);
		expect(s.openings[1].doorKind).toBe('double');
		expect(s.openings[1].hingeRight).toBe(true);
	});

	it('keeps a wall loadBearing flag through normalization', () => {
		const s = normalizeScene(
			{ walls: [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, thickness: 10, material: 'brick', loadBearing: true }] },
			'X',
		);
		expect(s.walls[0].loadBearing).toBe(true);
	});

	it('normalized empty scene is stable', () => {
		expect(normalizeScene(emptyScene('A'), 'A')).toEqual(emptyScene('A'));
	});
});

describe('room presets', () => {
	it('L-room polygon has 6 vertices and correct area', () => {
		const { room, walls } = makeRoomL(0, 0, 500, 400, 180, 10);
		expect(room.points).toHaveLength(6);
		expect(walls).toHaveLength(6);
		// 5×4 - 1.8×1.8 = 20 - 3.24 = 16.76 m²
		expect(polygonAreaM2(room.points)).toBeCloseTo(16.76, 1);
	});

	it('U-room polygon has 8 vertices', () => {
		const { room } = makeRoomU(0, 0, 520, 420, 200, 180, 10);
		expect(room.points).toHaveLength(8);
	});

	it('T-room polygon has 8 vertices', () => {
		const { room } = makeRoomT(0, 0, 520, 420, 220, 180, 10);
		expect(room.points).toHaveLength(8);
	});
});
