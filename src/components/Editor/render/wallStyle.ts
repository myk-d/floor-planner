import type { FloorKind, WallMaterial } from '../../../domain/scene';
import { floorTint, WALL_MATERIAL_COLOR } from './hatch';
import type { RenderTheme } from './theme';

export interface HatchStyle {
	base: string;
	line: string;
	/** true — суцільна заливка `base`, без штриховки */
	solid: boolean;
}

export function wallStyle(theme: RenderTheme, material: WallMaterial, poche = false): HatchStyle {
	// poché — суцільно-чорні стіни (архітектурний стиль)
	if (poche) return { base: theme.name === 'blueprint' ? theme.wall : '#111418', line: '#111418', solid: true };
	// синє креслення — стіни завжди суцільно білі (схема)
	if (theme.name === 'blueprint') return { base: theme.wall, line: theme.wall, solid: true };
	const line = theme.name === 'color' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.5)';
	const base = theme.name === 'color' ? WALL_MATERIAL_COLOR[material] : '#ffffff';
	return { base, line, solid: material === 'block' };
}

/** #rrggbb → rgba(...,a); повертає вхід без змін, якщо не hex */
export function withAlpha(color: string, a: number): string {
	const m = color.match(/^#?([0-9a-f]{6})$/i);
	if (!m) return color;
	const n = parseInt(m[1], 16);
	return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function floorStyle(theme: RenderTheme, kind: FloorKind, color: string): HatchStyle {
	if (theme.name === 'color') return { base: floorTint(kind, color), line: 'rgba(0,0,0,0.14)', solid: false };
	if (theme.name === 'blueprint') return { base: 'rgba(255,255,255,0.05)', line: 'rgba(255,255,255,0.16)', solid: false };
	// лінійний режим: лише легкий відтінок обраного кольору + тонка штриховка, щоб не перекривати меблі
	return { base: withAlpha(floorTint(kind, color), 0.14), line: 'rgba(0,0,0,0.16)', solid: false };
}
