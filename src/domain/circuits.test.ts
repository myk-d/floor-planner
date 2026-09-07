import { describe, expect, it } from 'vitest';
import { circuitColorMap, circuitGroups } from './circuits';
import { emptyScene, newId, type Scene } from './scene';

function scene(): Scene {
	const s = emptyScene();
	s.symbols.push(
		{ id: 's1', kind: 'socket', x: 0, y: 0, rotation: 0, circuit: 'Кухня' },
		{ id: 's2', kind: 'socket', x: 0, y: 0, rotation: 0, circuit: 'Кухня' },
		{ id: 's3', kind: 'light-ceiling', x: 0, y: 0, rotation: 0, circuit: 'Світло' },
		{ id: 's4', kind: 'socket', x: 0, y: 0, rotation: 0 },
	);
	s.routes.push({ id: newId(), kind: 'wire', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], circuit: 'Кухня' });
	return s;
}

describe('circuitGroups', () => {
	it('groups by circuit and assigns distinct colors', () => {
		const groups = circuitGroups(scene());
		expect(groups.map((g) => g.circuit)).toEqual(['Кухня', 'Світло']);
		expect(groups[0].count).toBe(3);
		expect(groups[1].count).toBe(1);
		expect(groups[0].color).not.toBe(groups[1].color);
	});

	it('color map covers grouped elements only', () => {
		const map = circuitColorMap(scene());
		expect(map.get('s1')).toBe(map.get('s2'));
		expect(map.has('s4')).toBe(false);
	});
});
