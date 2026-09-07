import { describe, expect, it } from 'vitest';
import { wallElevation } from './elevation';
import { emptyScene, makeRoomRect, newId, type Scene } from './scene';

function scene(): Scene {
	const s = emptyScene();
	const { walls } = makeRoomRect(0, 0, 400, 300, 10, 'K');
	s.walls.push(...walls);
	// top wall = walls[0] (0,0)->(400,0)
	s.openings.push({ id: newId(), wallId: walls[0].id, offset: 200, width: 90, type: 'window', flip: false, sill: 90, head: 220 });
	s.furniture.push({ id: newId(), kind: 'sofa', x: 100, y: 40, rotation: 0, w: 200, d: 90, label: 'Диван', color: '#000' });
	s.furniture.push({ id: newId(), kind: 'bed-double', x: 350, y: 250, rotation: 0, w: 160, d: 200, label: 'Ліжко', color: '#000' });
	return { ...s, id: walls[0].id } as never;
}

describe('wallElevation', () => {
	it('returns length, height and the window on that wall', () => {
		const s = emptyScene();
		const { walls } = makeRoomRect(0, 0, 400, 300, 10, 'K');
		s.walls.push(...walls);
		s.openings.push({ id: 'o', wallId: walls[0].id, offset: 200, width: 90, type: 'window', flip: false, sill: 90, head: 220 });
		s.furniture.push({ id: 'f1', kind: 'sofa', x: 100, y: 30, rotation: 0, w: 200, d: 90, label: 'Диван', color: '#000' });
		s.furniture.push({ id: 'f2', kind: 'bed-double', x: 350, y: 250, rotation: 0, w: 160, d: 200, label: 'Ліжко', color: '#000' });

		const el = wallElevation(s, walls[0].id)!;
		expect(el.length).toBe(400);
		expect(el.height).toBe(270);
		expect(el.openings).toHaveLength(1);
		expect(el.openings[0].x).toBe(155);
		expect(el.openings[0].head).toBe(220);
		// лише диван біля верхньої стіни
		expect(el.furniture.map((f) => f.label)).toEqual(['Диван']);
	});

	it('null for unknown wall', () => {
		expect(wallElevation(scene() as unknown as Scene, 'nope')).toBeNull();
	});
});
