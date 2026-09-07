import { engSymbolLabel, routeStyle } from '../constants/engineering';
import { distance } from './geometry';
import type { Scene } from './scene';

export interface SpecRow {
	label: string;
	qty: number;
	unit: 'шт' | 'м';
}

/** Специфікація інженерних мереж: символи за типом (шт), лінії за типом+перерізом (м). */
export function engineeringSpec(scene: Scene): { symbols: SpecRow[]; routes: SpecRow[] } {
	const byKind = new Map<string, number>();
	for (const s of scene.symbols) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
	const symbols: SpecRow[] = [...byKind.entries()]
		.map(([kind, qty]) => ({ label: engSymbolLabel(kind), qty, unit: 'шт' as const }))
		.sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label, 'uk'));

	const byRoute = new Map<string, { label: string; m: number }>();
	for (const r of scene.routes) {
		let lenCm = 0;
		for (let i = 0; i < r.points.length - 1; i++) lenCm += distance(r.points[i], r.points[i + 1]);
		const gauge = r.gauge?.trim();
		const key = `${r.kind}|${gauge ?? ''}`;
		const label = gauge ? `${routeStyle(r.kind).label}, ${gauge}` : routeStyle(r.kind).label;
		const row = byRoute.get(key);
		if (row) row.m += lenCm / 100;
		else byRoute.set(key, { label, m: lenCm / 100 });
	}
	const routes: SpecRow[] = [...byRoute.values()]
		.map((r) => ({ label: r.label, qty: Math.round(r.m * 10) / 10, unit: 'м' as const }))
		.sort((a, b) => b.qty - a.qty || a.label.localeCompare(b.label, 'uk'));

	return { symbols, routes };
}
