import { manualDimensions, overallChains, roomLabels, wallDimensions, type DimSegment } from './dimensions';
import { sceneBBox, segmentNormal } from './geometry';
import type { RenderMode, Scene, Vec } from './scene';
import { formatAreaM2 } from './units';

export interface SvgOptions {
	theme: RenderMode;
	showDimensions: boolean;
	showOverallChains: boolean;
	showRoomLabels: boolean;
	showFurnitureLabels: boolean;
	showFinishes: boolean;
	title: string;
}

interface Palette {
	bg: string;
	wall: string;
	room: string;
	line: string;
	text: string;
	furniture: string;
}

const PAL: Record<RenderMode, Palette> = {
	blueprint: { bg: '#0b3d91', wall: '#ffffff', room: 'none', line: '#cfe0ff', text: '#ffffff', furniture: 'none' },
	line: { bg: '#ffffff', wall: '#111418', room: 'none', line: '#20242b', text: '#111418', furniture: 'none' },
	color: { bg: '#f4f5f7', wall: '#3a3f47', room: '#eef1f5', line: '#0b3d91', text: '#1a1d23', furniture: '#ffffff' },
};

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);
const n = (v: number) => Math.round(v * 100) / 100;

function wallPoly(a: Vec, b: Vec, t: number): string {
	const nv = segmentNormal(a, b);
	const h = t / 2;
	const p = [
		[a.x + nv.x * h, a.y + nv.y * h],
		[b.x + nv.x * h, b.y + nv.y * h],
		[b.x - nv.x * h, b.y - nv.y * h],
		[a.x - nv.x * h, a.y - nv.y * h],
	];
	return p.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
}

function dimSvg(seg: DimSegment, pal: Palette, fs: number): string {
	const nv = segmentNormal(seg.a, seg.b);
	const tick = 5;
	return (
		`<line x1="${n(seg.a.x)}" y1="${n(seg.a.y)}" x2="${n(seg.b.x)}" y2="${n(seg.b.y)}" stroke="${pal.line}" stroke-width="1"/>` +
		`<line x1="${n(seg.a.x - nv.x * tick)}" y1="${n(seg.a.y - nv.y * tick)}" x2="${n(seg.a.x + nv.x * tick)}" y2="${n(seg.a.y + nv.y * tick)}" stroke="${pal.line}" stroke-width="1"/>` +
		`<line x1="${n(seg.b.x - nv.x * tick)}" y1="${n(seg.b.y - nv.y * tick)}" x2="${n(seg.b.x + nv.x * tick)}" y2="${n(seg.b.y + nv.y * tick)}" stroke="${pal.line}" stroke-width="1"/>` +
		`<text x="${n(seg.mid.x)}" y="${n(seg.mid.y)}" font-size="${fs}" fill="${pal.text}" text-anchor="middle" transform="rotate(${n(seg.angleDeg)} ${n(seg.mid.x)} ${n(seg.mid.y)})">${esc(seg.label)}</text>`
	);
}

/** Серіалізує сцену у SVG (1 одиниця = 1 см, тож масштаб реальний). */
export function sceneToSVG(scene: Scene, opts: SvgOptions): string {
	const pal = PAL[opts.theme];
	const bbox = sceneBBox(scene);
	const M = 140;
	const minX = isFinite(bbox.minX) ? bbox.minX - M : 0;
	const minY = isFinite(bbox.minY) ? bbox.minY - M : 0;
	const w = isFinite(bbox.maxX) ? bbox.maxX - bbox.minX + M * 2 : 600;
	const h = isFinite(bbox.maxY) ? bbox.maxY - bbox.minY + M * 2 : 600;
	const fs = 13;
	const parts: string[] = [];

	parts.push(`<rect x="${n(minX)}" y="${n(minY)}" width="${n(w)}" height="${n(h)}" fill="${pal.bg}"/>`);

	// rooms
	if (opts.showFinishes && opts.theme === 'color') {
		for (const r of scene.rooms) {
			if (r.points.length < 3) continue;
			const fill = r.floor.kind !== 'none' ? r.floor.color : pal.room;
			parts.push(`<polygon points="${r.points.map((p) => `${n(p.x)},${n(p.y)}`).join(' ')}" fill="${fill}" fill-opacity="0.5"/>`);
		}
		for (const sf of scene.surfaces) {
			parts.push(`<polygon points="${sf.points.map((p) => `${n(p.x)},${n(p.y)}`).join(' ')}" fill="${sf.color}" fill-opacity="0.45" stroke="${pal.line}" stroke-dasharray="6 4" stroke-width="1"/>`);
		}
	}

	// walls
	for (const wl of scene.walls) {
		parts.push(`<polygon points="${wallPoly(wl.a, wl.b, wl.thickness)}" fill="${pal.wall === 'none' ? 'none' : pal.wall}" stroke="${pal.wall}" stroke-width="1"/>`);
	}
	// wall joints
	for (const wl of scene.walls) {
		parts.push(`<circle cx="${n(wl.a.x)}" cy="${n(wl.a.y)}" r="${n(wl.thickness / 2)}" fill="${pal.wall}"/>`);
		parts.push(`<circle cx="${n(wl.b.x)}" cy="${n(wl.b.y)}" r="${n(wl.thickness / 2)}" fill="${pal.wall}"/>`);
	}

	// openings — просто білий проріз + символ
	for (const o of scene.openings) {
		const wl = scene.walls.find((x) => x.id === o.wallId);
		if (!wl) continue;
		const dx = wl.b.x - wl.a.x;
		const dy = wl.b.y - wl.a.y;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const c = { x: wl.a.x + ux * o.offset, y: wl.a.y + uy * o.offset };
		const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
		parts.push(
			`<g transform="translate(${n(c.x)} ${n(c.y)}) rotate(${n(ang)})">` +
				`<rect x="${n(-o.width / 2)}" y="${n(-wl.thickness / 2 - 1)}" width="${n(o.width)}" height="${n(wl.thickness + 2)}" fill="${pal.bg}"/>` +
				(o.type === 'window'
					? `<line x1="${n(-o.width / 2)}" y1="0" x2="${n(o.width / 2)}" y2="0" stroke="${pal.wall}" stroke-width="1"/>`
					: `<path d="M ${n(-o.width / 2)} 0 A ${n(o.width)} ${n(o.width)} 0 0 1 ${n(-o.width / 2)} ${n(o.width)}" fill="none" stroke="${pal.wall}" stroke-width="1" stroke-dasharray="4 3"/>`) +
				`</g>`,
		);
	}

	// furniture
	for (const f of scene.furniture) {
		parts.push(
			`<g transform="translate(${n(f.x)} ${n(f.y)}) rotate(${n(f.rotation)})">` +
				`<rect x="${n(-f.w / 2)}" y="${n(-f.d / 2)}" width="${n(f.w)}" height="${n(f.d)}" fill="${opts.theme === 'color' && f.color ? f.color : 'none'}" fill-opacity="0.6" stroke="${pal.wall}" stroke-width="1"/>` +
				(opts.showFurnitureLabels && f.label ? `<text x="0" y="0" font-size="${fs - 2}" fill="${pal.text}" text-anchor="middle">${esc(f.label)}</text>` : '') +
				`</g>`,
		);
	}

	// dimensions
	if (opts.showDimensions) {
		for (const d of wallDimensions(scene, scene.settings.units)) parts.push(dimSvg(d, pal, fs));
		for (const d of manualDimensions(scene, scene.settings.units)) parts.push(dimSvg(d, pal, fs));
	}
	if (opts.showOverallChains) {
		for (const chain of overallChains(scene, scene.settings.units)) {
			for (const seg of [...chain.segments, chain.total]) parts.push(dimSvg(seg, pal, fs));
		}
	}

	// room labels
	if (opts.showRoomLabels) {
		for (const r of roomLabels(scene)) {
			parts.push(`<text x="${n(r.at.x)}" y="${n(r.at.y - 8)}" font-size="${fs + 1}" font-weight="bold" fill="${pal.text}" text-anchor="middle">${esc(r.name)}</text>`);
			parts.push(`<text x="${n(r.at.x)}" y="${n(r.at.y + 12)}" font-size="${fs - 2}" fill="${pal.text}" text-anchor="middle">${esc(r.areaText)}</text>`);
		}
	}

	// texts
	for (const t of scene.texts) {
		parts.push(`<text x="${n(t.x)}" y="${n(t.y + t.size)}" font-size="${n(t.size)}" fill="${pal.text}" transform="rotate(${n(t.rotation)} ${n(t.x)} ${n(t.y)})">${esc(t.text)}</text>`);
	}

	// compass
	if (scene.compass) {
		const cc = scene.compass;
		parts.push(
			`<g transform="translate(${n(cc.x)} ${n(cc.y)}) rotate(${n(cc.rotation)})">` +
				`<circle r="34" fill="none" stroke="${pal.text}" stroke-width="1.2"/>` +
				`<polygon points="0,25 -9,0 0,-25 9,0" fill="${pal.text}"/>` +
				`<text x="0" y="-42" font-size="11" fill="${pal.text}" text-anchor="middle">Пн</text>` +
				`</g>`,
		);
	}

	// штамп
	const total = formatAreaM2(roomLabels(scene).reduce((s2, r) => s2 + r.areaM2, 0));
	parts.push(
		`<g transform="translate(${n(minX + 20)} ${n(minY + h - 90)})">` +
			`<rect width="320" height="70" fill="${pal.bg}" stroke="${pal.line}" stroke-width="1"/>` +
			`<text x="12" y="22" font-size="15" font-weight="bold" fill="${pal.text}">${esc(opts.title || scene.settings.title)}</text>` +
			`<text x="12" y="42" font-size="11" fill="${pal.text}">Дата: ${new Date().toLocaleDateString('uk-UA')}</text>` +
			`<text x="12" y="58" font-size="11" fill="${pal.text}">Загальна площа: ${esc(total)}</text>` +
			`</g>`,
	);

	return (
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(minX)} ${n(minY)} ${n(w)} ${n(h)}" width="${n(w)}" height="${n(h)}">\n` +
		parts.join('\n') +
		`\n</svg>\n`
	);
}
