import { distance, segmentAngle, snapAngle } from './geometry';
import type { Scene, Vec } from './scene';

export function snapToGrid(v: Vec, grid: number): Vec {
	if (grid <= 0) return v;
	return { x: Math.round(v.x / grid) * grid, y: Math.round(v.y / grid) * grid };
}

/** Усі кінці стін сцени як точки-магніти. */
export function wallVertices(scene: Scene): Vec[] {
	const out: Vec[] = [];
	scene.walls.forEach((w) => {
		out.push(w.a, w.b);
	});
	return out;
}

/**
 * Притягує точку до найближчого кінця стіни, якщо він ближчий за `toleranceCm`.
 * Повертає прив'язану точку (або оригінал) + чи спрацювало.
 */
export function snapToVertices(v: Vec, scene: Scene, toleranceCm: number): { point: Vec; snapped: boolean } {
	let best: Vec | null = null;
	let bestDist = toleranceCm;
	for (const vertex of wallVertices(scene)) {
		const d = distance(v, vertex);
		if (d < bestDist) {
			bestDist = d;
			best = vertex;
		}
	}
	return best ? { point: best, snapped: true } : { point: v, snapped: false };
}

/**
 * Прив'язує напрямок відрізка a→b до кроку кутів (за замовчуванням 15°),
 * зберігаючи довжину. Використовується під час малювання стін.
 */
export function snapWallAngle(a: Vec, b: Vec, stepDeg = 15): Vec {
	const dist = distance(a, b);
	if (dist === 0) return b;
	const ang = snapAngle(segmentAngle(a, b), stepDeg);
	return { x: a.x + Math.cos(ang) * dist, y: a.y + Math.sin(ang) * dist };
}
