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
});
