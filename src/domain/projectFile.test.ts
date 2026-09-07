import { describe, expect, it } from 'vitest';
import { fromProjectFile, toProjectFile } from './projectFile';
import { emptyScene, makeRoomRect } from './scene';

describe('projectFile round-trip', () => {
	it('exports and re-imports an identical scene', () => {
		const s = emptyScene('Квартира');
		const { walls, room } = makeRoomRect(0, 0, 500, 400, 10, 'Зал');
		s.walls.push(...walls);
		s.rooms.push(room);
		const json = toProjectFile('Квартира', s);
		const parsed = fromProjectFile(json);
		expect(parsed.name).toBe('Квартира');
		expect(parsed.scene.walls).toHaveLength(4);
		expect(parsed.scene.rooms[0].name).toBe('Зал');
	});

	it('accepts a bare scene json too', () => {
		const s = emptyScene('X');
		s.walls.push(...makeRoomRect(0, 0, 300, 200, 10).walls);
		const parsed = fromProjectFile(JSON.stringify(s));
		expect(parsed.scene.walls).toHaveLength(4);
	});

	it('rejects empty / wrong format', () => {
		expect(() => fromProjectFile(JSON.stringify({ format: 'other' }))).toThrow();
		expect(() => fromProjectFile(JSON.stringify(emptyScene('E')))).toThrow();
	});

	it('round-trips planning variants (v2) and stays v1 for a single variant', () => {
		const v1 = emptyScene('A');
		v1.rooms.push(makeRoomRect(0, 0, 400, 300, 10, 'Було').room);
		const v2 = emptyScene('A');
		v2.rooms.push(makeRoomRect(0, 0, 500, 300, 10, 'Стало').room);
		const variants = [
			{ id: 'a', name: 'Варіант 1', scene: v1 },
			{ id: 'b', name: 'Варіант 2', scene: v2 },
		];
		const json = toProjectFile('A', v2, variants, 'b');
		expect(JSON.parse(json).version).toBe(2);
		const parsed = fromProjectFile(json);
		expect(parsed.variants?.map((v) => v.name)).toEqual(['Варіант 1', 'Варіант 2']);
		expect(parsed.activeVariantId).toBe('b');
		expect(parsed.scene.rooms[0].name).toBe('Стало'); // active

		// a lone variant is written as plain v1
		const solo = toProjectFile('A', v1, [variants[0]], 'a');
		expect(JSON.parse(solo).version).toBe(1);
		expect(fromProjectFile(solo).variants).toBeUndefined();
	});
});
