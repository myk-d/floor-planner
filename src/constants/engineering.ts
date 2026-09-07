import type { RouteKind, ZoneKind } from '../domain/scene';

export const ZONE_KINDS: { kind: ZoneKind; label: string; category: EngCategory; stroke: string; fill: string }[] = [
	{ kind: 'heat-cable', label: 'Тепла підлога (кабель)', category: 'Опалення', stroke: '#e8590c', fill: 'rgba(232,89,12,0.07)' },
	{ kind: 'heat-water', label: 'Тепла підлога (вода)', category: 'Опалення', stroke: '#dc2626', fill: 'rgba(220,38,38,0.07)' },
	{ kind: 'screed', label: 'Стяжка', category: 'Ремонт', stroke: '#6b7280', fill: 'rgba(107,114,128,0.10)' },
	{ kind: 'plaster', label: 'Штукатурка', category: 'Ремонт', stroke: '#a16207', fill: 'rgba(161,98,7,0.08)' },
	{ kind: 'insulation', label: 'Утеплення', category: 'Ремонт', stroke: '#0891b2', fill: 'rgba(8,145,178,0.08)' },
	{ kind: 'waterproofing', label: 'Гідроізоляція', category: 'Ремонт', stroke: '#1d4ed8', fill: 'rgba(29,78,216,0.10)' },
];

export const zoneLabel = (k: ZoneKind): string => ZONE_KINDS.find((z) => z.kind === k)?.label ?? k;
export const zoneStyle = (k: ZoneKind) => ZONE_KINDS.find((z) => z.kind === k) ?? ZONE_KINDS[0];

export type EngCategory = 'Електрика' | 'Сантехніка' | 'Опалення' | 'Ремонт';

export interface EngSymbol {
	kind: string;
	category: EngCategory;
	label: string;
	/** прив'язується до стіни за замовчуванням */
	onWall: boolean;
}

export const ENG_SYMBOLS: EngSymbol[] = [
	// Електрика
	{ kind: 'socket', category: 'Електрика', label: 'Розетка', onWall: true },
	{ kind: 'socket-double', category: 'Електрика', label: 'Подвійна розетка', onWall: true },
	{ kind: 'socket-quad', category: 'Електрика', label: 'Блок розеток', onWall: true },
	{ kind: 'socket-waterproof', category: 'Електрика', label: 'Волога розетка', onWall: true },
	{ kind: 'socket-floor', category: 'Електрика', label: 'Розетка в підлозі', onWall: false },
	{ kind: 'switch-1', category: 'Електрика', label: 'Вимикач', onWall: true },
	{ kind: 'switch-2', category: 'Електрика', label: 'Вимикач 2-кл', onWall: true },
	{ kind: 'switch-3', category: 'Електрика', label: 'Вимикач 3-кл', onWall: true },
	{ kind: 'switch-pass', category: 'Електрика', label: 'Прохідний', onWall: true },
	{ kind: 'dimmer', category: 'Електрика', label: 'Димер', onWall: true },
	{ kind: 'light-ceiling', category: 'Електрика', label: 'Люстра', onWall: false },
	{ kind: 'light-spot', category: 'Електрика', label: 'Точковий світильник', onWall: false },
	{ kind: 'light-wall', category: 'Електрика', label: 'Бра', onWall: true },
	{ kind: 'panel', category: 'Електрика', label: 'Електрощит', onWall: true },
	{ kind: 'junction-box', category: 'Електрика', label: 'Розподільна коробка', onWall: false },

	// Сантехніка
	{ kind: 'water-cold', category: 'Сантехніка', label: 'Вивід холодної води', onWall: true },
	{ kind: 'water-hot', category: 'Сантехніка', label: 'Вивід гарячої води', onWall: true },
	{ kind: 'sewer-out', category: 'Сантехніка', label: 'Вивід каналізації', onWall: true },
	{ kind: 'riser', category: 'Сантехніка', label: 'Стояк', onWall: false },
	{ kind: 'floor-drain', category: 'Сантехніка', label: 'Трап', onWall: false },
	{ kind: 'manifold', category: 'Сантехніка', label: 'Колектор', onWall: true },

	// Опалення
	{ kind: 'radiator-bimetal', category: 'Опалення', label: 'Радіатор біметал', onWall: true },
	{ kind: 'radiator-steel', category: 'Опалення', label: 'Радіатор сталевий', onWall: true },
	{ kind: 'radiator-castiron', category: 'Опалення', label: 'Радіатор чавунний', onWall: true },
	{ kind: 'radiator-tubular', category: 'Опалення', label: 'Радіатор трубчастий', onWall: true },
	{ kind: 'radiator-vertical', category: 'Опалення', label: 'Радіатор вертикальний', onWall: true },
	{ kind: 'convector-floor', category: 'Опалення', label: 'Внутрішньопідлоговий конвектор', onWall: false },
	{ kind: 'thermostat', category: 'Опалення', label: 'Термостат', onWall: true },
];

export const ENG_CATEGORIES: EngCategory[] = ['Електрика', 'Сантехніка', 'Опалення', 'Ремонт'];

/** Типова висота монтажу символу від підлоги, см. `ceilingCm` — для стельових. */
export function symbolMountHeight(kind: string, ceilingCm = 270): number {
	const H: Record<string, number> = {
		socket: 30,
		'socket-double': 30,
		'socket-quad': 30,
		'socket-waterproof': 110,
		'socket-floor': 3,
		'switch-1': 90,
		'switch-2': 90,
		'switch-3': 90,
		'switch-pass': 90,
		dimmer: 90,
		'light-wall': 200,
		panel: 150,
		'junction-box': ceilingCm - 20,
		'water-cold': 60,
		'water-hot': 60,
		'sewer-out': 15,
		'floor-drain': 0,
		manifold: 60,
		riser: 0,
		'radiator-bimetal': 12,
		'radiator-steel': 12,
		'radiator-castiron': 12,
		'radiator-tubular': 12,
		'radiator-vertical': 40,
		'convector-floor': 0,
		thermostat: 90,
	};
	if (kind === 'light-ceiling' || kind === 'light-spot') return ceilingCm;
	return H[kind] ?? 30;
}

/** true — символ монтується на стелі (позначку висоти показуємо як «стеля»). */
export const isCeilingSymbol = (kind: string): boolean => kind === 'light-ceiling' || kind === 'light-spot';

export interface RouteStyle {
	kind: RouteKind;
	label: string;
	color: string;
	width: number; // px
	dash?: number[];
	category: EngCategory;
}

export const ROUTE_STYLES: RouteStyle[] = [
	{ kind: 'wire', label: 'Кабель', color: '#e8590c', width: 1.5, dash: [7, 4], category: 'Електрика' },
	{ kind: 'pipe-cold', label: 'Труба холодної води', color: '#1d4ed8', width: 2.5, category: 'Сантехніка' },
	{ kind: 'pipe-hot', label: 'Труба гарячої води', color: '#dc2626', width: 2.5, category: 'Сантехніка' },
	{ kind: 'pipe-sewer', label: 'Каналізація', color: '#6b7280', width: 4, category: 'Сантехніка' },
	{ kind: 'heat-supply', label: 'Подача опалення', color: '#dc2626', width: 2, dash: [10, 3], category: 'Опалення' },
	{ kind: 'heat-return', label: 'Зворотка опалення', color: '#1d4ed8', width: 2, dash: [10, 3], category: 'Опалення' },
];

export const routeStyle = (kind: RouteKind): RouteStyle =>
	ROUTE_STYLES.find((r) => r.kind === kind) ?? ROUTE_STYLES[0];

export const engSymbolLabel = (kind: string): string =>
	ENG_SYMBOLS.find((s) => s.kind === kind)?.label ?? kind;
