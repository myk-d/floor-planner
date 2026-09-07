import { bboxOf, centroid, distance, polygonAreaM2, segmentNormal } from './geometry';
import { formatAreaM2, formatLengthShort } from './units';
import type { Scene, Units, Vec } from './scene';

/** Кут для підпису розміру: у діапазоні [-90, 90], щоб текст не був догори ногами. */
function labelAngle(a: Vec, b: Vec): number {
	let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
	if (deg > 90) deg -= 180;
	else if (deg < -90) deg += 180;
	return deg;
}

export interface DimSegment {
	/** початок винесеної розмірної лінії */
	a: Vec;
	/** кінець винесеної розмірної лінії */
	b: Vec;
	/** позиція підпису (середина) */
	mid: Vec;
	label: string;
	/** кут тексту в градусах */
	angleDeg: number;
}

/**
 * Авто-розміри по кожній стіні: винесена лінія зі зсувом `offsetCm` назовні
 * (у бік нормалі) + підпис довжини.
 */
function sameSegment(a: Scene['walls'][number], b: Scene['walls'][number]): boolean {
	const near = (p: Vec, q: Vec) => distance(p, q) < 2;
	return (near(a.a, b.a) && near(a.b, b.b)) || (near(a.a, b.b) && near(a.b, b.a));
}

export function wallDimensions(scene: Scene, units: Units, offsetCm = 45): DimSegment[] {
	const all = scene.walls.filter((w) => distance(w.a, w.b) > 1);
	// прибираємо дублікати спільних стін (дві суміжні кімнати), щоб не було подвійних розмірів
	const walls = all.filter((w, i) => all.findIndex((o) => sameSegment(w, o)) === i);
	const pts = walls.flatMap((w) => [w.a, w.b]);
	const bb = bboxOf(pts);
	const center = { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 };
	return walls.map((w) => {
		let n = segmentNormal(w.a, w.b);
		// нормаль назовні від центру плану, щоб розмірні лінії не лягали всередину
		const mid = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 };
		if (n.x * (mid.x - center.x) + n.y * (mid.y - center.y) < 0) n = { x: -n.x, y: -n.y };
		const off = { x: n.x * offsetCm, y: n.y * offsetCm };
		const a = { x: w.a.x + off.x, y: w.a.y + off.y };
		const b = { x: w.b.x + off.x, y: w.b.y + off.y };
		return {
			a,
			b,
			mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
			label: formatLengthShort(distance(w.a, w.b), units),
			angleDeg: labelAngle(a, b),
		};
	});
}

/** Розмір із запису DimLine (ручний). */
export function manualDimensions(scene: Scene, units: Units): DimSegment[] {
	return scene.dims.map((d) => {
		const n = segmentNormal(d.a, d.b);
		const off = { x: n.x * d.offset, y: n.y * d.offset };
		const a = { x: d.a.x + off.x, y: d.a.y + off.y };
		const b = { x: d.b.x + off.x, y: d.b.y + off.y };
		return {
			a,
			b,
			mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
			label: formatLengthShort(distance(d.a, d.b), units),
			angleDeg: labelAngle(a, b),
		};
	});
}

export interface RoomLabel {
	at: Vec;
	name: string;
	areaText: string;
	areaM2: number;
}

export function roomLabels(scene: Scene): RoomLabel[] {
	return scene.rooms
		.filter((r) => r.points.length >= 3)
		.map((r) => {
			const areaM2 = polygonAreaM2(r.points);
			return {
				at: centroid(r.points),
				name: r.name,
				areaText: formatAreaM2(areaM2),
				areaM2,
			};
		});
}

export function totalAreaM2(scene: Scene): number {
	return roomLabels(scene).reduce((s, r) => s + r.areaM2, 0);
}

export function measureLabel(a: Vec, b: Vec, units: Units): string {
	return formatLengthShort(distance(a, b), units);
}

export interface OverallChain {
	/** орієнтація ланцюга */
	side: 'top' | 'bottom' | 'left' | 'right';
	/** сегменти ланцюга (винесені лінії) */
	segments: DimSegment[];
	/** сумарний габарит */
	total: DimSegment;
}

/**
 * Скумулятивні ланцюги розмірів по 4 сторонах габариту стін: проєктує всі унікальні
 * координати вузлів на кожну вісь і будить послідовні сегменти + сумарний габарит.
 */
export function overallChains(scene: Scene, units: Units, gapCm = 90): OverallChain[] {
	const walls = scene.walls.filter((w) => distance(w.a, w.b) > 1);
	if (walls.length === 0) return [];
	const xs = uniqSorted(walls.flatMap((w) => [w.a.x, w.b.x]));
	const ys = uniqSorted(walls.flatMap((w) => [w.a.y, w.b.y]));
	const minX = xs[0];
	const maxX = xs[xs.length - 1];
	const minY = ys[0];
	const maxY = ys[ys.length - 1];
	if (maxX - minX < 1 || maxY - minY < 1) return [];

	const horiz = (y: number, sign: number): { segs: DimSegment[]; total: DimSegment } => {
		const yy = y + sign * gapCm;
		const segs: DimSegment[] = [];
		for (let i = 0; i < xs.length - 1; i++) {
			const a = { x: xs[i], y: yy };
			const b = { x: xs[i + 1], y: yy };
			segs.push({ a, b, mid: mid(a, b), label: formatLengthShort(xs[i + 1] - xs[i], units), angleDeg: 0 });
		}
		const a = { x: minX, y: yy + sign * 34 };
		const b = { x: maxX, y: yy + sign * 34 };
		return { segs, total: { a, b, mid: mid(a, b), label: formatLengthShort(maxX - minX, units), angleDeg: 0 } };
	};
	const vert = (x: number, sign: number): { segs: DimSegment[]; total: DimSegment } => {
		const xx = x + sign * gapCm;
		const segs: DimSegment[] = [];
		for (let i = 0; i < ys.length - 1; i++) {
			const a = { x: xx, y: ys[i] };
			const b = { x: xx, y: ys[i + 1] };
			segs.push({ a, b, mid: mid(a, b), label: formatLengthShort(ys[i + 1] - ys[i], units), angleDeg: -90 });
		}
		const a = { x: xx + sign * 34, y: minY };
		const b = { x: xx + sign * 34, y: maxY };
		return { segs, total: { a, b, mid: mid(a, b), label: formatLengthShort(maxY - minY, units), angleDeg: -90 } };
	};

	const top = horiz(minY, -1);
	const bottom = horiz(maxY, 1);
	const left = vert(minX, -1);
	const right = vert(maxX, 1);
	return [
		{ side: 'top', segments: top.segs, total: top.total },
		{ side: 'bottom', segments: bottom.segs, total: bottom.total },
		{ side: 'left', segments: left.segs, total: left.total },
		{ side: 'right', segments: right.segs, total: right.total },
	];
}

function uniqSorted(nums: number[], tol = 2): number[] {
	const sorted = [...nums].sort((a, b) => a - b);
	const out: number[] = [];
	for (const n of sorted) if (out.length === 0 || n - out[out.length - 1] > tol) out.push(n);
	return out;
}

function mid(a: Vec, b: Vec): Vec {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
