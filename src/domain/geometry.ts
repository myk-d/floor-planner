import type { Scene, Vec } from './scene';

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export function normalize(a: Vec): Vec {
	const l = len(a);
	return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Одинична нормаль до відрізка a→b (повернута на 90° за годинниковою в системі з Y вниз). */
export function segmentNormal(a: Vec, b: Vec): Vec {
	const d = normalize(sub(b, a));
	return { x: -d.y, y: d.x };
}

/** Кут відрізка a→b у радіанах. */
export const segmentAngle = (a: Vec, b: Vec): number => Math.atan2(b.y - a.y, b.x - a.x);

export function rotatePoint(p: Vec, origin: Vec, degrees: number): Vec {
	const rad = (degrees * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const dx = p.x - origin.x;
	const dy = p.y - origin.y;
	return {
		x: origin.x + dx * cos - dy * sin,
		y: origin.y + dx * sin + dy * cos,
	};
}

/** Проєкція точки на відрізок + сама найближча точка й параметр t∈[0,1]. */
export function pointToSegment(p: Vec, a: Vec, b: Vec): { point: Vec; distance: number; t: number } {
	const ab = sub(b, a);
	const abLen2 = dot(ab, ab);
	const t = abLen2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / abLen2));
	const point = add(a, scale(ab, t));
	return { point, distance: distance(p, point), t };
}

/** Площа полігону (shoelace), м². Вхід у см. Знак прибирається. */
export function polygonAreaCm2(points: Vec[]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const q = points[(i + 1) % points.length];
		sum += p.x * q.y - q.x * p.y;
	}
	return Math.abs(sum) / 2;
}

export const polygonAreaM2 = (points: Vec[]): number => polygonAreaCm2(points) / 10000;

export function polygonPerimeterCm(points: Vec[]): number {
	let per = 0;
	for (let i = 0; i < points.length; i++) {
		per += distance(points[i], points[(i + 1) % points.length]);
	}
	return per;
}

export function centroid(points: Vec[]): Vec {
	if (points.length === 0) return { x: 0, y: 0 };
	// Центроїд площі полігону; вироджений випадок — середнє арифметичне вершин.
	let a = 0;
	let cx = 0;
	let cy = 0;
	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const q = points[(i + 1) % points.length];
		const cross = p.x * q.y - q.x * p.y;
		a += cross;
		cx += (p.x + q.x) * cross;
		cy += (p.y + q.y) * cross;
	}
	if (Math.abs(a) < 1e-6) {
		return {
			x: points.reduce((s, p) => s + p.x, 0) / points.length,
			y: points.reduce((s, p) => s + p.y, 0) / points.length,
		};
	}
	a *= 0.5;
	return { x: cx / (6 * a), y: cy / (6 * a) };
}

export interface BBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function bboxOf(points: Vec[]): BBox {
	if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	return points.reduce<BBox>(
		(acc, p) => ({
			minX: Math.min(acc.minX, p.x),
			minY: Math.min(acc.minY, p.y),
			maxX: Math.max(acc.maxX, p.x),
			maxY: Math.max(acc.maxY, p.y),
		}),
		{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
	);
}

/** Габарит усього, що є в сцені (стіни, кімнати, меблі, тексти, розміри). */
export function sceneBBox(scene: Scene): BBox {
	const pts: Vec[] = [];
	scene.walls.forEach((w) => pts.push(w.a, w.b));
	scene.rooms.forEach((r) => pts.push(...r.points));
	scene.texts.forEach((t) => pts.push({ x: t.x, y: t.y }));
	scene.dims.forEach((d) => pts.push(d.a, d.b));
	scene.furniture.forEach((f) => {
		const half = { x: f.w / 2, y: f.d / 2 };
		const corners = [
			{ x: -half.x, y: -half.y },
			{ x: half.x, y: -half.y },
			{ x: half.x, y: half.y },
			{ x: -half.x, y: half.y },
		];
		corners.forEach((c) => pts.push(rotatePoint({ x: f.x + c.x, y: f.y + c.y }, { x: f.x, y: f.y }, f.rotation)));
	});
	return bboxOf(pts);
}

/** Прив'язка кута (радіани) до найближчого кроку в градусах. */
export function snapAngle(rad: number, stepDeg: number): number {
	const step = (stepDeg * Math.PI) / 180;
	return Math.round(rad / step) * step;
}

/** Чи точка всередині полігону (ray-casting). */
export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i];
		const b = poly[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
	}
	return inside;
}

/** Найближча точка на ламаній + індекс сегмента + дистанція. */
export function nearestPointOnPolyline(p: Vec, pts: Vec[]): { point: Vec; segment: number; distance: number } {
	let best = { point: pts[0] ?? p, segment: 0, distance: Infinity };
	for (let i = 0; i < pts.length - 1; i++) {
		const r = pointToSegment(p, pts[i], pts[i + 1]);
		if (r.distance < best.distance) best = { point: r.point, segment: i, distance: r.distance };
	}
	return best;
}

/** Орієнтована площа полігону (см²) — знак задає напрям обходу (додатній = за годинниковою в Y-вниз). */
export function signedAreaCm2(points: Vec[]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const q = points[(i + 1) % points.length];
		sum += p.x * q.y - q.x * p.y;
	}
	return sum / 2;
}
