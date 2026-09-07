import { nanoid } from 'nanoid';

/**
 * Уся геометрія сцени зберігається в САНТИМЕТРАХ у світових координатах (world-space).
 * Вісь Y спрямована вниз (як у canvas). Перетворення у пікселі робить в'юпорт (`view`).
 */
export interface Vec {
	x: number;
	y: number;
}

export type WallMaterial = 'block' | 'brick' | 'concrete' | 'drywall' | 'wood' | 'glass';

/** Стан елемента для режиму «до/після ремонту». */
export type BuildStatus = 'existing' | 'demolish' | 'new';

export interface Wall {
	id: string;
	a: Vec;
	b: Vec;
	/** товщина в см */
	thickness: number;
	material: WallMaterial;
	/** дефолт 'existing' */
	status?: BuildStatus;
}

export type FloorKind = 'none' | 'parquet' | 'laminate' | 'tile' | 'carpet' | 'concrete';

export interface RoomFloor {
	kind: FloorKind;
	color: string;
}

export interface Room {
	id: string;
	/** полігон вершин у порядку обходу */
	points: Vec[];
	name: string;
	floor: RoomFloor;
	/** висота стелі, см; якщо не задано — береться `settings.wallHeight` */
	ceilingHeight?: number;
}

export type OpeningType = 'door' | 'window' | 'opening';

export interface Opening {
	id: string;
	wallId: string;
	/** відстань уздовж стіни від точки `a` до ЦЕНТРА отвору, см */
	offset: number;
	/** ширина отвору, см */
	width: number;
	type: OpeningType;
	/** для дверей — у який бік відкривається */
	flip: boolean;
	/** дефолт 'existing' */
	status?: BuildStatus;
	/** висота підвіконня / низу отвору, см (для розгорток і 3D) */
	sill?: number;
	/** висота верху отвору, см */
	head?: number;
}

export interface Furniture {
	id: string;
	kind: string;
	/** центр елемента, см */
	x: number;
	y: number;
	/** градуси, за годинниковою */
	rotation: number;
	/** ширина (вздовж локальної X), см */
	w: number;
	/** глибина (вздовж локальної Y), см */
	d: number;
	/** висота, см (для 3D та розгорток) — опційно, дефолт з `furnitureHeight` */
	h?: number;
	label: string;
	color: string;
}

/** Кольорова зона підлоги без стін (килим, зона плитки тощо). */
export interface Surface {
	id: string;
	points: Vec[];
	kind: FloorKind;
	color: string;
	name: string;
}

export interface TextLabel {
	id: string;
	x: number;
	y: number;
	text: string;
	/** висота шрифту, см */
	size: number;
	rotation: number;
}

export interface DimLine {
	id: string;
	a: Vec;
	b: Vec;
	/** зсув винесеної лінії від осі a→b, см (знак = сторона) */
	offset: number;
}

/** Інженерний символ-штамп: розетка, вимикач, світильник, радіатор, вивід води тощо. */
export interface SymbolItem {
	id: string;
	kind: string;
	/** центр, см */
	x: number;
	y: number;
	rotation: number;
	/** якщо прив'язаний до стіни */
	wallId?: string;
	/** зсув уздовж стіни від точки a, см */
	offset?: number;
	/** група/лінія живлення — для авто-кольору */
	circuit?: string;
}

export type RouteKind = 'wire' | 'pipe-cold' | 'pipe-hot' | 'pipe-sewer' | 'heat-supply' | 'heat-return';

/** Лінія розведення: кабель або труба. */
export interface Route {
	id: string;
	kind: RouteKind;
	points: Vec[];
	/** переріз кабелю (мм²) / діаметр труби (Ø мм) */
	gauge?: string;
	circuit?: string;
}

export type ZoneKind = 'heat-cable' | 'heat-water' | 'screed' | 'plaster' | 'insulation' | 'waterproofing';

/** Ремонтна зона (тепла підлога, стяжка, штукатурка, утеплення, гідроізоляція). */
export interface Zone {
	id: string;
	points: Vec[];
	kind: ZoneKind;
}

/** Компас/північ — один на сцену. */
export interface Compass {
	x: number;
	y: number;
	rotation: number;
}

/** Збережений набір оздоблення. */
export interface Styleboard {
	id: string;
	name: string;
	floor: RoomFloor;
	wallMaterial: WallMaterial;
}

export type Units = 'm' | 'cm' | 'mm';
export type RenderMode = 'line' | 'blueprint' | 'color';

export type LayerName = 'construction' | 'openings' | 'furniture' | 'engineering' | 'dimensions' | 'labels';

export interface LayerState {
	visible: boolean;
	locked: boolean;
}

export type Layers = Record<LayerName, LayerState>;

export interface SceneSettings {
	units: Units;
	/** крок сітки, см */
	grid: number;
	/** товщина стіни за замовчуванням, см */
	defaultWallThickness: number;
	/** матеріал стіни за замовчуванням */
	defaultWallMaterial: WallMaterial;
	/** висота стін, см (для 3D / розгорток / експорту) */
	wallHeight: number;
	renderMode: RenderMode;
	/** показувати скумулятивні ланцюги розмірів по периметру */
	showOverallChains: boolean;
	/** режим «до/після ремонту» — підсвічувати demolish/new */
	showDemolition: boolean;
	/** фарбувати інженерні символи й лінії за групою (circuit) */
	colorByCircuit: boolean;
	layers: Layers;
	/** назва проєкту (дублюється в документі, зручно мати в сцені для експорту) */
	title: string;
}

export interface Scene {
	walls: Wall[];
	rooms: Room[];
	surfaces: Surface[];
	openings: Opening[];
	furniture: Furniture[];
	texts: TextLabel[];
	dims: DimLine[];
	symbols: SymbolItem[];
	routes: Route[];
	zones: Zone[];
	styleboards: Styleboard[];
	compass: Compass | null;
	settings: SceneSettings;
}

export const DEFAULT_FLOOR: RoomFloor = { kind: 'none', color: '#e8dcc8' };

export const DEFAULT_LAYERS: Layers = {
	construction: { visible: true, locked: false },
	openings: { visible: true, locked: false },
	furniture: { visible: true, locked: false },
	engineering: { visible: true, locked: false },
	dimensions: { visible: true, locked: false },
	labels: { visible: true, locked: false },
};

export const DEFAULT_SETTINGS: SceneSettings = {
	units: 'm',
	grid: 10,
	defaultWallThickness: 10,
	defaultWallMaterial: 'block',
	wallHeight: 270,
	renderMode: 'color',
	showOverallChains: false,
	showDemolition: false,
	colorByCircuit: false,
	layers: DEFAULT_LAYERS,
	title: 'Без назви',
};

function cloneLayers(layers: Layers): Layers {
	return Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, { ...v }])) as Layers;
}

export function emptyScene(title = 'Без назви'): Scene {
	return {
		walls: [],
		rooms: [],
		surfaces: [],
		openings: [],
		furniture: [],
		texts: [],
		dims: [],
		symbols: [],
		routes: [],
		zones: [],
		styleboards: [],
		compass: null,
		settings: { ...DEFAULT_SETTINGS, layers: cloneLayers(DEFAULT_LAYERS), title },
	};
}

interface LegacyScene extends Partial<Omit<Scene, 'walls' | 'openings'>> {
	walls?: (Partial<Wall> & { a: Vec; b: Vec })[];
	openings?: (Partial<Opening> & { wallId: string })[];
	heatZones?: { id: string; points: Vec[]; mode: 'cable' | 'water' }[];
}

/**
 * Заповнює відсутні поля сцени дефолтами — Firestore-документ може бути з попередньої версії схеми.
 */
export function normalizeScene(raw: LegacyScene | undefined, title: string): Scene {
	const base = emptyScene(title);
	if (!raw) return base;
	const rawSettings = (raw.settings ?? {}) as Partial<SceneSettings>;

	const legacyZones: Zone[] = (raw.heatZones ?? []).map((z) => ({
		id: z.id,
		points: z.points,
		kind: z.mode === 'water' ? 'heat-water' : 'heat-cable',
	}));

	return {
		walls: (raw.walls ?? []).map((w) => ({
			id: w.id ?? newId(),
			a: w.a,
			b: w.b,
			thickness: w.thickness ?? base.settings.defaultWallThickness,
			material: w.material ?? 'block',
			status: w.status ?? 'existing',
		})),
		rooms: (raw.rooms ?? []).map((r) => ({ ...r, floor: r.floor ?? { ...DEFAULT_FLOOR } })),
		surfaces: raw.surfaces ?? base.surfaces,
		openings: (raw.openings ?? []).map((o) => ({
			id: o.id ?? newId(),
			wallId: o.wallId,
			offset: o.offset ?? 0,
			width: o.width ?? 90,
			type: o.type ?? 'door',
			flip: o.flip ?? false,
			status: o.status ?? 'existing',
			sill: o.sill,
			head: o.head,
		})),
		furniture: raw.furniture ?? base.furniture,
		texts: raw.texts ?? base.texts,
		dims: raw.dims ?? base.dims,
		symbols: raw.symbols ?? base.symbols,
		routes: raw.routes ?? base.routes,
		zones: raw.zones ?? legacyZones,
		styleboards: raw.styleboards ?? base.styleboards,
		compass: raw.compass ?? base.compass,
		settings: {
			...base.settings,
			...rawSettings,
			layers: { ...base.settings.layers, ...(rawSettings.layers ?? {}) },
			title,
		},
	};
}

export const newId = (): string => nanoid(10);

const wallOf = (a: Vec, b: Vec, thickness: number, material: WallMaterial): Wall => ({
	id: newId(),
	a,
	b,
	thickness,
	material,
	status: 'existing',
});

function roomFromCorners(corners: Vec[], thickness: number, material: WallMaterial, name: string) {
	const walls: Wall[] = corners.map((c, i) => wallOf(c, corners[(i + 1) % corners.length], thickness, material));
	const room: Room = { id: newId(), points: corners.map((c) => ({ ...c })), name, floor: { ...DEFAULT_FLOOR } };
	return { walls, room };
}

/** Прямокутна кімната з 4 стін + запис Room. */
export function makeRoomRect(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	thickness: number,
	name = 'Кімната',
	material: WallMaterial = 'block',
) {
	const minX = Math.min(x0, x1);
	const maxX = Math.max(x0, x1);
	const minY = Math.min(y0, y1);
	const maxY = Math.max(y0, y1);
	return roomFromCorners(
		[
			{ x: minX, y: minY },
			{ x: maxX, y: minY },
			{ x: maxX, y: maxY },
			{ x: minX, y: maxY },
		],
		thickness,
		material,
		name,
	);
}

/** L-подібна кімната: прямокутник w×h з вирізаним кутом notch×notch (нижній правий). */
export function makeRoomL(x: number, y: number, w: number, h: number, notch: number, thickness: number, material: WallMaterial = 'block') {
	return roomFromCorners(
		[
			{ x, y },
			{ x: x + w, y },
			{ x: x + w, y: y + h - notch },
			{ x: x + w - notch, y: y + h - notch },
			{ x: x + w - notch, y: y + h },
			{ x, y: y + h },
		],
		thickness,
		material,
		'Кімната',
	);
}

/** П-подібна кімната: прямокутник w×h з вирізаною виїмкою по центру знизу. */
export function makeRoomU(x: number, y: number, w: number, h: number, notchW: number, notchH: number, thickness: number, material: WallMaterial = 'block') {
	const nx0 = x + (w - notchW) / 2;
	const nx1 = nx0 + notchW;
	return roomFromCorners(
		[
			{ x, y },
			{ x: x + w, y },
			{ x: x + w, y: y + h },
			{ x: nx1, y: y + h },
			{ x: nx1, y: y + h - notchH },
			{ x: nx0, y: y + h - notchH },
			{ x: nx0, y: y + h },
			{ x, y: y + h },
		],
		thickness,
		material,
		'Кімната',
	);
}

/** Т-подібна кімната. */
export function makeRoomT(x: number, y: number, w: number, h: number, stemW: number, topH: number, thickness: number, material: WallMaterial = 'block') {
	const sx0 = x + (w - stemW) / 2;
	const sx1 = sx0 + stemW;
	return roomFromCorners(
		[
			{ x, y },
			{ x: x + w, y },
			{ x: x + w, y: y + topH },
			{ x: sx1, y: y + topH },
			{ x: sx1, y: y + h },
			{ x: sx0, y: y + h },
			{ x: sx0, y: y + topH },
			{ x, y: y + topH },
		],
		thickness,
		material,
		'Кімната',
	);
}
