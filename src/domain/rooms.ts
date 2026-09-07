import { centroid, distance, pointToSegment, polygonAreaCm2 } from './geometry';
import { DEFAULT_FLOOR, newId, type Room, type Vec, type Wall } from './scene';

interface Node {
	p: Vec;
	nbrs: number[]; // індекси сусідніх вузлів
}

/** Розбиває кожен відрізок у точках, де на ньому лежить кінець іншого відрізка (T-з'єднання). */
function planarize(segs: [Vec, Vec][], tolCm: number): [Vec, Vec][] {
	const pts: Vec[] = [];
	for (const [a, b] of segs) {
		pts.push(a, b);
	}
	const out: [Vec, Vec][] = [];
	for (const [a, b] of segs) {
		const splitTs: number[] = [0, 1];
		for (const p of pts) {
			const r = pointToSegment(p, a, b);
			if (r.distance <= tolCm && r.t > 0.001 && r.t < 0.999) splitTs.push(r.t);
		}
		splitTs.sort((x, y) => x - y);
		for (let i = 0; i < splitTs.length - 1; i++) {
			const t0 = splitTs[i];
			const t1 = splitTs[i + 1];
			if (t1 - t0 < 0.001) continue;
			out.push([
				{ x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 },
				{ x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 },
			]);
		}
	}
	return out;
}

function buildGraph(walls: Wall[], tolCm: number): Node[] {
	const segs = planarize(
		walls.filter((w) => distance(w.a, w.b) >= tolCm).map((w) => [w.a, w.b] as [Vec, Vec]),
		tolCm,
	);
	const nodes: Node[] = [];
	const findNode = (p: Vec): number => {
		for (let i = 0; i < nodes.length; i++) if (distance(nodes[i].p, p) <= tolCm) return i;
		nodes.push({ p: { ...p }, nbrs: [] });
		return nodes.length - 1;
	};
	for (const [a, b] of segs) {
		if (distance(a, b) < tolCm) continue;
		const ia = findNode(a);
		const ib = findNode(b);
		if (ia === ib) continue;
		if (!nodes[ia].nbrs.includes(ib)) nodes[ia].nbrs.push(ib);
		if (!nodes[ib].nbrs.includes(ia)) nodes[ib].nbrs.push(ia);
	}
	return nodes;
}

/**
 * Знаходить полігони найменших циклів (кімнат) із набору стін.
 * Планарний обхід граней: із напрямленого ребра (u→v) наступне ребро в вузлі v — те,
 * що дає найменший поворот за годинниковою від напрямку v→u.
 */
export function detectRooms(walls: Wall[], tolCm = 4, minAreaCm2 = 4000): Vec[][] {
	const nodes = buildGraph(walls, tolCm);
	if (nodes.length < 3) return [];

	const visited = new Set<string>(); // "u,v"
	const faces: Vec[][] = [];

	const nextEdge = (u: number, v: number): number => {
		const vp = nodes[v].p;
		const aIn = Math.atan2(nodes[u].p.y - vp.y, nodes[u].p.x - vp.x);
		let best = -1;
		let bestTurn = Infinity;
		for (const w of nodes[v].nbrs) {
			const aOut = Math.atan2(nodes[w].p.y - vp.y, nodes[w].p.x - vp.x);
			let turn = aIn - aOut;
			while (turn <= 0) turn += Math.PI * 2;
			while (turn > Math.PI * 2) turn -= Math.PI * 2;
			// уникаємо негайного розвороту, якщо є альтернатива
			if (w === u) turn += Math.PI * 4;
			if (turn < bestTurn) {
				bestTurn = turn;
				best = w;
			}
		}
		return best;
	};

	for (let u = 0; u < nodes.length; u++) {
		for (const v0 of nodes[u].nbrs) {
			if (visited.has(`${u},${v0}`)) continue;
			const poly: Vec[] = [];
			let cu = u;
			let cv = v0;
			let guard = 0;
			while (guard++ < 10000) {
				visited.add(`${cu},${cv}`);
				poly.push({ ...nodes[cu].p });
				const nv = nextEdge(cu, cv);
				if (nv < 0) break;
				cu = cv;
				cv = nv;
				if (cu === u && cv === v0) break;
			}
			if (poly.length >= 3) faces.push(poly);
		}
	}

	// відкидаємо зовнішню грань (найбільша площа) та надто малі
	const scored = faces
		.map((poly) => ({ poly, area: polygonAreaCm2(poly) }))
		.filter((f) => f.area >= minAreaCm2)
		.sort((a, b) => b.area - a.area);
	if (scored.length === 0) return [];
	const interior = scored.slice(1); // прибрати найбільшу (зовнішній контур)

	// дедуплікація за набором вершин
	const seen = new Set<string>();
	const out: Vec[][] = [];
	for (const { poly } of interior) {
		const key = poly
			.map((p) => `${Math.round(p.x / 5)},${Math.round(p.y / 5)}`)
			.sort()
			.join('|');
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(poly);
	}
	return out;
}

/**
 * Оновлює список кімнат за нововиявленими полігонами: зберігає назви/покриття за
 * збігом центроїда, прибирає зниклі, додає нові.
 */
export function reconcileRooms(oldRooms: Room[], polys: Vec[][], tolCm = 60): Room[] {
	const used = new Set<number>();
	return polys.map((points) => {
		const c = centroid(points);
		let matchIdx = -1;
		let bestD = tolCm;
		oldRooms.forEach((r, i) => {
			if (used.has(i)) return;
			const d = distance(centroid(r.points), c);
			if (d < bestD) {
				bestD = d;
				matchIdx = i;
			}
		});
		if (matchIdx >= 0) {
			used.add(matchIdx);
			const src = oldRooms[matchIdx];
			return { ...src, points };
		}
		return { id: newId(), points, name: 'Кімната', floor: { ...DEFAULT_FLOOR } };
	});
}
