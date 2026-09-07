/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Stage } from 'react-konva';
import PlannerCanvas from './components/Editor/Canvas/PlannerCanvas';
import ElevationView from './components/Editor/ElevationView';
import LeftPanel from './components/Editor/LeftPanel';
import PropertiesPanel from './components/Editor/PropertiesPanel';
import ShortcutsHelp from './components/Editor/ShortcutsHelp';
import Toolbar from './components/Editor/Toolbar';
import TopBar from './components/Editor/TopBar';

const Scene3D = lazy(() => import('./components/Editor/3d/Scene3D'));
import SceneView, { defaultOptions } from './components/Editor/render/SceneView';
import { exportSceneToDataURL } from './components/Editor/render/exportScene';
import { themeForMode } from './components/Editor/render/theme';
import { emptyScene, makeRoomRect, newId, type RenderMode, type Scene } from './domain/scene';
import { usePlannerStore } from './store/usePlannerStore';
import './index.css';

function demoScene(): Scene {
	const s = emptyScene('Демо-квартира');
	const living = makeRoomRect(0, 0, 520, 420, 10, 'Вітальня', 'brick');
	const bed = makeRoomRect(520, 0, 880, 420, 10, 'Спальня', 'block');
	const bath = makeRoomRect(0, 420, 260, 640, 10, 'Санвузол', 'concrete');
	s.walls.push(...living.walls, ...bed.walls, ...bath.walls);
	living.room.floor = { kind: 'parquet', color: '#d8b98c' };
	bed.room.floor = { kind: 'laminate', color: '#e2cba6' };
	bath.room.floor = { kind: 'tile', color: '#dfe4e8' };
	s.rooms.push(living.room, bed.room, bath.room);
	s.openings.push({ id: newId(), wallId: living.walls[1].id, offset: 210, width: 90, type: 'door', flip: false });
	s.openings.push({ id: newId(), wallId: living.walls[0].id, offset: 260, width: 160, type: 'window', flip: false });
	s.openings.push({ id: newId(), wallId: bath.walls[0].id, offset: 130, width: 70, type: 'door', flip: false });
	s.furniture.push(
		{ id: newId(), kind: 'sofa', x: 260, y: 350, rotation: 0, w: 220, d: 95, label: 'Диван', color: '#8ea9c4' },
		{ id: newId(), kind: 'tv-stand', x: 260, y: 45, rotation: 0, w: 160, d: 40, label: 'ТВ-тумба', color: '#c9a27a' },
		{ id: newId(), kind: 'bed-double', x: 700, y: 150, rotation: 0, w: 160, d: 200, label: 'Ліжко', color: '#8ea9c4' },
		{ id: newId(), kind: 'wardrobe', x: 810, y: 360, rotation: 0, w: 180, d: 60, label: 'Шафа', color: '#c9a27a' },
		{ id: newId(), kind: 'toilet', x: 200, y: 470, rotation: 0, w: 40, d: 65, label: 'Унітаз', color: '#e7ebef' },
		{ id: newId(), kind: 'bathtub', x: 120, y: 570, rotation: 0, w: 170, d: 75, label: 'Ванна', color: '#e7ebef' },
	);
	const lampLiving = { id: newId(), kind: 'light-ceiling', x: 260, y: 210, rotation: 0 };
	const lampBed = { id: newId(), kind: 'light-ceiling', x: 700, y: 210, rotation: 0 };
	s.symbols.push(
		{ id: newId(), kind: 'socket-double', x: 60, y: 300, rotation: 0 },
		{ id: newId(), kind: 'switch-1', x: 470, y: 60, rotation: 0, links: [lampLiving.id] },
		lampLiving,
		lampBed,
		{ id: newId(), kind: 'radiator-bimetal', x: 260, y: 12, rotation: 0 },
		{ id: newId(), kind: 'water-cold', x: 40, y: 500, rotation: 0 },
	);
	s.routes.push({ id: newId(), kind: 'wire', points: [{ x: 470, y: 60 }, { x: 380, y: 150 }, { x: 260, y: 210 }] });
	s.routes.push({ id: newId(), kind: 'pipe-cold', points: [{ x: 40, y: 500 }, { x: 120, y: 570 }] });
	s.compass = { x: 980, y: 90, rotation: 0 };
	s.texts.push({ id: newId(), x: 20, y: -220, text: 'Демо-план', size: 40, rotation: 0 });
	s.settings.showOverallChains = true;
	return s;
}

function Preview() {
	const scene = demoScene();
	const [mode, setMode] = useState<RenderMode>('color');
	const [poche, setPoche] = useState(false);
	const [png, setPng] = useState<string | null>(null);
	const view = { scale: 1.0, offsetX: 160, offsetY: 200 };

	const doExport = async (t: RenderMode) => {
		const url = await exportSceneToDataURL(scene, {
			theme: t,
			pixelRatio: 2,
			options: { ...defaultOptions, showGrid: false },
			title: 'Демо-квартира',
			showTitleBlock: true,
			showFurnitureLegend: true,
			showRoomTable: true,
			showFinishSchedule: true,
			showEngSpec: true,
			showReconfig: true,
			showTiling: true,
			paper: 'A3',
			orientation: 'auto',
			scaleRatio: 50,
			dpi: 150,
		});
		setPng(url);
	};

	return (
		<div style={{ padding: 12, fontFamily: 'Inter, sans-serif' }}>
			<div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
				{(['line', 'blueprint', 'color'] as RenderMode[]).map((m) => (
					<button key={m} id={`mode-${m}`} onClick={() => setMode(m)} style={{ padding: '4px 10px', background: mode === m ? '#0b3d91' : '#eee', color: mode === m ? '#fff' : '#000', border: 0, borderRadius: 4 }}>
						{m}
					</button>
				))}
				<button id="export-blue" onClick={() => doExport('blueprint')} style={{ padding: '4px 10px' }}>
					Експорт синій
				</button>
				<button id="export-line" onClick={() => doExport('line')} style={{ padding: '4px 10px' }}>
					Експорт лінійний
				</button>
				<label id="poche" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<input type="checkbox" checked={poche} onChange={(e) => setPoche(e.target.checked)} /> poché
				</label>
			</div>
			<div style={{ border: '1px solid #ccc', width: 1180, height: 680 }}>
				<Stage width={1180} height={680}>
					<SceneView scene={scene} view={view} theme={themeForMode(mode)} stageWidth={1180} stageHeight={680} options={{ ...defaultOptions, pocheWalls: poche }} />
				</Stage>
			</div>
			{png && <img id="export-img" src={png} style={{ display: 'block', marginTop: 12, width: 980, border: '1px solid #000' }} />}
		</div>
	);
}

function EditorHarness() {
	const view3d = usePlannerStore((s) => s.view3d);
	const scene = usePlannerStore((s) => s.scene);
	useEffect(() => {
		const now = Date.now();
		usePlannerStore.getState().loadProject({
			id: 'demo',
			name: 'Демо-квартира',
			scene: demoScene(),
			createdAt: now,
			updatedAt: now,
			createdByEmail: 'demo@demo',
		});
	}, []);
	// мінімальні гарячі клавіші для dev-харнеса (у застосунку — у pages/Editor.tsx)
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
			const s = usePlannerStore.getState();
			if (e.key === '?') s.setHelpOpen(!s.helpOpen);
			else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) s.frameSelection(s.stageSize.width, s.stageSize.height);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);
	return (
		<MemoryRouter>
			<div className="flex h-screen flex-col">
				<TopBar onExport={() => {}} onSave={() => {}} saving={false} />
				<div className="flex min-h-0 flex-1">
					{!view3d && <Toolbar />}
					{!view3d && <LeftPanel />}
					<div className="min-w-0 flex-1">
						{view3d ? (
							<Suspense fallback={<div className="p-4 text-sm text-muted">Завантаження 3D…</div>}>
								<Scene3D scene={scene} />
							</Suspense>
						) : (
							<PlannerCanvas />
						)}
					</div>
					{!view3d && <PropertiesPanel />}
				</div>
				<ElevationView />
				<ShortcutsHelp />
			</div>
		</MemoryRouter>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(new URLSearchParams(location.search).has('editor') ? <EditorHarness /> : <Preview />);
