import { describe, expect, it } from 'vitest';
import { engineeringSpec } from './engspec';
import { emptyScene, newId } from './scene';

describe('engineeringSpec', () => {
	it('counts symbols by kind and sums route lengths by kind + gauge', () => {
		const s = emptyScene();
		s.symbols.push(
			{ id: newId(), kind: 'socket', x: 0, y: 0, rotation: 0 },
			{ id: newId(), kind: 'socket', x: 10, y: 0, rotation: 0 },
			{ id: newId(), kind: 'switch-1', x: 20, y: 0, rotation: 0 },
		);
		s.routes.push(
			{ id: newId(), kind: 'wire', points: [{ x: 0, y: 0 }, { x: 300, y: 0 }], gauge: '2.5' }, // 3 m
			{ id: newId(), kind: 'wire', points: [{ x: 0, y: 0 }, { x: 0, y: 200 }], gauge: '2.5' }, // 2 m
			{ id: newId(), kind: 'wire', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], gauge: '1.5' }, // 1 m
			{ id: newId(), kind: 'pipe-cold', points: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 400, y: 0 }] }, // 4 m
		);

		const spec = engineeringSpec(s);
		expect(spec.symbols.find((r) => r.label === 'Розетка')?.qty).toBe(2);
		expect(spec.symbols.find((r) => r.label === 'Вимикач')?.qty).toBe(1);
		expect(spec.symbols[0].unit).toBe('шт');

		expect(spec.routes.find((r) => r.label === 'Кабель, 2.5')?.qty).toBeCloseTo(5);
		expect(spec.routes.find((r) => r.label === 'Кабель, 1.5')?.qty).toBeCloseTo(1);
		expect(spec.routes.find((r) => r.label === 'Труба холодної води')?.qty).toBeCloseTo(4);
	});

	it('empty scene → empty spec', () => {
		const spec = engineeringSpec(emptyScene());
		expect(spec.symbols).toEqual([]);
		expect(spec.routes).toEqual([]);
	});
});
