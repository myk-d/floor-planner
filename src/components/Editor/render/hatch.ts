import type { FloorKind, WallMaterial } from '../../../domain/scene';

/**
 * Процедурні текстури матеріалів стін і покриттів підлоги — генеруються на canvas і
 * використовуються як `fillPatternImage` у Konva (а в 3D — як CanvasTexture).
 * Мемоізуються за ключем. `base` — колір-основа, `line` — колір деталей/швів.
 */
const cache = new Map<string, HTMLCanvasElement>();

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const ctx = c.getContext('2d')!;
	draw(ctx, w, h);
	cache.set(key, c);
	return c;
}

// детермінований псевдовипадковий
function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
}

/**
 * Заливає основу лише коли колір непрозорий. У лінійному режимі `base` приходить
 * як 'transparent' / колір з нульовою альфою — тоді заливки немає (лишається сама
 * штриховка), інакше суцільний темний фон перекривав би меблі та розміри.
 */
function fillBase(ctx: CanvasRenderingContext2D, base: string, w: number, h: number) {
	const b = base.trim().toLowerCase();
	if (!b || b === 'transparent' || /^#[0-9a-f]{6}00$/.test(b) || /rgba?\([^)]*,\s*0\s*\)$/.test(b)) return;
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, w, h);
}

function shade(hex: string, amt: number): string {
	const m = hex.match(/^#?([0-9a-f]{6})$/i);
	if (!m) return hex;
	const n = parseInt(m[1], 16);
	const r = Math.max(0, Math.min(255, (n >> 16) + amt));
	const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
	const b = Math.max(0, Math.min(255, (n & 255) + amt));
	return `rgb(${r},${g},${b})`;
}

export const WALL_MATERIAL_COLOR: Record<WallMaterial, string> = {
	block: '#c9c6c0',
	brick: '#c07a5c',
	concrete: '#b7bac0',
	drywall: '#dcd8d0',
	wood: '#c39a68',
	glass: '#bfe0ec',
};

export function wallHatch(material: WallMaterial, base: string, line: string): HTMLCanvasElement {
	const key = `w-${material}-${base}-${line}`;
	switch (material) {
		case 'brick':
			return make(key, 40, 20, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				ctx.fillStyle = line;
				// шви
				ctx.fillRect(0, h / 2 - 0.6, w, 1.2);
				ctx.fillRect(0, 0, w, 1.2);
				ctx.fillRect(w / 2 - 0.6, 0, 1.2, h / 2);
				ctx.fillRect(0, h / 2, 1.2, h / 2);
				ctx.fillRect(w - 0.6, h / 2, 1.2, h / 2);
			});
		case 'concrete':
			return make(key, 24, 24, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				const r = rng(7);
				for (let i = 0; i < 26; i++) {
					ctx.fillStyle = r() > 0.5 ? shade('#000000', 40) : shade('#ffffff', 200);
					ctx.globalAlpha = 0.12 + r() * 0.15;
					ctx.beginPath();
					ctx.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			});
		case 'wood':
			return make(key, 48, 24, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				const r = rng(11);
				ctx.strokeStyle = line;
				ctx.lineWidth = 0.6;
				for (let i = 0; i < 7; i++) {
					const y = (i / 7) * h + r() * 2;
					ctx.globalAlpha = 0.25 + r() * 0.3;
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 4, w * 0.7, y + (r() - 0.5) * 4, w, y);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			});
		case 'glass':
			return make(key, 16, 16, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				ctx.strokeStyle = line;
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.moveTo(-2, h + 2);
				ctx.lineTo(w + 2, -2);
				ctx.moveTo(-2, h / 2);
				ctx.lineTo(w / 2, -2);
				ctx.stroke();
			});
		case 'drywall':
			return make(key, 12, 12, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				ctx.strokeStyle = line;
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(0, h / 2);
				ctx.lineTo(w, h / 2);
				ctx.stroke();
			});
		case 'block':
		default:
			return make(key, 8, 8, (ctx, w, h) => {
				ctx.fillStyle = WALL_MATERIAL_COLOR.block;
				ctx.fillRect(0, 0, w, h);
			});
	}
}

const FLOOR_TINT: Record<FloorKind, string> = {
	none: '#00000000',
	parquet: '#c99a68',
	laminate: '#dcc199',
	tile: '#dde2e6',
	carpet: '#c9bdac',
	concrete: '#c9ccd0',
};

export const floorTint = (kind: FloorKind, override?: string): string =>
	override && override.toLowerCase() !== '#e8dcc8' ? override : FLOOR_TINT[kind];

export function floorHatch(kind: FloorKind, base: string, line: string): HTMLCanvasElement | null {
	const key = `f-${kind}-${base}-${line}`;
	switch (kind) {
		case 'parquet':
			// «ялинка»
			return make(key, 48, 48, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				ctx.strokeStyle = line;
				ctx.lineWidth = 1;
				const s = w / 2;
				for (let i = -2; i < 4; i++) {
					ctx.beginPath();
					ctx.moveTo(i * s, 0);
					ctx.lineTo(i * s + s, s);
					ctx.lineTo(i * s, s * 2);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(i * s + s, 0);
					ctx.lineTo(i * s, s);
					ctx.lineTo(i * s + s, s * 2);
					ctx.stroke();
				}
			});
		case 'laminate':
			return make(key, 60, 30, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				const r = rng(3);
				ctx.strokeStyle = line;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(0, h / 2);
				ctx.lineTo(w, h / 2);
				ctx.moveTo(w * 0.55, 0);
				ctx.lineTo(w * 0.55, h / 2);
				ctx.moveTo(w * 0.2, h / 2);
				ctx.lineTo(w * 0.2, h);
				ctx.stroke();
				ctx.strokeStyle = shade('#000000', 20);
				ctx.globalAlpha = 0.06;
				for (let i = 0; i < 6; i++) {
					ctx.beginPath();
					ctx.moveTo(r() * w, 0);
					ctx.lineTo(r() * w, h);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
			});
		case 'tile':
			return make(key, 34, 34, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				ctx.strokeStyle = line;
				ctx.lineWidth = 1;
				ctx.globalAlpha = 0.55;
				ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
				ctx.beginPath();
				ctx.moveTo(w / 2, 0);
				ctx.lineTo(w / 2, h);
				ctx.moveTo(0, h / 2);
				ctx.lineTo(w, h / 2);
				ctx.stroke();
				ctx.globalAlpha = 1;
			});
		case 'carpet':
			return make(key, 10, 10, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				const r = rng(5);
				for (let i = 0; i < 18; i++) {
					ctx.fillStyle = r() > 0.5 ? shade('#000000', 25) : shade('#ffffff', 220);
					ctx.globalAlpha = 0.08 + r() * 0.1;
					ctx.fillRect(r() * w, r() * h, 1, 1);
				}
				ctx.globalAlpha = 1;
			});
		case 'concrete':
			return make(key, 22, 22, (ctx, w, h) => {
				fillBase(ctx, base, w, h);
				const r = rng(9);
				for (let i = 0; i < 20; i++) {
					ctx.fillStyle = r() > 0.5 ? shade('#000000', 30) : shade('#ffffff', 220);
					ctx.globalAlpha = 0.06 + r() * 0.1;
					ctx.beginPath();
					ctx.arc(r() * w, r() * h, 0.5 + r() * 1.4, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = 1;
			});
		default:
			return null;
	}
}
