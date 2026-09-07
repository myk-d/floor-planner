import type { Scene } from './scene';

const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];

export interface CircuitGroup {
	circuit: string;
	color: string;
	symbolIds: string[];
	routeIds: string[];
	count: number;
}

/** Групує символи й лінії за полем `circuit`, призначає стабільний колір кожній групі. */
export function circuitGroups(scene: Scene): CircuitGroup[] {
	const names = new Set<string>();
	scene.symbols.forEach((s) => s.circuit && names.add(s.circuit));
	scene.routes.forEach((r) => r.circuit && names.add(r.circuit));
	const sorted = [...names].sort((a, b) => a.localeCompare(b, 'uk'));
	return sorted.map((circuit, i) => ({
		circuit,
		color: PALETTE[i % PALETTE.length],
		symbolIds: scene.symbols.filter((s) => s.circuit === circuit).map((s) => s.id),
		routeIds: scene.routes.filter((r) => r.circuit === circuit).map((r) => r.id),
		count: scene.symbols.filter((s) => s.circuit === circuit).length + scene.routes.filter((r) => r.circuit === circuit).length,
	}));
}

/** Мапа id елемента → колір групи (для colorByCircuit-рендеру). */
export function circuitColorMap(scene: Scene): Map<string, string> {
	const map = new Map<string, string>();
	for (const g of circuitGroups(scene)) {
		g.symbolIds.forEach((id) => map.set(id, g.color));
		g.routeIds.forEach((id) => map.set(id, g.color));
	}
	return map;
}
