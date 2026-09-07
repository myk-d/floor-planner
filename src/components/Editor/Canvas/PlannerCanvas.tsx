import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva';
import { measureLabel } from '../../../domain/dimensions';
import { normalize, pointToSegment, sub } from '../../../domain/geometry';
import { formatLengthShort, parseLength } from '../../../domain/units';
import { snapToGrid, snapToVertices, snapWallAngle } from '../../../domain/snapping';
import type { RouteKind, Vec } from '../../../domain/scene';
import { toWorld, usePlannerStore, type Selection } from '../../../store/usePlannerStore';
import { useElementSize } from '../../../utils/useElementSize';
import SceneView from '../render/SceneView';
import { themeForMode } from '../render/theme';

type Menu = { x: number; y: number; wallId: string; world: Vec } | null;

export default function PlannerCanvas() {
	const { ref, width, height } = useElementSize<HTMLDivElement>();
	const stageRef = useRef<Konva.Stage | null>(null);

	const s = usePlannerStore();
	const {
		scene,
		view,
		tool,
		pendingKind,
		selected,
		snapEnabled,
		showGrid,
		wallDraft,
		measureDraft,
		select,
		selectMany,
		setView,
		zoomAt,
		fitToScene,
		setStageSize,
		setWallDraft,
		setMeasureDraft,
		commitWallChain,
		addRoomRect,
		addRoomPoly,
		addOpening,
		addText,
		addDim,
		addSymbol,
		addRoute,
		addZone,
		addSurface,
		addRoomPreset,
		cycleStatus,
		addCompass,
		beginDrag,
		dragElementTo,
		endDrag,
		moveWallNode,
		splitWallAt,
		setTool,
		transformFurniture,
	} = s;

	const trRef = useRef<Konva.Transformer | null>(null);
	useEffect(() => {
		const tr = trRef.current;
		const stage = stageRef.current;
		if (!tr || !stage) return;
		if (tool === 'select' && selected.length === 1 && selected[0].type === 'furniture') {
			const node = stage.findOne(`#furn-${selected[0].id}`);
			if (node) {
				tr.nodes([node]);
				tr.getLayer()?.batchDraw();
				return;
			}
		}
		tr.nodes([]);
	}, [selected, tool, scene.furniture, view]);

	const onTransformEnd = () => {
		const node = trRef.current?.nodes()[0] as Konva.Node | undefined;
		if (!node || selected[0]?.type !== 'furniture') return;
		const f = scene.furniture.find((x) => x.id === selected[0].id);
		if (!f) return;
		const sx = node.scaleX();
		const sy = node.scaleY();
		node.scaleX(1);
		node.scaleY(1);
		transformFurniture(f.id, {
			x: Math.round(node.x()),
			y: Math.round(node.y()),
			rotation: Math.round(node.rotation()),
			w: Math.max(10, Math.round(f.w * sx)),
			d: Math.max(10, Math.round(f.d * sy)),
		});
	};

	const [cursor, setCursor] = useState<Vec | null>(null);
	const [rectStart, setRectStart] = useState<Vec | null>(null);
	const [dimStart, setDimStart] = useState<Vec | null>(null);
	const [chain, setChain] = useState<Vec[] | null>(null); // room-poly / wire / pipe / heatzone
	const [marquee, setMarquee] = useState<{ a: Vec; b: Vec } | null>(null);
	const [lenInput, setLenInput] = useState('');
	const [menu, setMenu] = useState<Menu>(null);
	const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
	const spaceRef = useRef(false);

	const didFit = useRef(false);
	useEffect(() => {
		if (width > 0 && height > 0) {
			setStageSize({ width, height });
			if (!didFit.current) {
				didFit.current = true;
				fitToScene(width, height);
			}
		}
	}, [width, height, fitToScene, setStageSize]);

	useEffect(() => {
		const down = (e: KeyboardEvent) => e.code === 'Space' && (spaceRef.current = true);
		const up = (e: KeyboardEvent) => e.code === 'Space' && (spaceRef.current = false);
		window.addEventListener('keydown', down);
		window.addEventListener('keyup', up);
		return () => {
			window.removeEventListener('keydown', down);
			window.removeEventListener('keyup', up);
		};
	}, []);

	const pointer = useCallback((): Vec | null => {
		const pos = stageRef.current?.getPointerPosition();
		return pos ? toWorld(pos, view) : null;
	}, [view]);

	const snap = useCallback(
		(w: Vec, shift: boolean): Vec => {
			if (!snapEnabled) return w;
			const v = snapToVertices(w, scene, 12 / view.scale);
			if (v.snapped) return v.point;
			if (shift) return w;
			return snapToGrid(w, scene.settings.grid);
		},
		[snapEnabled, scene, view.scale],
	);

	const onWheel = (e: KonvaEventObject<WheelEvent>) => {
		e.evt.preventDefault();
		const pos = stageRef.current?.getPointerPosition();
		if (pos) zoomAt(e.evt.deltaY < 0 ? 1.1 : 1 / 1.1, pos);
	};

	function nearestWall(world: Vec): { wallId: string; offset: number } | null {
		let best: { wallId: string; offset: number } | null = null;
		let bestDist = 30 / view.scale + 12;
		for (const w of scene.walls) {
			const r = pointToSegment(world, w.a, w.b);
			if (r.distance < bestDist) {
				bestDist = r.distance;
				best = { wallId: w.id, offset: r.t * Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) };
			}
		}
		return best;
	}

	function nearestOpening(world: Vec): string | null {
		let best: string | null = null;
		let bestDist = 25 / view.scale + 10;
		for (const o of scene.openings) {
			const w = scene.walls.find((x) => x.id === o.wallId);
			if (!w) continue;
			const dir = { x: w.b.x - w.a.x, y: w.b.y - w.a.y };
			const len = Math.hypot(dir.x, dir.y) || 1;
			const c = { x: w.a.x + (dir.x / len) * o.offset, y: w.a.y + (dir.y / len) * o.offset };
			const d = Math.hypot(world.x - c.x, world.y - c.y);
			if (d < bestDist) {
				bestDist = d;
				best = o.id;
			}
		}
		return best;
	}

	const isChainTool = tool === 'room-poly' || tool === 'surface' || tool === 'wire' || tool === 'pipe' || tool === 'zone';

	const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
		setMenu(null);
		if (tool === 'pan' || spaceRef.current || e.evt.button === 1) {
			const p = stageRef.current!.getPointerPosition()!;
			panRef.current = { x: p.x, y: p.y, ox: view.offsetX, oy: view.offsetY };
			return;
		}
		if (e.evt.button === 2) return;
		const world = pointer();
		if (!world) return;
		const clickedEmpty = e.target === e.target.getStage();
		const sp = snap(world, e.evt.shiftKey);

		if (tool === 'select') {
			if (clickedEmpty) {
				if (!e.evt.shiftKey) select(null);
				setMarquee({ a: world, b: world });
			}
			return;
		}
		if (tool === 'room') return setRectStart(sp);
		if (tool === 'room-l' || tool === 'room-u' || tool === 'room-t') {
			addRoomPreset(tool === 'room-l' ? 'L' : tool === 'room-u' ? 'U' : 'T', sp);
			return;
		}
		if (tool === 'demolish') {
			const hitO = nearestOpening(world);
			if (hitO) cycleStatus({ id: hitO, type: 'opening' });
			else {
				const hitW = nearestWall(world);
				if (hitW) cycleStatus({ id: hitW.wallId, type: 'wall' });
			}
			return;
		}
		if (tool === 'dimension') {
			if (!dimStart) setDimStart(sp);
			else {
				addDim(dimStart, sp);
				setDimStart(null);
			}
			return;
		}
		if (tool === 'measure') {
			setMeasureDraft({ a: sp, b: sp });
			return;
		}
		if (tool === 'wall') {
			const pts = wallDraft ?? [];
			let p = sp;
			if (pts.length > 0 && !e.evt.shiftKey) p = snapWallAngle(pts[pts.length - 1], p);
			setWallDraft([...pts, p]);
			return;
		}
		if (isChainTool) {
			const pts = chain ?? [];
			let p = sp;
			if (tool !== 'zone' && tool !== 'room-poly' && tool !== 'surface' && pts.length > 0 && !e.evt.shiftKey) p = snapWallAngle(pts[pts.length - 1], p);
			setChain([...pts, p]);
			return;
		}
		if (tool === 'door' || tool === 'window' || tool === 'opening') {
			const hitW = nearestWall(world);
			if (hitW) addOpening(hitW.wallId, hitW.offset, tool);
			return;
		}
		if (tool === 'text') return addText(sp);
		if (tool === 'compass') return addCompass(sp);
		if (tool === 'symbol' && pendingKind) {
			const hitW = nearestWall(world);
			const onWall = ['socket', 'socket-double', 'socket-quad', 'socket-waterproof', 'switch-1', 'switch-2', 'switch-3', 'switch-pass', 'dimmer', 'light-wall', 'panel', 'water-cold', 'water-hot', 'sewer-out', 'manifold', 'thermostat'].includes(pendingKind) || pendingKind.startsWith('radiator');
			if (onWall && hitW) addSymbol(pendingKind, world, hitW);
			else addSymbol(pendingKind, sp);
			return;
		}
	};

	const onMouseMove = () => {
		const pos = stageRef.current?.getPointerPosition();
		if (!pos) return;
		const world = toWorld(pos, view);
		if (panRef.current) {
			setView({ offsetX: panRef.current.ox + (pos.x - panRef.current.x), offsetY: panRef.current.oy + (pos.y - panRef.current.y) });
			return;
		}
		setCursor(world);
		if (marquee) setMarquee({ a: marquee.a, b: world });
		if (measureDraft) setMeasureDraft({ a: measureDraft.a, b: snap(world, false) });
	};

	const onMouseUp = () => {
		panRef.current = null;
		if (tool === 'room' && rectStart && cursor) {
			const end = snap(cursor, false);
			addRoomRect(rectStart.x, rectStart.y, end.x, end.y);
			setRectStart(null);
		}
		if (tool === 'measure') setMeasureDraft(null);
		if (marquee) {
			const box = normRect(marquee.a, marquee.b);
			if (Math.abs(box.w) > 8 / view.scale && Math.abs(box.h) > 8 / view.scale) {
				selectMany(elementsInBox(box));
			}
			setMarquee(null);
		}
	};

	const onContextMenu = (e: KonvaEventObject<PointerEvent>) => {
		e.evt.preventDefault();
		const world = pointer();
		if (!world) return;
		const hitW = nearestWall(world);
		const pos = stageRef.current?.getPointerPosition();
		if (hitW && pos) setMenu({ x: pos.x, y: pos.y, wallId: hitW.wallId, world });
	};

	const finishChain = useCallback(() => {
		if (!chain) return;
		if (tool === 'wall') return;
		if (tool === 'room-poly' && chain.length >= 3) addRoomPoly(chain);
		else if ((tool === 'wire' || tool === 'pipe') && chain.length >= 2) {
			const kind: RouteKind = tool === 'wire' ? 'wire' : (pendingKind as RouteKind) || 'pipe-cold';
			addRoute(kind, chain);
		} else if (tool === 'surface' && chain.length >= 3) {
			addSurface(chain, (pendingKind as import('../../../domain/scene').FloorKind) || 'parquet');
		} else if (tool === 'zone' && chain.length >= 3) {
			addZone(chain, (pendingKind as import('../../../domain/scene').ZoneKind) || 'screed');
		}
		setChain(null);
	}, [chain, tool, pendingKind, addRoomPoly, addRoute, addZone, addSurface]);

	const finishWall = useCallback(() => {
		if (wallDraft && wallDraft.length >= 2) commitWallChain(wallDraft);
		else setWallDraft(null);
	}, [wallDraft, commitWallChain, setWallDraft]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
			if (e.key === 'Enter') {
				if (tool === 'wall') finishWall();
				else if (isChainTool) finishChain();
			}
			if (e.key === 'Escape') {
				setWallDraft(null);
				setChain(null);
				setRectStart(null);
				setDimStart(null);
				setMeasureDraft(null);
				setMenu(null);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [tool, isChainTool, finishWall, finishChain, setWallDraft, setMeasureDraft]);

	function normRect(a: Vec, b: Vec) {
		return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
	}

	function elementsInBox(box: { x: number; y: number; w: number; h: number }): Selection[] {
		const inside = (p: Vec) => p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
		const out: Selection[] = [];
		const L = scene.settings.layers;
		if (L.furniture.visible && !L.furniture.locked) scene.furniture.forEach((f) => inside(f) && out.push({ id: f.id, type: 'furniture' }));
		if (L.engineering.visible && !L.engineering.locked) scene.symbols.forEach((sy) => inside({ x: sy.x, y: sy.y }) && out.push({ id: sy.id, type: 'symbol' }));
		if (L.labels.visible && !L.labels.locked) scene.texts.forEach((tx) => inside(tx) && out.push({ id: tx.id, type: 'text' }));
		if (L.construction.visible && !L.construction.locked)
			scene.walls.forEach((w) => inside({ x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 }) && out.push({ id: w.id, type: 'wall' }));
		if (L.labels.visible && !L.labels.locked)
			scene.rooms.forEach((r) => {
				const c = r.points.reduce((s2, p) => ({ x: s2.x + p.x / r.points.length, y: s2.y + p.y / r.points.length }), { x: 0, y: 0 });
				if (inside(c)) out.push({ id: r.id, type: 'room' });
			});
		return out;
	}

	// ручки вузлів для однієї вибраної стіни
	const singleWall = selected.length === 1 && selected[0].type === 'wall' ? scene.walls.find((w) => w.id === selected[0].id) : null;

	const toS = (p: Vec) => ({ x: p.x * view.scale + view.offsetX, y: p.y * view.scale + view.offsetY });

	// живий підпис під час малювання: довжина сегмента + кут (або габарит прямокутника)
	const drawHint: { at: Vec; text: string } | null = (() => {
		const u = scene.settings.units;
		if (rectStart && cursor) {
			return {
				at: toS(cursor),
				text: `${formatLengthShort(Math.abs(cursor.x - rectStart.x), u)} × ${formatLengthShort(Math.abs(cursor.y - rectStart.y), u)}`,
			};
		}
		let a: Vec | null = null;
		if (tool === 'wall' && wallDraft && wallDraft.length > 0) a = wallDraft[wallDraft.length - 1];
		else if (isChainTool && chain && chain.length > 0) a = chain[chain.length - 1];
		else if (dimStart) a = dimStart;
		if (!a || !cursor) return null;
		const dx = cursor.x - a.x;
		const dy = cursor.y - a.y;
		const len = Math.hypot(dx, dy);
		if (len < 1) return null;
		const ang = (Math.round(-Math.atan2(dy, dx) * (180 / Math.PI)) + 360) % 360;
		return { at: toS(cursor), text: `${formatLengthShort(len, u)}  ·  ${ang}°` };
	})();

	// введення довжини з клавіатури під час малювання сегмента
	const drawingSegment = (tool === 'wall' && !!wallDraft && wallDraft.length > 0) || (isChainTool && !!chain && chain.length > 0);
	const commitTypedLength = () => {
		const cm = parseLength(lenInput, scene.settings.units);
		if (cm == null || cm <= 0 || !cursor) return;
		const pts = tool === 'wall' ? wallDraft! : chain!;
		const last = pts[pts.length - 1];
		const useAngleSnap = snapEnabled && tool !== 'room-poly' && tool !== 'surface' && tool !== 'zone';
		const aimed = useAngleSnap ? snapWallAngle(last, cursor) : cursor;
		let dir = normalize(sub(aimed, last));
		if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 };
		const p = { x: Math.round(last.x + dir.x * cm), y: Math.round(last.y + dir.y * cm) };
		if (tool === 'wall') setWallDraft([...pts, p]);
		else setChain([...pts, p]);
		setLenInput('');
	};

	const cursorStyle = tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';

	return (
		<div ref={ref} className="relative h-full w-full overflow-hidden bg-page-bg" style={{ cursor: cursorStyle }}>
			{width > 0 && height > 0 && (
				<Stage
					ref={stageRef}
					width={width}
					height={height}
					onWheel={onWheel}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseUp}
					onContextMenu={onContextMenu}
				>
					<SceneView
						scene={scene}
						view={view}
						theme={themeForMode(scene.settings.renderMode)}
						stageWidth={width}
						stageHeight={height}
						options={{ showGrid }}
						interactive
						draggable={tool === 'select'}
						selectedIds={new Set(selected.map((x) => x.id))}
						onSelect={(sel, additive) => select(sel, additive)}
						onElementDragEnd={(sel, x, y) => {
							dragElementTo(sel, x, y);
							endDrag();
						}}
						onCompassDragEnd={(x, y) => {
							dragElementTo({ id: 'compass', type: 'compass' }, x, y);
							endDrag();
						}}
					/>

					{/* оверлей: чернетки й ручки */}
					<Layer listening={!!singleWall}>
						{wallDraft && wallDraft.length > 0 && (
							<>
								<Line
									points={[...wallDraft.flatMap((p) => [toS(p).x, toS(p).y]), ...(cursor ? [toS(cursor).x, toS(cursor).y] : [])]}
									stroke="#2563eb"
									strokeWidth={2}
									dash={[6, 4]}
								/>
								{wallDraft.map((p, i) => (
									<Circle key={i} x={toS(p).x} y={toS(p).y} radius={4} fill="#2563eb" />
								))}
							</>
						)}
						{chain && chain.length > 0 && (
							<>
								<Line
									points={[...chain.flatMap((p) => [toS(p).x, toS(p).y]), ...(cursor ? [toS(cursor).x, toS(cursor).y] : [])]}
									closed={tool === 'room-poly' || tool === 'surface' || tool === 'zone'}
									stroke="#7c3aed"
									strokeWidth={2}
									dash={[6, 4]}
								/>
								{chain.map((p, i) => (
									<Circle key={i} x={toS(p).x} y={toS(p).y} radius={4} fill="#7c3aed" />
								))}
							</>
						)}
						{rectStart && cursor && (
							<Rect
								x={Math.min(toS(rectStart).x, toS(cursor).x)}
								y={Math.min(toS(rectStart).y, toS(cursor).y)}
								width={Math.abs(toS(cursor).x - toS(rectStart).x)}
								height={Math.abs(toS(cursor).y - toS(rectStart).y)}
								stroke="#2563eb"
								dash={[6, 4]}
								fill="rgba(37,99,235,0.08)"
							/>
						)}
						{dimStart && cursor && <Line points={[toS(dimStart).x, toS(dimStart).y, toS(cursor).x, toS(cursor).y]} stroke="#0b3d91" strokeWidth={1.5} dash={[4, 3]} />}
						{measureDraft && (
							<>
								<Line points={[toS(measureDraft.a).x, toS(measureDraft.a).y, toS(measureDraft.b).x, toS(measureDraft.b).y]} stroke="#0b3d91" strokeWidth={1.5} />
								<Text
									x={(toS(measureDraft.a).x + toS(measureDraft.b).x) / 2}
									y={(toS(measureDraft.a).y + toS(measureDraft.b).y) / 2 - 16}
									text={measureLabel(measureDraft.a, measureDraft.b, scene.settings.units)}
									fontSize={13}
									fill="#0b3d91"
									fontStyle="bold"
								/>
							</>
						)}
						{drawHint && (
							<Label
								x={drawHint.at.x + (drawHint.at.x + 40 + drawHint.text.length * 7 > width ? -14 - drawHint.text.length * 7 : 14)}
								y={drawHint.at.y + (drawHint.at.y + 44 > height ? -42 : 14)}
								listening={false}
							>
								<Tag fill="#111827" cornerRadius={3} />
								<Text text={drawHint.text} fill="#fff" fontSize={12} padding={5} />
							</Label>
						)}
						{marquee && (
							<Rect
								x={Math.min(toS(marquee.a).x, toS(marquee.b).x)}
								y={Math.min(toS(marquee.a).y, toS(marquee.b).y)}
								width={Math.abs(toS(marquee.b).x - toS(marquee.a).x)}
								height={Math.abs(toS(marquee.b).y - toS(marquee.a).y)}
								stroke="#2563eb"
								dash={[4, 3]}
								fill="rgba(37,99,235,0.06)"
							/>
						)}
						{singleWall &&
							[singleWall.a, singleWall.b].map((p, i) => (
								<Circle
									key={i}
									x={toS(p).x}
									y={toS(p).y}
									radius={6}
									fill="#fff"
									stroke="#2563eb"
									strokeWidth={2}
									draggable
									onDragStart={beginDrag}
									onDragMove={(e) => {
										const w = toWorld({ x: e.target.x(), y: e.target.y() }, view);
										const sn = snap(w, false);
										moveWallNode(p, sn);
									}}
									onDragEnd={endDrag}
								/>
							))}
					</Layer>
					<Layer>
						<Transformer
							ref={trRef}
							rotateEnabled
							keepRatio={false}
							ignoreStroke
							anchorSize={8}
							borderStroke="#2563eb"
							anchorStroke="#2563eb"
							onTransformEnd={onTransformEnd}
							boundBoxFunc={(oldBox, newBox) => (newBox.width < 6 || newBox.height < 6 ? oldBox : newBox)}
						/>
					</Layer>
				</Stage>
			)}

			{tool === 'wall' && wallDraft && wallDraft.length >= 2 && (
				<button onClick={finishWall} className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white shadow">
					Завершити (Enter)
				</button>
			)}
			{isChainTool && chain && chain.length >= 2 && (
				<button onClick={finishChain} className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white shadow">
					Завершити (Enter)
				</button>
			)}
			{tool !== 'select' && tool !== 'pan' && (
				<button onClick={() => setTool('select')} className="absolute right-4 top-4 rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs shadow">
					Готово
				</button>
			)}
			{drawingSegment && (
				<div className="absolute left-1/2 top-14 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-panel-border bg-panel px-2 py-1 text-xs shadow">
					<span className="text-muted">Довжина</span>
					<input
						autoFocus
						inputMode="decimal"
						value={lenInput}
						onChange={(e) => setLenInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								commitTypedLength();
							} else if (e.key === 'Escape') {
								(e.target as HTMLInputElement).blur();
							}
						}}
						placeholder={drawHint ? drawHint.text.split(' ')[0] : '0'}
						className="w-20 rounded border border-panel-border bg-page-bg px-1.5 py-0.5 outline-none focus:border-brand"
					/>
					<span className="text-muted">{{ m: 'м', cm: 'см', mm: 'мм' }[scene.settings.units]}</span>
					<kbd className="rounded bg-page-bg px-1 text-[10px] text-muted">Enter</kbd>
				</div>
			)}

			{menu && (
				<div
					className="absolute z-20 min-w-40 rounded-md border border-panel-border bg-panel py-1 text-sm shadow-lg"
					style={{ left: menu.x, top: menu.y }}
					onMouseLeave={() => setMenu(null)}
				>
					<button
						className="block w-full px-3 py-1.5 text-left hover:bg-page-bg"
						onClick={() => {
							splitWallAt(menu.wallId, menu.world);
							setMenu(null);
						}}
					>
						Розбити стіну тут
					</button>
					<button
						className="block w-full px-3 py-1.5 text-left text-danger hover:bg-page-bg"
						onClick={() => {
							select({ id: menu.wallId, type: 'wall' });
							usePlannerStore.getState().deleteSelected();
							setMenu(null);
						}}
					>
						Видалити стіну
					</button>
				</div>
			)}
		</div>
	);
}
