import { describe, expect, it } from 'vitest';
import { distance } from './geometry';
import { makeRoomRect, type Wall } from './scene';
import { moveNode, splitWall, wallNodes } from './walls';

const box = () => makeRoomRect(0, 0, 400, 300, 10).walls;

describe('wallNodes', () => {
	it('a rectangle has 4 nodes each shared by 2 walls', () => {
		const nodes = wallNodes(box());
		expect(nodes).toHaveLength(4);
		for (const n of nodes) expect(n.wallIds.length).toBe(2);
	});
});

describe('moveNode', () => {
	it('moves every wall end at the corner together', () => {
		const walls = box();
		const moved = moveNode(walls, { x: 0, y: 0 }, { x: -50, y: -50 });
		const touching = moved.filter((w) => distance(w.a, { x: -50, y: -50 }) < 1 || distance(w.b, { x: -50, y: -50 }) < 1);
		expect(touching).toHaveLength(2);
	});
});

describe('splitWall', () => {
	it('splits one wall into two collinear segments', () => {
		const walls: Wall[] = [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'block' }];
		const out = splitWall(walls, 'w', { x: 200, y: 5 });
		expect(out).toHaveLength(2);
		expect(out[0].b).toEqual({ x: 200, y: 0 });
		expect(out[1].a).toEqual({ x: 200, y: 0 });
		expect(out[1].b).toEqual({ x: 400, y: 0 });
	});

	it('does not split near an endpoint', () => {
		const walls: Wall[] = [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 10, material: 'block' }];
		expect(splitWall(walls, 'w', { x: 3, y: 0 })).toHaveLength(1);
	});
});
