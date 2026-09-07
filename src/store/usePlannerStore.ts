import { create } from 'zustand';
import { bboxOf, rotatePoint, sceneBBox } from '../domain/geometry';
import type { BBox } from '../domain/geometry';
import { detectRooms, reconcileRooms } from '../domain/rooms';
import { moveNode, splitWall } from '../domain/walls';
import {
	DEFAULT_FLOOR,
	makeRoomL,
	makeRoomRect,
	makeRoomT,
	makeRoomU,
	newId,
	normalizeScene,
	type BuildStatus,
	type DimLine,
	type FloorKind,
	type Furniture,
	type LayerName,
	type Opening,
	type OpeningType,
	type RenderMode,
	type Room,
	type RoomFloor,
	type Route,
	type RouteKind,
	type Scene,
	type Surface,
	type SymbolItem,
	type TextLabel,
	type Units,
	type Vec,
	type Wall,
	type WallMaterial,
	type Zone,
	type ZoneKind,
} from '../domain/scene';
import type { ProjectDoc } from '../services/projects.service';
import { catalogByKind } from '../constants/catalog';
import { ENG_SYMBOLS } from '../constants/engineering';

export type Tool =
	| 'select'
	| 'wall'
	| 'room'
	| 'room-poly'
	| 'room-l'
	| 'room-u'
	| 'room-t'
	| 'surface'
	| 'door'
	| 'window'
	| 'opening'
	| 'demolish'
	| 'text'
	| 'dimension'
	| 'measure'
	| 'symbol'
	| 'wire'
	| 'pipe'
	| 'zone'
	| 'compass'
	| 'pan';

export type SelectableType =
	| 'wall'
	| 'room'
	| 'surface'
	| 'furniture'
	| 'opening'
	| 'text'
	| 'dim'
	| 'symbol'
	| 'route'
	| 'zone'
	| 'compass';

export interface View {
	/** пікселів на сантиметр */
	scale: number;
	offsetX: number;
	offsetY: number;
}

export interface Selection {
	id: string;
	type: SelectableType;
}

type BucketKey = Exclude<SelectableType, 'compass'>;

function buckets(d: Scene): Record<BucketKey, { id: string }[]> {
	return {
		wall: d.walls,
		room: d.rooms,
		furniture: d.furniture,
		opening: d.openings,
		text: d.texts,
		dim: d.dims,
		symbol: d.symbols,
		route: d.routes,
		zone: d.zones,
		surface: d.surfaces,
	};
}

/** Шар, до якого належить тип елемента (для visible/locked). */
export function layerOf(type: SelectableType): LayerName {
	switch (type) {
		case 'wall':
			return 'construction';
		case 'opening':
			return 'openings';
		case 'furniture':
			return 'furniture';
		case 'symbol':
		case 'route':
		case 'zone':
			return 'engineering';
		case 'dim':
			return 'dimensions';
		case 'room':
		case 'surface':
		case 'text':
		case 'compass':
			return 'labels';
	}
}

interface PlannerState {
	projectId: string | null;
	scene: Scene;
	tool: Tool;
	/** для інструментів symbol/wire/pipe — що саме ставимо */
	pendingKind: string | null;
	selected: Selection[];
	clipboard: { items: unknown[]; types: SelectableType[] } | null;
	view: View;
	showGrid: boolean;
	snapEnabled: boolean;
	stageSize: { width: number; height: number };
	dirty: boolean;
	past: Scene[];
	future: Scene[];
	wallDraft: Vec[] | null;
	measureDraft: { a: Vec; b: Vec } | null;
	dragSnapshot: Scene | null;
	elevationWallId: string | null;
	view3d: boolean;

	loadProject: (doc: ProjectDoc) => void;
	markSaved: () => void;

	setTool: (tool: Tool, pendingKind?: string | null) => void;
	select: (sel: Selection | null, additive?: boolean) => void;
	selectMany: (list: Selection[]) => void;
	clearSelection: () => void;
	setView: (view: Partial<View>) => void;
	zoomAt: (factor: number, screen: Vec) => void;
	fitToScene: (stageW: number, stageH: number) => void;
	/** Вписати вибране в екран; якщо нічого не вибрано — усю сцену. */
	frameSelection: (stageW: number, stageH: number) => void;
	toggleGrid: () => void;
	toggleSnap: () => void;
	setStageSize: (size: { width: number; height: number }) => void;
	setUnits: (units: Units) => void;
	setGridStep: (grid: number) => void;
	setTitle: (title: string) => void;
	setRenderMode: (mode: RenderMode) => void;
	toggleOverallChains: () => void;
	toggleLayerVisible: (layer: LayerName) => void;
	toggleLayerLocked: (layer: LayerName) => void;

	undo: () => void;
	redo: () => void;
	commit: (mutate: (draft: Scene) => void) => void;

	setWallDraft: (points: Vec[] | null) => void;
	setMeasureDraft: (m: { a: Vec; b: Vec } | null) => void;
	commitWallChain: (points: Vec[]) => void;
	addRoomRect: (x0: number, y0: number, x1: number, y1: number) => void;
	addRoomPoly: (points: Vec[]) => void;
	addOpening: (wallId: string, offset: number, type: OpeningType) => void;
	addFurniture: (kind: string, world: Vec) => void;
	addText: (world: Vec) => void;
	addDim: (a: Vec, b: Vec) => void;

	patchSelected: (patch: Record<string, unknown>) => void;
	patchElement: (sel: Selection, patch: Record<string, unknown>) => void;
	deleteSelected: () => void;
	duplicateSelected: () => void;
	moveSelected: (dx: number, dy: number) => void;
	nudgeSelected: (dx: number, dy: number) => void;
	alignSelected: (edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
	copySelection: () => void;
	paste: (offset?: Vec) => void;

	beginDrag: () => void;
	dragElementTo: (anchor: Selection, x: number, y: number) => void;
	endDrag: () => void;

	addSymbol: (kind: string, at: Vec, wall?: { wallId: string; offset: number }) => void;
	addRoute: (kind: RouteKind, points: Vec[]) => void;
	addZone: (points: Vec[], kind: ZoneKind) => void;
	addSurface: (points: Vec[], kind: FloorKind) => void;
	transformFurniture: (id: string, patch: Partial<Pick<Furniture, 'x' | 'y' | 'rotation' | 'w' | 'd'>>) => void;
	cycleStatus: (sel: Selection) => void;
	setRouteGauge: (id: string, gauge: string) => void;
	toggleDemolition: () => void;
	toggleColorByCircuit: () => void;
	setWallHeight: (cm: number) => void;
	addRoomPreset: (kind: 'rect' | 'L' | 'U' | 'T', at: Vec) => void;
	saveStyleboard: (name: string) => void;
	deleteStyleboard: (id: string) => void;
	applyStyleboard: (id: string) => void;
	openElevation: (wallId: string) => void;
	closeElevation: () => void;
	toggle3d: () => void;
	addCompass: (at: Vec) => void;
	addCompassAtViewCenter: () => void;

	moveWallNode: (from: Vec, to: Vec) => void;
	splitWallAt: (wallId: string, at: Vec) => void;
	autoDetectRooms: () => void;

	setRoomFloor: (id: string, floor: Partial<RoomFloor>) => void;
	setWallMaterial: (ids: string[], material: WallMaterial) => void;
	setWallThickness: (ids: string[], cm: number) => void;
	setDefaultWall: (patch: Partial<{ thickness: number; material: WallMaterial }>) => void;
}

const HISTORY_CAP = 60;
const clone = <T>(s: T): T => structuredClone(s);

export const primarySelection = (s: PlannerState): Selection | null => (s.selected.length === 1 ? s.selected[0] : null);
export const selectedIdSet = (s: PlannerState): Set<string> => new Set(s.selected.map((x) => x.id));

function moveElementBy(d: Scene, sel: Selection, dx: number, dy: number) {
	const shift = (p: Vec): Vec => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) });
	switch (sel.type) {
		case 'wall': {
			const w = d.walls.find((x) => x.id === sel.id);
			if (w) {
				w.a = shift(w.a);
				w.b = shift(w.b);
			}
			break;
		}
		case 'room': {
			const r = d.rooms.find((x) => x.id === sel.id);
			if (r) r.points = r.points.map(shift);
			break;
		}
		case 'dim': {
			const x = d.dims.find((e) => e.id === sel.id);
			if (x) {
				x.a = shift(x.a);
				x.b = shift(x.b);
			}
			break;
		}
		case 'route': {
			const x = d.routes.find((e) => e.id === sel.id);
			if (x) x.points = x.points.map(shift);
			break;
		}
		case 'zone': {
			const x = d.zones.find((e) => e.id === sel.id);
			if (x) x.points = x.points.map(shift);
			break;
		}
		case 'surface': {
			const x = d.surfaces.find((e) => e.id === sel.id);
			if (x) x.points = x.points.map(shift);
			break;
		}
		case 'furniture': {
			const x = d.furniture.find((e) => e.id === sel.id);
			if (x) {
				x.x = Math.round(x.x + dx);
				x.y = Math.round(x.y + dy);
			}
			break;
		}
		case 'text': {
			const x = d.texts.find((e) => e.id === sel.id);
			if (x) {
				x.x = Math.round(x.x + dx);
				x.y = Math.round(x.y + dy);
			}
			break;
		}
		case 'symbol': {
			const x = d.symbols.find((e) => e.id === sel.id);
			if (x) {
				x.x = Math.round(x.x + dx);
				x.y = Math.round(x.y + dy);
				x.wallId = undefined;
				x.offset = undefined;
			}
			break;
		}
		case 'compass': {
			if (d.compass) {
				d.compass.x = Math.round(d.compass.x + dx);
				d.compass.y = Math.round(d.compass.y + dy);
			}
			break;
		}
		case 'opening':
			break; // отвір рухається лише зсувом уздовж стіни
	}
}

/** Порахувати `view`, що вписує bbox у сцену з відступом. `null`, якщо bbox порожній. */
export function fitViewToBBox(bbox: BBox, stageW: number, stageH: number, pad = 140, maxScale = 4): View | null {
	const w = bbox.maxX - bbox.minX;
	const h = bbox.maxY - bbox.minY;
	if (!isFinite(w) || !isFinite(h) || w < 0 || h < 0) return null;
	const scale = Math.min((stageW - pad * 2) / (w || 1), (stageH - pad * 2) / (h || 1));
	const clamped = Math.min(maxScale, Math.max(0.03, scale));
	return {
		scale: clamped,
		offsetX: (stageW - w * clamped) / 2 - bbox.minX * clamped,
		offsetY: (stageH - h * clamped) / 2 - bbox.minY * clamped,
	};
}

/** Світові точки габариту одного вибраного елемента (для «вписати вибране»). */
export function selectionPoints(scene: Scene, sel: Selection): Vec[] {
	switch (sel.type) {
		case 'wall': {
			const w = scene.walls.find((x) => x.id === sel.id);
			return w ? [w.a, w.b] : [];
		}
		case 'room':
			return scene.rooms.find((x) => x.id === sel.id)?.points ?? [];
		case 'surface':
			return scene.surfaces.find((x) => x.id === sel.id)?.points ?? [];
		case 'zone':
			return scene.zones.find((x) => x.id === sel.id)?.points ?? [];
		case 'route':
			return scene.routes.find((x) => x.id === sel.id)?.points ?? [];
		case 'dim': {
			const d = scene.dims.find((x) => x.id === sel.id);
			return d ? [d.a, d.b] : [];
		}
		case 'furniture': {
			const f = scene.furniture.find((x) => x.id === sel.id);
			if (!f) return [];
			const c = { x: f.x, y: f.y };
			return [
				{ x: f.x - f.w / 2, y: f.y - f.d / 2 },
				{ x: f.x + f.w / 2, y: f.y - f.d / 2 },
				{ x: f.x + f.w / 2, y: f.y + f.d / 2 },
				{ x: f.x - f.w / 2, y: f.y + f.d / 2 },
			].map((p) => rotatePoint(p, c, f.rotation));
		}
		case 'text': {
			const t = scene.texts.find((x) => x.id === sel.id);
			return t ? [{ x: t.x, y: t.y }] : [];
		}
		case 'symbol': {
			const s = scene.symbols.find((x) => x.id === sel.id);
			if (!s) return [];
			return [
				{ x: s.x - 20, y: s.y - 20 },
				{ x: s.x + 20, y: s.y + 20 },
			];
		}
		case 'opening': {
			const o = scene.openings.find((x) => x.id === sel.id);
			const wall = o && scene.walls.find((w) => w.id === o.wallId);
			if (!o || !wall) return [];
			const wl = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y) || 1;
			const t = o.offset / wl;
			const c = { x: wall.a.x + (wall.b.x - wall.a.x) * t, y: wall.a.y + (wall.b.y - wall.a.y) * t };
			return [
				{ x: c.x - o.width / 2, y: c.y - o.width / 2 },
				{ x: c.x + o.width / 2, y: c.y + o.width / 2 },
			];
		}
		case 'compass':
			return scene.compass ? [{ x: scene.compass.x - 40, y: scene.compass.y - 40 }, { x: scene.compass.x + 40, y: scene.compass.y + 40 }] : [];
		default:
			return [];
	}
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
	projectId: null,
	scene: normalizeScene(undefined, 'Без назви'),
	tool: 'select',
	pendingKind: null,
	selected: [],
	clipboard: null,
	view: { scale: 0.4, offsetX: 200, offsetY: 120 },
	showGrid: true,
	snapEnabled: true,
	stageSize: { width: 0, height: 0 },
	dirty: false,
	past: [],
	future: [],
	wallDraft: null,
	measureDraft: null,
	dragSnapshot: null,
	elevationWallId: null,
	view3d: false,

	loadProject: (doc) =>
		set({
			projectId: doc.id,
			scene: normalizeScene(doc.scene, doc.name),
			selected: [],
			tool: 'select',
			pendingKind: null,
			past: [],
			future: [],
			dirty: false,
			wallDraft: null,
			measureDraft: null,
			dragSnapshot: null,
			elevationWallId: null,
		}),

	markSaved: () => set({ dirty: false }),

	setTool: (tool, pendingKind = null) =>
		set({ tool, pendingKind, wallDraft: null, measureDraft: null, selected: tool === 'select' ? get().selected : [] }),

	select: (sel, additive = false) => {
		if (!sel) return set({ selected: [] });
		const cur = get().selected;
		if (additive) {
			const exists = cur.some((s) => s.id === sel.id);
			return set({ selected: exists ? cur.filter((s) => s.id !== sel.id) : [...cur, sel] });
		}
		set({ selected: [sel] });
	},
	selectMany: (list) => set({ selected: list }),
	clearSelection: () => set({ selected: [] }),

	setView: (view) => set({ view: { ...get().view, ...view } }),

	zoomAt: (factor, screen) => {
		const { view } = get();
		const next = Math.min(4, Math.max(0.03, view.scale * factor));
		const k = next / view.scale;
		set({
			view: {
				scale: next,
				offsetX: screen.x - (screen.x - view.offsetX) * k,
				offsetY: screen.y - (screen.y - view.offsetY) * k,
			},
		});
	},

	fitToScene: (stageW, stageH) => {
		const next = fitViewToBBox(sceneBBox(get().scene), stageW, stageH);
		if (next) set({ view: next });
		else set({ view: { scale: 0.4, offsetX: stageW / 2, offsetY: stageH / 2 } });
	},

	frameSelection: (stageW, stageH) => {
		const { scene, selected } = get();
		if (selected.length === 0) return get().fitToScene(stageW, stageH);
		const pts = selected.flatMap((sel) => selectionPoints(scene, sel));
		const next = pts.length ? fitViewToBBox(bboxOf(pts), stageW, stageH, 160, 2.5) : null;
		if (next) set({ view: next });
		else get().fitToScene(stageW, stageH);
	},

	toggleGrid: () => set({ showGrid: !get().showGrid }),
	toggleSnap: () => set({ snapEnabled: !get().snapEnabled }),
	setStageSize: (stageSize) => set({ stageSize }),
	setUnits: (units) => get().commit((d) => void (d.settings.units = units)),
	setGridStep: (grid) => get().commit((d) => void (d.settings.grid = grid)),
	setTitle: (title) => get().commit((d) => void (d.settings.title = title)),
	setRenderMode: (mode) => get().commit((d) => void (d.settings.renderMode = mode)),
	toggleOverallChains: () => get().commit((d) => void (d.settings.showOverallChains = !d.settings.showOverallChains)),
	toggleLayerVisible: (layer) =>
		get().commit((d) => void (d.settings.layers[layer].visible = !d.settings.layers[layer].visible)),
	toggleLayerLocked: (layer) =>
		get().commit((d) => void (d.settings.layers[layer].locked = !d.settings.layers[layer].locked)),

	commit: (mutate) => {
		const { scene, past } = get();
		const snapshot = clone(scene);
		const next = clone(scene);
		mutate(next);
		set({ scene: next, past: [...past.slice(-HISTORY_CAP), snapshot], future: [], dirty: true });
	},

	undo: () => {
		const { past, future, scene } = get();
		if (past.length === 0) return;
		set({
			scene: past[past.length - 1],
			past: past.slice(0, -1),
			future: [clone(scene), ...future].slice(0, HISTORY_CAP),
			dirty: true,
			selected: [],
			wallDraft: null,
		});
	},

	redo: () => {
		const { past, future, scene } = get();
		if (future.length === 0) return;
		const [next, ...rest] = future;
		set({
			scene: next,
			past: [...past, clone(scene)].slice(-HISTORY_CAP),
			future: rest,
			dirty: true,
			selected: [],
			wallDraft: null,
		});
	},

	setWallDraft: (wallDraft) => set({ wallDraft }),
	setMeasureDraft: (measureDraft) => set({ measureDraft }),

	commitWallChain: (points) => {
		if (points.length < 2) return;
		const walls: Wall[] = [];
		const { defaultWallThickness, defaultWallMaterial } = get().scene.settings;
		for (let i = 0; i < points.length - 1; i++) {
			walls.push({
				id: newId(),
				a: points[i],
				b: points[i + 1],
				thickness: defaultWallThickness,
				material: defaultWallMaterial,
			});
		}
		get().commit((d) => void d.walls.push(...walls));
		set({ wallDraft: null });
	},

	addRoomRect: (x0, y0, x1, y1) => {
		if (Math.abs(x1 - x0) < 20 || Math.abs(y1 - y0) < 20) return;
		const { defaultWallThickness, defaultWallMaterial } = get().scene.settings;
		const { walls, room } = makeRoomRect(x0, y0, x1, y1, defaultWallThickness, 'Кімната', defaultWallMaterial);
		get().commit((d) => {
			d.walls.push(...walls);
			d.rooms.push(room);
		});
		set({ selected: [{ id: room.id, type: 'room' }], tool: 'select' });
	},

	addRoomPoly: (points) => {
		if (points.length < 3) return;
		const room: Room = { id: newId(), points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })), name: 'Кімната', floor: { kind: 'none', color: '#e8dcc8' } };
		const { defaultWallThickness, defaultWallMaterial } = get().scene.settings;
		const walls: Wall[] = points.map((p, i) => ({
			id: newId(),
			a: { x: Math.round(p.x), y: Math.round(p.y) },
			b: { x: Math.round(points[(i + 1) % points.length].x), y: Math.round(points[(i + 1) % points.length].y) },
			thickness: defaultWallThickness,
			material: defaultWallMaterial,
		}));
		get().commit((d) => {
			d.walls.push(...walls);
			d.rooms.push(room);
		});
		set({ selected: [{ id: room.id, type: 'room' }], tool: 'select' });
	},

	addOpening: (wallId, offset, type) => {
		const opening: Opening = { id: newId(), wallId, offset, width: type === 'door' ? 80 : 100, type, flip: false };
		get().commit((d) => void d.openings.push(opening));
		set({ selected: [{ id: opening.id, type: 'opening' }], tool: 'select' });
	},

	addFurniture: (kind, world) => {
		const meta = catalogByKind[kind];
		const item: Furniture = {
			id: newId(),
			kind,
			x: Math.round(world.x),
			y: Math.round(world.y),
			rotation: 0,
			w: meta?.w ?? 60,
			d: meta?.d ?? 60,
			label: meta?.label ?? kind,
			color: meta?.color ?? '#9ca3af',
		};
		get().commit((d) => void d.furniture.push(item));
		set({ selected: [{ id: item.id, type: 'furniture' }], tool: 'select' });
	},

	addText: (world) => {
		const text: TextLabel = { id: newId(), x: Math.round(world.x), y: Math.round(world.y), text: 'Текст', size: 30, rotation: 0 };
		get().commit((d) => void d.texts.push(text));
		set({ selected: [{ id: text.id, type: 'text' }], tool: 'select' });
	},

	addDim: (a, b) => {
		const dim: DimLine = { id: newId(), a, b, offset: 30 };
		get().commit((d) => void d.dims.push(dim));
		set({ selected: [{ id: dim.id, type: 'dim' }], tool: 'select' });
	},

	patchElement: (sel, patch) => {
		get().commit((d) => {
			if (sel.type === 'compass') {
				if (d.compass) Object.assign(d.compass, patch);
				return;
			}
			const target = buckets(d)[sel.type].find((el) => el.id === sel.id);
			if (target) Object.assign(target, patch);
		});
	},

	patchSelected: (patch) => {
		const sels = get().selected;
		if (sels.length === 0) return;
		get().commit((d) => {
			for (const sel of sels) {
				if (sel.type === 'compass') {
					if (d.compass) Object.assign(d.compass, patch);
					continue;
				}
				const target = buckets(d)[sel.type].find((el) => el.id === sel.id);
				if (target) Object.assign(target, patch);
			}
		});
	},

	deleteSelected: () => {
		const sels = get().selected;
		if (sels.length === 0) return;
		const byType = (t: SelectableType) => sels.filter((s) => s.type === t).map((s) => s.id);
		get().commit((d) => {
			const wallIds = new Set(byType('wall'));
			if (wallIds.size) {
				d.walls = d.walls.filter((w) => !wallIds.has(w.id));
				d.openings = d.openings.filter((o) => !wallIds.has(o.wallId));
			}
			const rm = (arr: { id: string }[], ids: string[]) => arr.filter((e) => !ids.includes(e.id));
			d.rooms = rm(d.rooms, byType('room')) as Room[];
			d.furniture = rm(d.furniture, byType('furniture')) as Furniture[];
			d.openings = rm(d.openings, byType('opening')) as Opening[];
			d.texts = rm(d.texts, byType('text')) as TextLabel[];
			d.dims = rm(d.dims, byType('dim')) as DimLine[];
			d.symbols = rm(d.symbols, byType('symbol')) as Scene['symbols'];
			d.routes = rm(d.routes, byType('route')) as Scene['routes'];
			d.zones = rm(d.zones, byType('zone')) as Scene['zones'];
			d.surfaces = rm(d.surfaces, byType('surface')) as Scene['surfaces'];
			if (sels.some((s) => s.type === 'compass')) d.compass = null;
		});
		set({ selected: [] });
	},

	duplicateSelected: () => {
		const sels = get().selected;
		if (sels.length === 0) return;
		const next: Selection[] = [];
		get().commit((d) => {
			for (const sel of sels) {
				const off = 30;
				if (sel.type === 'furniture') {
					const src = d.furniture.find((f) => f.id === sel.id);
					if (!src) continue;
					const copy: Furniture = { ...src, id: newId(), x: src.x + off, y: src.y + off };
					d.furniture.push(copy);
					next.push({ id: copy.id, type: 'furniture' });
				} else if (sel.type === 'text') {
					const src = d.texts.find((t) => t.id === sel.id);
					if (!src) continue;
					const copy: TextLabel = { ...src, id: newId(), x: src.x + off, y: src.y + off };
					d.texts.push(copy);
					next.push({ id: copy.id, type: 'text' });
				} else if (sel.type === 'symbol') {
					const src = d.symbols.find((s) => s.id === sel.id);
					if (!src) continue;
					const copy = { ...src, id: newId(), x: src.x + off, y: src.y + off, wallId: undefined, offset: undefined };
					d.symbols.push(copy);
					next.push({ id: copy.id, type: 'symbol' });
				} else if (sel.type === 'room') {
					const src = d.rooms.find((r) => r.id === sel.id);
					if (!src) continue;
					const copy: Room = { ...src, id: newId(), points: src.points.map((p) => ({ x: p.x + 40, y: p.y + 40 })) };
					d.rooms.push(copy);
					next.push({ id: copy.id, type: 'room' });
				}
			}
		});
		if (next.length) set({ selected: next });
	},

	moveSelected: (dx, dy) => {
		const sels = get().selected;
		if (sels.length === 0 || (dx === 0 && dy === 0)) return;
		get().commit((d) => {
			for (const sel of sels) moveElementBy(d, sel, dx, dy);
		});
	},

	nudgeSelected: (dx, dy) => get().moveSelected(dx, dy),

	alignSelected: (edge) => {
		const sels = get().selected.filter((s) => s.type === 'furniture' || s.type === 'symbol' || s.type === 'text');
		if (sels.length < 2) return;
		get().commit((d) => {
			const items = sels
				.map((s) => (buckets(d)[s.type as BucketKey] as (Furniture | TextLabel)[]).find((e) => e.id === s.id))
				.filter(Boolean) as (Furniture & { w?: number; d?: number })[];
			if (items.length < 2) return;
			const xs = items.map((i) => i.x);
			const ys = items.map((i) => i.y);
			const target = {
				left: Math.min(...xs),
				right: Math.max(...xs),
				hcenter: (Math.min(...xs) + Math.max(...xs)) / 2,
				top: Math.min(...ys),
				bottom: Math.max(...ys),
				vcenter: (Math.min(...ys) + Math.max(...ys)) / 2,
			}[edge];
			for (const it of items) {
				if (edge === 'left' || edge === 'right' || edge === 'hcenter') it.x = Math.round(target);
				else it.y = Math.round(target);
			}
		});
	},

	copySelection: () => {
		const { selected, scene } = get();
		if (selected.length === 0) return;
		const items: unknown[] = [];
		const types: SelectableType[] = [];
		for (const sel of selected) {
			if (sel.type === 'compass') continue;
			const src = (buckets(scene)[sel.type] as { id: string }[]).find((e) => e.id === sel.id);
			if (src) {
				items.push(clone(src));
				types.push(sel.type);
			}
		}
		set({ clipboard: items.length ? { items, types } : null });
	},

	paste: (offset = { x: 40, y: 40 }) => {
		const clip = get().clipboard;
		if (!clip) return;
		const next: Selection[] = [];
		get().commit((d) => {
			clip.items.forEach((raw, i) => {
				const type = clip.types[i];
				const item = clone(raw) as Record<string, unknown> & { id: string };
				item.id = newId();
				const shiftPt = (p: Vec) => ({ x: p.x + offset.x, y: p.y + offset.y });
				if ('x' in item && 'y' in item) {
					item.x = (item.x as number) + offset.x;
					item.y = (item.y as number) + offset.y;
				}
				if ('a' in item && 'b' in item) {
					item.a = shiftPt(item.a as Vec);
					item.b = shiftPt(item.b as Vec);
				}
				if ('points' in item) item.points = (item.points as Vec[]).map(shiftPt);
				if (type === 'symbol') {
					item.wallId = undefined;
					item.offset = undefined;
				}
				(buckets(d)[type as BucketKey] as unknown[]).push(item);
				next.push({ id: item.id, type });
			});
		});
		if (next.length) set({ selected: next });
	},

	beginDrag: () => set({ dragSnapshot: clone(get().scene) }),

	dragElementTo: (anchor, x, y) => {
		const { scene, selected, dragSnapshot } = get();
		const cur = posOf(scene, anchor);
		if (!cur) return;
		const dx = x - cur.x;
		const dy = y - cur.y;
		if (dx === 0 && dy === 0) return;
		const targets = selected.some((s) => s.id === anchor.id) ? selected : [anchor];
		const next = clone(scene);
		for (const s of targets) moveElementBy(next, s, dx, dy);
		set({ scene: next, dirty: true, dragSnapshot: dragSnapshot ?? clone(scene) });
	},

	endDrag: () => {
		const { dragSnapshot, past } = get();
		if (!dragSnapshot) return;
		set({ past: [...past.slice(-HISTORY_CAP), dragSnapshot], future: [], dragSnapshot: null });
	},

	addSymbol: (kind, at, wall) => {
		const meta = ENG_SYMBOLS.find((s) => s.kind === kind);
		const sym: SymbolItem = {
			id: newId(),
			kind,
			x: Math.round(at.x),
			y: Math.round(at.y),
			rotation: 0,
			wallId: wall?.wallId,
			offset: wall ? Math.round(wall.offset) : undefined,
		};
		void meta;
		get().commit((d) => void d.symbols.push(sym));
		set({ selected: [{ id: sym.id, type: 'symbol' }] });
	},

	addRoute: (kind, points) => {
		if (points.length < 2) return;
		const route: Route = { id: newId(), kind, points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) };
		get().commit((d) => void d.routes.push(route));
		set({ selected: [{ id: route.id, type: 'route' }], tool: 'select', pendingKind: null });
	},

	addZone: (points, kind) => {
		if (points.length < 3) return;
		const zone: Zone = { id: newId(), points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })), kind };
		get().commit((d) => void d.zones.push(zone));
		set({ selected: [{ id: zone.id, type: 'zone' }], tool: 'select' });
	},

	addSurface: (points, kind) => {
		if (points.length < 3) return;
		const surface: Surface = {
			id: newId(),
			points: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
			kind,
			color: '#d8c7b0',
			name: 'Поверхня',
		};
		get().commit((d) => void d.surfaces.push(surface));
		set({ selected: [{ id: surface.id, type: 'surface' }], tool: 'select' });
	},

	transformFurniture: (id, patch) => {
		get().commit((d) => {
			const f = d.furniture.find((x) => x.id === id);
			if (f) Object.assign(f, patch);
		});
	},

	cycleStatus: (sel) => {
		const nxt: Record<BuildStatus, BuildStatus> = { existing: 'demolish', demolish: 'new', new: 'existing' };
		get().commit((d) => {
			if (sel.type === 'wall') {
				const w = d.walls.find((x) => x.id === sel.id);
				if (w) w.status = nxt[w.status ?? 'existing'];
			} else if (sel.type === 'opening') {
				const o = d.openings.find((x) => x.id === sel.id);
				if (o) o.status = nxt[o.status ?? 'existing'];
			}
		});
	},

	setRouteGauge: (id, gauge) => {
		get().commit((d) => {
			const r = d.routes.find((x) => x.id === id);
			if (r) r.gauge = gauge || undefined;
		});
	},

	toggleDemolition: () => get().commit((d) => void (d.settings.showDemolition = !d.settings.showDemolition)),
	toggleColorByCircuit: () => get().commit((d) => void (d.settings.colorByCircuit = !d.settings.colorByCircuit)),
	setWallHeight: (cm) => get().commit((d) => void (d.settings.wallHeight = cm)),

	addRoomPreset: (kind, at) => {
		const { defaultWallThickness: t, defaultWallMaterial: m } = get().scene.settings;
		const x = Math.round(at.x);
		const y = Math.round(at.y);
		const built =
			kind === 'L'
				? makeRoomL(x, y, 500, 400, 180, t, m)
				: kind === 'U'
					? makeRoomU(x, y, 520, 420, 200, 180, t, m)
					: kind === 'T'
						? makeRoomT(x, y, 520, 420, 220, 180, t, m)
						: makeRoomRect(x, y, x + 400, y + 300, t, 'Кімната', m);
		get().commit((d) => {
			d.walls.push(...built.walls);
			d.rooms.push(built.room);
		});
		set({ selected: [{ id: built.room.id, type: 'room' }], tool: 'select' });
	},

	saveStyleboard: (name) => {
		const sel = get().selected;
		const room = sel.find((s) => s.type === 'room');
		const wall = sel.find((s) => s.type === 'wall');
		const scene = get().scene;
		const floor = room ? scene.rooms.find((r) => r.id === room.id)?.floor : undefined;
		const wallMaterial = wall ? scene.walls.find((w) => w.id === wall.id)?.material : undefined;
		get().commit((d) =>
			void d.styleboards.push({
				id: newId(),
				name: name.trim() || 'Набір',
				floor: floor ? { ...floor } : { ...DEFAULT_FLOOR },
				wallMaterial: wallMaterial ?? d.settings.defaultWallMaterial,
			}),
		);
	},

	deleteStyleboard: (id) => get().commit((d) => void (d.styleboards = d.styleboards.filter((s) => s.id !== id))),

	openElevation: (wallId) => set({ elevationWallId: wallId }),
	closeElevation: () => set({ elevationWallId: null }),
	toggle3d: () => set({ view3d: !get().view3d, selected: [] }),

	applyStyleboard: (id) => {
		const sb = get().scene.styleboards.find((s) => s.id === id);
		if (!sb) return;
		const sel = get().selected;
		get().commit((d) => {
			for (const s of sel) {
				if (s.type === 'room') {
					const r = d.rooms.find((x) => x.id === s.id);
					if (r) r.floor = { ...sb.floor };
				} else if (s.type === 'wall') {
					const w = d.walls.find((x) => x.id === s.id);
					if (w) w.material = sb.wallMaterial;
				} else if (s.type === 'surface') {
					const sf = d.surfaces.find((x) => x.id === s.id);
					if (sf) {
						sf.kind = sb.floor.kind === 'none' ? sf.kind : sb.floor.kind;
						sf.color = sb.floor.color;
					}
				}
			}
		});
	},

	addCompass: (at) => {
		get().commit((d) => void (d.compass = { x: Math.round(at.x), y: Math.round(at.y), rotation: d.compass?.rotation ?? 0 }));
		set({ selected: [{ id: 'compass', type: 'compass' }], tool: 'select' });
	},

	addCompassAtViewCenter: () => {
		const { view, stageSize } = get();
		get().addCompass(toWorld({ x: stageSize.width / 2, y: stageSize.height / 2 }, view));
	},

	moveWallNode: (from, to) => {
		get().commit((d) => {
			d.walls = moveNode(d.walls, from, to);
			for (const r of d.rooms) r.points = r.points.map((p) => (Math.hypot(p.x - from.x, p.y - from.y) <= 6 ? { x: Math.round(to.x), y: Math.round(to.y) } : p));
		});
	},

	splitWallAt: (wallId, at) => {
		get().commit((d) => void (d.walls = splitWall(d.walls, wallId, at)));
	},

	autoDetectRooms: () => {
		const polys = detectRooms(get().scene.walls);
		if (polys.length === 0) return;
		get().commit((d) => void (d.rooms = reconcileRooms(d.rooms, polys)));
	},

	setRoomFloor: (id, floor) => {
		get().commit((d) => {
			const room = d.rooms.find((r) => r.id === id);
			if (room) room.floor = { ...room.floor, ...floor };
		});
	},

	setWallMaterial: (ids, material) => {
		get().commit((d) => {
			for (const w of d.walls) if (ids.includes(w.id)) w.material = material;
		});
	},

	setWallThickness: (ids, cm) => {
		get().commit((d) => {
			for (const w of d.walls) if (ids.includes(w.id)) w.thickness = cm;
		});
	},

	setDefaultWall: (patch) => {
		get().commit((d) => {
			if (patch.thickness != null) d.settings.defaultWallThickness = patch.thickness;
			if (patch.material != null) d.settings.defaultWallMaterial = patch.material;
		});
	},
}));

function posOf(scene: Scene, sel: Selection): Vec | null {
	switch (sel.type) {
		case 'furniture':
			return scene.furniture.find((f) => f.id === sel.id) ?? null;
		case 'text':
			return scene.texts.find((t) => t.id === sel.id) ?? null;
		case 'symbol': {
			const s = scene.symbols.find((x) => x.id === sel.id);
			return s ? { x: s.x, y: s.y } : null;
		}
		case 'compass':
			return scene.compass;
		case 'room': {
			const r = scene.rooms.find((x) => x.id === sel.id);
			return r ? r.points[0] : null;
		}
		case 'wall': {
			const w = scene.walls.find((x) => x.id === sel.id);
			return w ? w.a : null;
		}
		default:
			return null;
	}
}

/** world (см) → screen (px) */
export const toScreen = (v: Vec, view: View): Vec => ({
	x: v.x * view.scale + view.offsetX,
	y: v.y * view.scale + view.offsetY,
});

/** screen (px) → world (см) */
export const toWorld = (v: Vec, view: View): Vec => ({
	x: (v.x - view.offsetX) / view.scale,
	y: (v.y - view.offsetY) / view.scale,
});
