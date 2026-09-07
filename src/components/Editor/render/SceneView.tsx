/* eslint-disable react-refresh/only-export-components */
import { Fragment } from 'react';
import { Arc, Circle, Group, Layer, Line, Rect, Text } from 'react-konva';
import { manualDimensions, overallChains, roomLabels, wallDimensions, type DimSegment } from '../../../domain/dimensions';
import { distance, normalize, segmentNormal, sub } from '../../../domain/geometry';
import type { LayerName, Opening, Scene, Vec, Wall } from '../../../domain/scene';
import { circuitColorMap } from '../../../domain/circuits';
import { wallHeightAt } from '../../../domain/elevation';
import { isCeilingSymbol, symbolMountHeight, zoneStyle } from '../../../constants/engineering';
import type { Selection, SelectableType } from '../../../store/usePlannerStore';
import { layerOf, toWorld, type View } from '../../../store/usePlannerStore';
import FurnitureShape from '../furniture/FurnitureShape';
import CompassMark from './CompassMark';
import RouteShape from './RouteShape';
import SymbolShape from './SymbolShape';
import { floorHatch, floorTint, wallHatch, WALL_MATERIAL_COLOR } from './hatch';
import type { RenderTheme } from './theme';

interface HatchStyle {
	base: string;
	line: string;
	/** true — суцільна заливка `base`, без штриховки */
	solid: boolean;
}

function wallStyle(theme: RenderTheme, material: import('../../../domain/scene').WallMaterial): HatchStyle {
	// синє креслення — стіни завжди суцільно білі (схема)
	if (theme.name === 'blueprint') return { base: theme.wall, line: theme.wall, solid: true };
	const line = theme.name === 'color' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.5)';
	const base = theme.name === 'color' ? WALL_MATERIAL_COLOR[material] : '#ffffff';
	return { base, line, solid: material === 'block' };
}

/** #rrggbb → rgba(...,a); повертає вхід без змін, якщо не hex */
function withAlpha(color: string, a: number): string {
	const m = color.match(/^#?([0-9a-f]{6})$/i);
	if (!m) return color;
	const n = parseInt(m[1], 16);
	return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function floorStyle(theme: RenderTheme, kind: import('../../../domain/scene').FloorKind, color: string): HatchStyle {
	if (theme.name === 'color') return { base: floorTint(kind, color), line: 'rgba(0,0,0,0.14)', solid: false };
	if (theme.name === 'blueprint') return { base: 'rgba(255,255,255,0.05)', line: 'rgba(255,255,255,0.16)', solid: false };
	// лінійний режим: лише легкий відтінок обраного кольору + тонка штриховка, щоб не перекривати меблі
	return { base: withAlpha(floorTint(kind, color), 0.14), line: 'rgba(0,0,0,0.16)', solid: false };
}

const STATUS_STROKE: Record<import('../../../domain/scene').BuildStatus, string | null> = {
	existing: null,
	demolish: '#dc2626',
	new: '#16a34a',
};

export interface SceneViewOptions {
	showGrid: boolean;
	showDimensions: boolean;
	showOverallChains: boolean;
	showRoomLabels: boolean;
	showFurnitureLabels: boolean;
	showTexts: boolean;
	showEngineering: boolean;
	showSymbolHeights: boolean;
	showFinishes: boolean;
	showCompass: boolean;
}

export const defaultOptions: SceneViewOptions = {
	showGrid: true,
	showSymbolHeights: true,
	showDimensions: true,
	showOverallChains: true,
	showRoomLabels: true,
	showFurnitureLabels: true,
	showTexts: true,
	showEngineering: true,
	showFinishes: true,
	showCompass: true,
};

interface Props {
	scene: Scene;
	view: View;
	theme: RenderTheme;
	stageWidth: number;
	stageHeight: number;
	options?: Partial<SceneViewOptions>;
	interactive?: boolean;
	selectedIds?: Set<string>;
	draggable?: boolean;
	onSelect?: (sel: Selection | null, additive: boolean) => void;
	onElementDragEnd?: (sel: Selection, x: number, y: number) => void;
	onCompassDragEnd?: (x: number, y: number) => void;
}

export default function SceneView({
	scene,
	view,
	theme,
	stageWidth,
	stageHeight,
	options,
	interactive = false,
	selectedIds,
	draggable = false,
	onSelect,
	onElementDragEnd,
	onCompassDragEnd,
}: Props) {
	const opt = { ...defaultOptions, ...options };
	const { scale } = view;
	const px = (n: number) => n / scale;
	const units = scene.settings.units;
	const layers = scene.settings.layers;
	const sel = selectedIds ?? new Set<string>();

	const layerVisible = (l: LayerName) => layers[l]?.visible ?? true;
	const layerLocked = (l: LayerName) => layers[l]?.locked ?? false;
	const hit = (type: SelectableType, id: string) =>
		interactive && !layerLocked(layerOf(type))
			? (e: { evt: MouseEvent }) => onSelect?.({ id, type }, e.evt.shiftKey)
			: undefined;
	const isSel = (id: string) => sel.has(id);

	const tl = toWorld({ x: 0, y: 0 }, view);
	const br = toWorld({ x: stageWidth, y: stageHeight }, view);
	const circuitColors = scene.settings.colorByCircuit ? circuitColorMap(scene) : null;

	return (
		<Layer>
			{/* тло сцени — щоб режим відображення (синій/лінійний/кольоровий) було видно і на екрані */}
			<Rect x={0} y={0} width={stageWidth} height={stageHeight} fill={theme.background} listening={false} />
			<Group x={view.offsetX} y={view.offsetY} scaleX={scale} scaleY={scale}>
				{opt.showGrid && <GridLines tl={tl} br={br} step={scene.settings.grid} scale={scale} theme={theme} />}

				{/* Rooms */}
				{layerVisible('labels') &&
					scene.rooms.map((r) => {
						const hasFloor = opt.showFinishes && r.floor.kind !== 'none';
						const fs = floorStyle(theme, r.floor.kind, r.floor.color);
						const hatchImg = hasFloor ? floorHatch(r.floor.kind, fs.base, fs.line) : null;
						return (
							<Line
								key={r.id}
								points={r.points.flatMap((p) => [p.x, p.y])}
								closed
								fillPriority={hatchImg ? 'pattern' : 'color'}
								fill={isSel(r.id) ? 'rgba(37,99,235,0.12)' : hasFloor && !hatchImg ? fs.base : theme.room}
								fillPatternImage={(hatchImg as unknown as HTMLImageElement) ?? undefined}
								fillPatternRepeat="repeat"
								fillPatternScale={hatchImg ? { x: px(1), y: px(1) } : undefined}
								stroke={isSel(r.id) ? theme.selection : undefined}
								strokeWidth={isSel(r.id) ? px(1.5) : 0}
								onMouseDown={hit('room', r.id)}
							/>
						);
					})}

				{/* Surfaces (кольорові зони підлоги без стін) */}
				{opt.showFinishes &&
					layerVisible('labels') &&
					scene.surfaces.map((sf) => {
						const fs = floorStyle(theme, sf.kind, sf.color);
						const hatchImg = floorHatch(sf.kind === 'none' ? 'parquet' : sf.kind, fs.base, fs.line);
						return (
							<Line
								key={sf.id}
								points={sf.points.flatMap((p) => [p.x, p.y])}
								closed
								fillPriority={hatchImg ? 'pattern' : 'color'}
								fill={isSel(sf.id) ? 'rgba(37,99,235,0.12)' : hatchImg ? undefined : fs.base}
								fillPatternImage={(hatchImg as unknown as HTMLImageElement) ?? undefined}
								fillPatternRepeat="repeat"
								fillPatternScale={hatchImg ? { x: px(1), y: px(1) } : undefined}
								stroke={isSel(sf.id) ? theme.selection : theme.dimension}
								strokeWidth={px(isSel(sf.id) ? 1.5 : 0.75)}
								dash={[px(5), px(4)]}
								onMouseDown={hit('surface', sf.id)}
							/>
						);
					})}

				{/* Walls */}
				{layerVisible('construction') &&
					scene.walls.map((w) => {
						const len = distance(w.a, w.b);
						if (len < 0.5) return null;
						const angle = (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI;
						const ws = wallStyle(theme, w.material);
						const hatchImg = ws.solid ? null : wallHatch(w.material, ws.base, ws.line);
						const demo = scene.settings.showDemolition ? STATUS_STROKE[w.status ?? 'existing'] : null;
						return (
							<Rect
								key={w.id}
								x={w.a.x}
								y={w.a.y}
								width={len}
								height={w.thickness}
								offsetY={w.thickness / 2}
								rotation={angle}
								fillPriority={hatchImg ? 'pattern' : 'color'}
								fill={hatchImg ? undefined : ws.base}
								fillPatternImage={(hatchImg as unknown as HTMLImageElement) ?? undefined}
								fillPatternRepeat="repeat"
								fillPatternScale={hatchImg ? { x: px(0.5), y: px(0.5) } : undefined}
								opacity={demo === STATUS_STROKE.demolish ? 0.55 : 1}
								stroke={isSel(w.id) ? theme.selection : demo ?? theme.wallStroke}
								strokeWidth={px(isSel(w.id) || demo ? 2 : w.loadBearing ? 2.2 : 1)}
								dash={demo === STATUS_STROKE.demolish ? [px(6), px(4)] : undefined}
								hitStrokeWidth={px(8)}
								onMouseDown={hit('wall', w.id)}
							/>
						);
					})}

				{/* Wall joints */}
				{layerVisible('construction') &&
					scene.walls.map((w) => (
						<Fragment key={`j-${w.id}`}>
							<Circle x={w.a.x} y={w.a.y} radius={w.thickness / 2} fill={theme.wall} listening={false} />
							<Circle x={w.b.x} y={w.b.y} radius={w.thickness / 2} fill={theme.wall} listening={false} />
						</Fragment>
					))}

				{/* Openings */}
				{layerVisible('openings') &&
					scene.openings.map((o) => {
						const wall = scene.walls.find((w) => w.id === o.wallId);
						if (!wall) return null;
						return (
							<OpeningShape
								key={o.id}
								opening={o}
								wall={wall}
								theme={theme}
								scale={scale}
								selected={isSel(o.id)}
								onMouseDown={hit('opening', o.id)}
							/>
						);
					})}

				{/* Renovation / heat zones */}
				{opt.showEngineering &&
					layerVisible('engineering') &&
					scene.zones.map((z) => {
						const st = zoneStyle(z.kind);
						return (
							<Line
								key={z.id}
								points={z.points.flatMap((p) => [p.x, p.y])}
								closed
								stroke={isSel(z.id) ? theme.selection : st.stroke}
								strokeWidth={px(1)}
								dash={[px(6), px(4)]}
								fill={st.fill}
								onMouseDown={hit('zone', z.id)}
							/>
						);
					})}

				{/* Routes */}
				{opt.showEngineering &&
					layerVisible('engineering') &&
					scene.routes.map((rt) => (
						<RouteShape
							key={rt.id}
							route={rt}
							scale={scale}
							theme={theme}
							selected={isSel(rt.id)}
							colorOverride={circuitColors?.get(rt.id)}
							onMouseDown={
								interactive && !layerLocked('engineering') ? () => onSelect?.({ id: rt.id, type: 'route' }, false) : undefined
							}
						/>
					))}

				{/* Symbols */}
				{opt.showEngineering &&
					layerVisible('engineering') &&
					scene.symbols.map((sy) => {
						const pos = symbolPos(sy, scene);
						const h = sy.mountHeight ?? symbolMountHeight(sy.kind, wallHeightAt(scene, pos));
						return (
							<Fragment key={sy.id}>
								<Group
									x={pos.x}
									y={pos.y}
									rotation={sy.rotation}
									draggable={draggable && interactive && !layerLocked('engineering')}
									onMouseDown={hit('symbol', sy.id)}
									onDragEnd={(e) => onElementDragEnd?.({ id: sy.id, type: 'symbol' }, Math.round(e.target.x()), Math.round(e.target.y()))}
								>
									<SymbolShape item={sy} theme={theme} scale={scale} colorOverride={circuitColors?.get(sy.id)} />
									{isSel(sy.id) && <Circle radius={px(15)} stroke={theme.selection} strokeWidth={px(1.5)} dash={[px(3), px(2)]} listening={false} />}
								</Group>
								{opt.showSymbolHeights && (
									<Text
										x={pos.x}
										y={pos.y + px(13)}
										text={isCeilingSymbol(sy.kind) ? 'стеля' : String(Math.round(h))}
										fontSize={px(9)}
										fill={theme.dimensionText}
										align="center"
										width={px(60)}
										offsetX={px(30)}
										listening={false}
									/>
								)}
							</Fragment>
						);
					})}

				{/* Furniture */}
				{layerVisible('furniture') &&
					scene.furniture.map((f) => (
						<Group
							key={f.id}
							id={`furn-${f.id}`}
							name="furniture-node"
							x={f.x}
							y={f.y}
							rotation={f.rotation}
							draggable={draggable && interactive && !layerLocked('furniture')}
							onMouseDown={hit('furniture', f.id)}
							onDragEnd={(e) => onElementDragEnd?.({ id: f.id, type: 'furniture' }, Math.round(e.target.x()), Math.round(e.target.y()))}
						>
							<FurnitureShape item={f} theme={theme} scale={scale} />
							{opt.showFurnitureLabels && f.label && (
								<Text
									text={f.label}
									fontSize={px(11)}
									fill={theme.furnitureText}
									width={Math.max(f.w, px(60))}
									align="center"
									offsetX={Math.max(f.w, px(60)) / 2}
									offsetY={px(5.5)}
									listening={false}
								/>
							)}
							{isSel(f.id) && (
								<Rect
									x={-f.w / 2 - px(3)}
									y={-f.d / 2 - px(3)}
									width={f.w + px(6)}
									height={f.d + px(6)}
									stroke={theme.selection}
									strokeWidth={px(1.5)}
									dash={[px(4), px(3)]}
									listening={false}
								/>
							)}
						</Group>
					))}

				{/* Dimensions */}
				{opt.showDimensions && layerVisible('dimensions') && (
					<>
						{wallDimensions(scene, units).map((d, i) => (
							<DimensionMark key={`wd-${i}`} seg={d} theme={theme} scale={scale} />
						))}
						{manualDimensions(scene, units).map((d, i) => {
							const dim = scene.dims[i];
							return (
								<Group key={`md-${i}`} onMouseDown={hit('dim', dim.id)}>
									<DimensionMark seg={d} theme={theme} scale={scale} selected={isSel(dim.id)} />
								</Group>
							);
						})}
					</>
				)}

				{/* Overall dimension chains */}
				{opt.showOverallChains &&
					scene.settings.showOverallChains &&
					layerVisible('dimensions') &&
					overallChains(scene, units).flatMap((chain) =>
						[...chain.segments, chain.total].map((seg, i) => (
							<DimensionMark key={`oc-${chain.side}-${i}`} seg={seg} theme={theme} scale={scale} />
						)),
					)}

				{/* Room labels */}
				{opt.showRoomLabels &&
					layerVisible('labels') &&
					roomLabels(scene).map((r, i) => (
						<Group key={`rl-${i}`} x={r.at.x} y={r.at.y} listening={false}>
							<Text text={r.name} fontSize={px(14)} fontStyle="bold" fill={theme.roomText} align="center" width={400} offsetX={200} offsetY={px(16)} />
							<Text text={r.areaText} fontSize={px(12)} fill={theme.roomText} align="center" width={400} offsetX={200} offsetY={px(0)} />
						</Group>
					))}

				{/* Free text */}
				{opt.showTexts &&
					layerVisible('labels') &&
					scene.texts.map((t) => (
						<Text
							key={t.id}
							x={t.x}
							y={t.y}
							text={t.text}
							fontSize={t.size}
							rotation={t.rotation}
							fill={isSel(t.id) ? theme.selection : theme.text}
							draggable={draggable && interactive && !layerLocked('labels')}
							onMouseDown={hit('text', t.id)}
							onDragEnd={(e) => onElementDragEnd?.({ id: t.id, type: 'text' }, Math.round(e.target.x()), Math.round(e.target.y()))}
						/>
					))}

				{/* Compass */}
				{opt.showCompass && layerVisible('labels') && scene.compass && (
					<CompassMark
						compass={scene.compass}
						scale={scale}
						theme={theme}
						selected={isSel('compass')}
						onMouseDown={interactive && !layerLocked('labels') ? () => onSelect?.({ id: 'compass', type: 'compass' }, false) : undefined}
						onDragEnd={draggable && interactive ? onCompassDragEnd : undefined}
					/>
				)}
			</Group>
		</Layer>
	);
}


function symbolPos(sy: { x: number; y: number; wallId?: string; offset?: number }, scene: Scene): Vec {
	if (sy.wallId && sy.offset != null) {
		const wall = scene.walls.find((w) => w.id === sy.wallId);
		if (wall) {
			const dir = normalize(sub(wall.b, wall.a));
			const n = segmentNormal(wall.a, wall.b);
			const t = wall.thickness / 2 + 4;
			return { x: wall.a.x + dir.x * sy.offset + n.x * t, y: wall.a.y + dir.y * sy.offset + n.y * t };
		}
	}
	return { x: sy.x, y: sy.y };
}

function GridLines({ tl, br, step, scale, theme }: { tl: Vec; br: Vec; step: number; scale: number; theme: RenderTheme }) {
	if (step <= 0 || step * scale < 3) return null;
	const lines: React.ReactNode[] = [];
	const startX = Math.floor(tl.x / step) * step;
	const startY = Math.floor(tl.y / step) * step;
	let count = 0;
	for (let x = startX; x <= br.x && count < 600; x += step, count++) {
		const strong = Math.round(x) % 100 === 0;
		lines.push(<Line key={`gx-${x}`} points={[x, tl.y, x, br.y]} stroke={strong ? theme.gridStrong : theme.grid} strokeWidth={(strong ? 1 : 0.5) / scale} listening={false} />);
	}
	for (let y = startY; y <= br.y && count < 1200; y += step, count++) {
		const strong = Math.round(y) % 100 === 0;
		lines.push(<Line key={`gy-${y}`} points={[tl.x, y, br.x, y]} stroke={strong ? theme.gridStrong : theme.grid} strokeWidth={(strong ? 1 : 0.5) / scale} listening={false} />);
	}
	return <>{lines}</>;
}

function OpeningShape({
	opening,
	wall,
	theme,
	scale,
	selected,
	onMouseDown,
}: {
	opening: Opening;
	wall: Wall;
	theme: RenderTheme;
	scale: number;
	selected?: boolean;
	onMouseDown?: (e: { evt: MouseEvent }) => void;
}) {
	const dir = normalize(sub(wall.b, wall.a));
	const wallLen = distance(wall.a, wall.b);
	const clamped = Math.min(Math.max(opening.offset, opening.width / 2), Math.max(opening.width / 2, wallLen - opening.width / 2));
	const center = { x: wall.a.x + dir.x * clamped, y: wall.a.y + dir.y * clamped };
	const angle = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
	const t = wall.thickness;
	const hw = opening.width / 2;
	const sw = 1 / scale;
	const strokeCol = theme.name === 'blueprint' ? theme.wallStroke : theme.wall;

	return (
		<Group x={center.x} y={center.y} rotation={angle} onMouseDown={onMouseDown} hitStrokeWidth={12 / scale}>
			<Rect x={-hw} y={-t / 2 - sw} width={opening.width} height={t + sw * 2} fill={theme.opening} />
			{opening.type === 'window' && (
				<>
					<Line points={[-hw, -t / 2, hw, -t / 2]} stroke={strokeCol} strokeWidth={sw} />
					<Line points={[-hw, t / 2, hw, t / 2]} stroke={strokeCol} strokeWidth={sw} />
					<Line points={[-hw, 0, hw, 0]} stroke={strokeCol} strokeWidth={sw} />
				</>
			)}
			{opening.type === 'opening' && (
				<>
					<Line points={[-hw, -t / 2, -hw, t / 2]} stroke={strokeCol} strokeWidth={sw} dash={[4 / scale, 3 / scale]} />
					<Line points={[hw, -t / 2, hw, t / 2]} stroke={strokeCol} strokeWidth={sw} dash={[4 / scale, 3 / scale]} />
				</>
			)}
			{opening.type === 'door' && (opening.doorKind ?? 'swing') === 'slide' && (
				<Group scaleY={opening.flip ? -1 : 1}>
					<Rect x={-hw} y={-t * 0.5} width={opening.width * 0.95} height={t * 0.34} fill={theme.opening} stroke={strokeCol} strokeWidth={sw} />
					<Line points={[-hw, t / 2, hw, t / 2]} stroke={strokeCol} strokeWidth={sw} />
				</Group>
			)}
			{opening.type === 'door' && (opening.doorKind ?? 'swing') === 'double' && (
				<Group scaleY={opening.flip ? -1 : 1}>
					<Line points={[-hw, 0, -hw, hw]} stroke={strokeCol} strokeWidth={sw} />
					<Arc x={-hw} y={0} innerRadius={hw} outerRadius={hw} angle={90} stroke={strokeCol} strokeWidth={sw} dash={[5 / scale, 4 / scale]} />
					<Line points={[hw, 0, hw, hw]} stroke={strokeCol} strokeWidth={sw} />
					<Arc x={hw} y={0} innerRadius={hw} outerRadius={hw} rotation={90} angle={90} stroke={strokeCol} strokeWidth={sw} dash={[5 / scale, 4 / scale]} />
				</Group>
			)}
			{opening.type === 'door' && (opening.doorKind ?? 'swing') === 'swing' && (
				<Group scaleY={opening.flip ? -1 : 1}>
					<Group scaleX={opening.hingeRight ? -1 : 1}>
						<Line points={[-hw, 0, -hw, opening.width]} stroke={strokeCol} strokeWidth={sw} />
						<Arc x={-hw} y={0} innerRadius={opening.width} outerRadius={opening.width} angle={90} stroke={strokeCol} strokeWidth={sw} dash={[5 / scale, 4 / scale]} />
						<Line points={[-hw, 0, hw, 0]} stroke={strokeCol} strokeWidth={sw} />
					</Group>
				</Group>
			)}
			{selected && <Rect x={-hw} y={-t / 2 - sw * 3} width={opening.width} height={t + sw * 6} stroke={theme.selection} strokeWidth={sw * 1.5} dash={[4 / scale, 3 / scale]} />}
		</Group>
	);
}

export function DimensionMark({ seg, theme, scale, selected }: { seg: DimSegment; theme: RenderTheme; scale: number; selected?: boolean }) {
	const sw = 1 / scale;
	const n = segmentNormal(seg.a, seg.b);
	const tick = 6 / scale;
	const col = selected ? theme.selection : theme.dimension;
	const textW = Math.max(seg.label.length * (11 / scale) * 0.62, 20 / scale);
	return (
		<Group listening={false}>
			<Line points={[seg.a.x, seg.a.y, seg.b.x, seg.b.y]} stroke={col} strokeWidth={sw} />
			<Line points={[seg.a.x - n.x * tick, seg.a.y - n.y * tick, seg.a.x + n.x * tick, seg.a.y + n.y * tick]} stroke={col} strokeWidth={sw} />
			<Line points={[seg.b.x - n.x * tick, seg.b.y - n.y * tick, seg.b.x + n.x * tick, seg.b.y + n.y * tick]} stroke={col} strokeWidth={sw} />
			<Rect x={seg.mid.x} y={seg.mid.y} width={textW + 8 / scale} height={14 / scale} offsetX={(textW + 8 / scale) / 2} offsetY={7 / scale} rotation={seg.angleDeg} fill={theme.background} opacity={0.85} />
			<Text x={seg.mid.x} y={seg.mid.y} text={seg.label} fontSize={11 / scale} fill={theme.dimensionText} width={textW} align="center" offsetX={textW / 2} offsetY={5.5 / scale} rotation={seg.angleDeg} />
		</Group>
	);
}
