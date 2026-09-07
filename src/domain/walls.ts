import { distance, pointToSegment } from './geometry';
import { newId, type Vec, type Wall } from './scene';

export interface WallNode {
	id: string;
	p: Vec;
	/** id стін, що торкаються цього вузла */
	wallIds: string[];
	/** 'a' | 'b' на кожну стіну */
	ends: ('a' | 'b')[];
}

/** Унікальні вузли (кінці стін), злиті за допуском. */
export function wallNodes(walls: Wall[], tolCm = 4): WallNode[] {
	const nodes: WallNode[] = [];
	const attach = (p: Vec, wallId: string, end: 'a' | 'b') => {
		let node = nodes.find((n) => distance(n.p, p) <= tolCm);
		if (!node) {
			node = { id: newId(), p: { ...p }, wallIds: [], ends: [] };
			nodes.push(node);
		}
		node.wallIds.push(wallId);
		node.ends.push(end);
	};
	for (const w of walls) {
		attach(w.a, w.id, 'a');
		attach(w.b, w.id, 'b');
	}
	return nodes;
}

/** Рухає всі кінці стін, що збігаються з `at`, у нову точку `to`. */
export function moveNode(walls: Wall[], at: Vec, to: Vec, tolCm = 4): Wall[] {
	const snap = { x: Math.round(to.x), y: Math.round(to.y) };
	return walls.map((w) => {
		const next = { ...w };
		if (distance(w.a, at) <= tolCm) next.a = { ...snap };
		if (distance(w.b, at) <= tolCm) next.b = { ...snap };
		return next;
	});
}

/** Розбиває стіну в точці `at` на дві. */
export function splitWall(walls: Wall[], wallId: string, at: Vec): Wall[] {
	const idx = walls.findIndex((w) => w.id === wallId);
	if (idx < 0) return walls;
	const w = walls[idx];
	const proj = pointToSegment(at, w.a, w.b);
	if (proj.t <= 0.02 || proj.t >= 0.98) return walls;
	const mid = { x: Math.round(proj.point.x), y: Math.round(proj.point.y) };
	const first: Wall = { ...w, id: w.id, b: mid };
	const second: Wall = { ...w, id: newId(), a: mid, b: { ...w.b } };
	const out = [...walls];
	out.splice(idx, 1, first, second);
	return out;
}

/** Об'єднує послідовні майже-колінеарні стіни в одному вузлі. */
export function mergeCollinear(walls: Wall[], tolDeg = 3, tolCm = 4): Wall[] {
	const angleOf = (w: Wall) => Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
	let result = [...walls];
	let changed = true;
	while (changed) {
		changed = false;
		outer: for (let i = 0; i < result.length; i++) {
			for (let j = i + 1; j < result.length; j++) {
				const a = result[i];
				const b = result[j];
				if (a.thickness !== b.thickness || a.material !== b.material) continue;
				const pairs: [Vec, Vec, Vec][] = [
					[a.a, a.b, b.b],
					[a.b, a.a, b.b],
					[a.a, a.b, b.a],
					[a.b, a.a, b.a],
				];
				for (const [shared1, farA, farB] of pairs) {
					const bSharedIsA = distance(shared1, b.a) <= tolCm;
					const bSharedIsB = distance(shared1, b.b) <= tolCm;
					if (!bSharedIsA && !bSharedIsB) continue;
					const angA = Math.atan2(farA.y - shared1.y, farA.x - shared1.x);
					const angB = Math.atan2(farB.y - shared1.y, farB.x - shared1.x);
					let diff = Math.abs(angA - angB);
					if (diff > Math.PI) diff = Math.PI * 2 - diff;
					if (Math.abs(diff - Math.PI) <= (tolDeg * Math.PI) / 180) {
						const merged: Wall = { ...a, a: { ...farA }, b: { ...farB } };
						result = result.filter((_, k) => k !== i && k !== j);
						result.push(merged);
						changed = true;
						break outer;
					}
				}
			}
		}
	}
	void angleOf;
	return result;
}
