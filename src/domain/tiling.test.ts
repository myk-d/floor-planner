import { describe, expect, it } from 'vitest';
import { emptyScene, type Room, type TileSpec } from './scene';
import { patternWaste, tileCount, tilingSchedule } from './tiling';

const grid: TileSpec = { w: 30, h: 30, grout: 0, pattern: 'grid', wastePct: 10, perBox: 0 };

function rectRoom(): Room {
	return {
		id: 'r',
		name: 'Санвузол',
		points: [
			{ x: 0, y: 0 },
			{ x: 400, y: 0 },
			{ x: 400, y: 300 },
			{ x: 0, y: 300 },
		],
		floor: { kind: 'none', color: '#fff' },
	};
}

describe('tileCount', () => {
	it('30×30 with no grout: ~11.1 tiles/m², +10 % waste', () => {
		const e = tileCount(12, grid);
		expect(e.tileAreaM2).toBeCloseTo(0.09);
		expect(e.baseCount).toBeCloseTo(133.3, 1); // 12 / 0.09
		expect(e.withWaste).toBe(Math.ceil(133.333 * 1.1)); // 147
		expect(e.boxes).toBe(0);
	});

	it('grout widens the cell, lowering the count', () => {
		const withGrout = tileCount(12, { ...grid, grout: 20 }); // 2 cm joint → 32×32 cell
		expect(withGrout.tileAreaM2).toBeCloseTo(0.1024);
		expect(withGrout.baseCount).toBeLessThan(tileCount(12, grid).baseCount);
	});

	it('pattern adds waste: diagonal +15, brick +5', () => {
		expect(patternWaste('grid')).toBe(0);
		expect(tileCount(10, { ...grid, pattern: 'diagonal' }).wastePct).toBe(25);
		expect(tileCount(10, { ...grid, pattern: 'brick' }).wastePct).toBe(15);
	});

	it('perBox → boxes rounded up', () => {
		const e = tileCount(12, { ...grid, perBox: 10 });
		expect(e.boxes).toBe(Math.ceil(e.withWaste / 10));
	});

	it('zero / negative area yields nothing', () => {
		expect(tileCount(0, grid).withWaste).toBe(0);
		expect(tileCount(-5, grid).withWaste).toBe(0);
	});
});

describe('tilingSchedule', () => {
	it('includes only rooms with tile on floor or walls and sums with waste', () => {
		const s = emptyScene();
		s.settings.tile = { ...grid, perBox: 10 };
		s.rooms.push(
			{ ...rectRoom(), id: 'a', name: 'Санвузол', floor: { kind: 'tile', color: '#fff' }, wallFinish: 'tile' },
			{ ...rectRoom(), id: 'b', name: 'Спальня', floor: { kind: 'laminate', color: '#fff' } },
		);
		const sch = tilingSchedule(s);
		expect(sch.rooms).toHaveLength(1);
		expect(sch.rooms[0].floor).toBeDefined();
		expect(sch.rooms[0].walls).toBeDefined();
		expect(sch.floorAreaM2).toBeCloseTo(12);
		expect(sch.wallAreaM2).toBeCloseTo(37.8);
		expect(sch.floorTiles).toBe(sch.rooms[0].floor!.withWaste);
		expect(sch.boxes).toBe(sch.rooms[0].floor!.boxes + sch.rooms[0].walls!.boxes);
	});

	it('empty when no tile anywhere', () => {
		const s = emptyScene();
		s.rooms.push(rectRoom());
		expect(tilingSchedule(s).rooms).toHaveLength(0);
		expect(tilingSchedule(s).boxes).toBe(0);
	});
});
