import { describe, expect, it } from 'vitest';
import { hiddenInPhase, reconfigSummary } from './reconfig';
import { emptyScene, newId } from './scene';

describe('hiddenInPhase', () => {
	it('before hides new, after hides demolish, both hides nothing', () => {
		expect(hiddenInPhase('before', 'new')).toBe(true);
		expect(hiddenInPhase('before', 'demolish')).toBe(false);
		expect(hiddenInPhase('after', 'demolish')).toBe(true);
		expect(hiddenInPhase('after', 'new')).toBe(false);
		expect(hiddenInPhase('both', 'new')).toBe(false);
		expect(hiddenInPhase('before', undefined)).toBe(false);
	});
});

describe('reconfigSummary', () => {
	it('no changes → any:false', () => {
		const s = emptyScene();
		s.walls.push({ id: 'w', a: { x: 0, y: 0 }, b: { x: 300, y: 0 }, thickness: 10, material: 'brick', status: 'existing' });
		expect(reconfigSummary(s).any).toBe(false);
	});

	it('counts and measures demolished / new walls and openings', () => {
		const s = emptyScene();
		s.walls.push(
			{ id: 'a', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'brick', status: 'demolish' }, // 4 m
			{ id: 'b', a: { x: 0, y: 0 }, b: { x: 0, y: 250 }, thickness: 10, material: 'brick', status: 'new' }, // 2.5 m
			{ id: 'c', a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, thickness: 10, material: 'brick', status: 'existing' },
		);
		s.openings.push(
			{ id: newId(), wallId: 'a', offset: 50, width: 80, type: 'door', flip: false, status: 'demolish' },
			{ id: newId(), wallId: 'b', offset: 50, width: 90, type: 'door', flip: false, status: 'new' },
			{ id: newId(), wallId: 'b', offset: 150, width: 90, type: 'window', flip: false, status: 'new' },
		);
		const r = reconfigSummary(s);
		expect(r.wallsDemolish).toEqual({ count: 1, lengthM: 4 });
		expect(r.wallsNew).toEqual({ count: 1, lengthM: 2.5 });
		expect(r.openingsDemolish).toBe(1);
		expect(r.openingsNew).toBe(2);
		expect(r.any).toBe(true);
	});
});
