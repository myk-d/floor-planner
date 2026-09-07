import { describe, expect, it } from 'vitest';
import { DEFAULT_FINISH_RATES, finishEstimate, finishSchedule, roomSurfaceAreas } from './finishes';
import { emptyScene, type Room } from './scene';

function rectRoom(): Room {
	return {
		id: 'r',
		name: 'K',
		points: [
			{ x: 0, y: 0 },
			{ x: 400, y: 0 },
			{ x: 400, y: 300 },
			{ x: 0, y: 300 },
		],
		floor: { kind: 'none', color: '#fff' },
	};
}

describe('roomSurfaceAreas', () => {
	it('floor / ceiling / perimeter / gross walls for a bare 4×3 m room', () => {
		const s = emptyScene();
		const room = rectRoom();
		s.rooms.push(room);
		const a = roomSurfaceAreas(s, room);
		expect(a.floorM2).toBeCloseTo(12);
		expect(a.ceilingM2).toBeCloseTo(12);
		expect(a.perimeterM).toBeCloseTo(14);
		expect(a.heightM).toBeCloseTo(2.7); // default settings.wallHeight
		expect(a.wallGrossM2).toBeCloseTo(37.8);
		expect(a.openingsM2).toBe(0);
		expect(a.wallNetM2).toBeCloseTo(37.8);
	});

	it('subtracts a window on a bordering wall from the net wall area', () => {
		const s = emptyScene();
		const room = rectRoom();
		s.rooms.push(room);
		s.walls.push({ id: 'w', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'brick', status: 'existing' });
		s.openings.push({ id: 'o', wallId: 'w', offset: 200, width: 100, type: 'window', flip: false, sill: 90, head: 210 });
		const a = roomSurfaceAreas(s, room);
		expect(a.openingsM2).toBeCloseTo(1.2); // 100 cm × (210−90) cm
		expect(a.wallNetM2).toBeCloseTo(37.8 - 1.2);
	});

	it('ignores openings on walls that do not border the room', () => {
		const s = emptyScene();
		const room = rectRoom();
		s.rooms.push(room);
		s.walls.push({ id: 'far', a: { x: 0, y: 900 }, b: { x: 400, y: 900 }, thickness: 10, material: 'brick', status: 'existing' });
		s.openings.push({ id: 'o', wallId: 'far', offset: 200, width: 100, type: 'window', flip: false });
		expect(roomSurfaceAreas(s, room).openingsM2).toBe(0);
	});

	it('finishSchedule aggregates same finish across rooms and skips none', () => {
		const s = emptyScene();
		const r1 = { ...rectRoom(), id: 'a', name: 'Кухня', wallFinish: 'tile' as const, floor: { kind: 'tile' as const, color: '#fff' } };
		const r2 = { ...rectRoom(), id: 'b', name: 'Санвузол', wallFinish: 'tile' as const, ceilingFinish: 'none' as const, floor: { kind: 'none' as const, color: '#fff' } };
		s.rooms.push(r1, r2);
		const rows = finishSchedule(s);
		const wallTile = rows.find((x) => x.label.startsWith('Стіни: Плитка'));
		expect(wallTile?.qty).toBeCloseTo(37.8 * 2);
		expect(wallTile?.unit).toBe('м²');
		expect(wallTile?.rooms.sort()).toEqual(['Кухня', 'Санвузол']);
		expect(rows.find((x) => x.label.startsWith('Підлога: Плитка'))?.rooms).toEqual(['Кухня']);
		expect(rows.some((x) => x.surface === 'ceiling')).toBe(false);
	});

	it('skirting = perimeter − door widths, cornice = perimeter; priced per пог.м', () => {
		const s = emptyScene();
		const room = { ...rectRoom(), skirting: true, cornice: true };
		s.rooms.push(room);
		s.walls.push({ id: 'w', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'brick', status: 'existing' });
		s.openings.push({ id: 'd', wallId: 'w', offset: 200, width: 90, type: 'door', flip: false });
		const rows = finishSchedule(s);
		const sk = rows.find((r) => r.key === 'wall:skirting')!;
		const co = rows.find((r) => r.key === 'ceiling:cornice')!;
		expect(sk.unit).toBe('пог.м');
		expect(sk.qty).toBeCloseTo(14 - 0.9); // perim 14 m − 0.9 m door
		expect(co.qty).toBeCloseTo(14);
		const est = finishEstimate(s);
		expect(est.rows.find((r) => r.key === 'wall:skirting')!.cost).toBe(Math.round((14 - 0.9) * DEFAULT_FINISH_RATES['wall:skirting']));
	});

	it('finishEstimate: cost = area × rate, custom rate overrides default', () => {
		const s = emptyScene();
		s.rooms.push({ ...rectRoom(), floor: { kind: 'tile', color: '#fff' } });
		// default floor:tile rate
		const d = finishEstimate(s);
		const row = d.rows.find((r) => r.key === 'floor:tile')!;
		expect(row.rate).toBe(DEFAULT_FINISH_RATES['floor:tile']);
		expect(row.cost).toBe(Math.round(12 * DEFAULT_FINISH_RATES['floor:tile']));
		expect(d.total).toBe(row.cost);

		s.settings.finishRates = { 'floor:tile': 1000 };
		const e = finishEstimate(s);
		expect(e.rows[0].rate).toBe(1000);
		expect(e.rows[0].cost).toBe(12000);
		expect(e.total).toBe(12000);
	});

	it('uses the room ceilingHeight when set', () => {
		const s = emptyScene();
		const room = { ...rectRoom(), ceilingHeight: 300 };
		s.rooms.push(room);
		const a = roomSurfaceAreas(s, room);
		expect(a.heightM).toBeCloseTo(3);
		expect(a.wallGrossM2).toBeCloseTo(42); // 14 × 3
	});
});
