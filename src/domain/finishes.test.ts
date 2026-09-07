import { describe, expect, it } from 'vitest';
import { finishSchedule, roomSurfaceAreas } from './finishes';
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
		expect(wallTile?.areaM2).toBeCloseTo(37.8 * 2);
		expect(wallTile?.rooms.sort()).toEqual(['Кухня', 'Санвузол']);
		expect(rows.find((x) => x.label.startsWith('Підлога: Плитка'))?.rooms).toEqual(['Кухня']);
		expect(rows.some((x) => x.surface === 'ceiling')).toBe(false);
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
