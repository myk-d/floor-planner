import { Loader2 } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PlannerCanvas from '../components/Editor/Canvas/PlannerCanvas';
import ElevationView from '../components/Editor/ElevationView';
import ExportModal from '../components/Editor/ExportModal';
import LeftPanel from '../components/Editor/LeftPanel';

const Scene3D = lazy(() => import('../components/Editor/3d/Scene3D'));
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import ShortcutsHelp from '../components/Editor/ShortcutsHelp';
import Toolbar from '../components/Editor/Toolbar';
import TopBar from '../components/Editor/TopBar';
import { toast } from '../components/UI/toast';
import { UrlConfig } from '../constants/urls';
import { dbProjects } from '../services/projects.service';
import { usePlannerStore, type Tool } from '../store/usePlannerStore';

const SHORTCUTS: Record<string, Tool> = {
	v: 'select',
	w: 'wall',
	r: 'room',
	d: 'door',
	n: 'window',
	o: 'opening',
	t: 'text',
	m: 'dimension',
	l: 'measure',
	h: 'pan',
};

export default function Editor() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
	const [saving, setSaving] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);

	const { scene, dirty, loadProject, markSaved, undo, redo, deleteSelected, duplicateSelected, setTool, copySelection, paste, nudgeSelected, addFurniture, view, view3d } =
		usePlannerStore();

	useEffect(() => {
		if (!projectId) return;
		let cancelled = false;
		dbProjects
			.getById(projectId)
			.then((doc) => {
				if (cancelled) return;
				if (!doc) {
					setStatus('missing');
					return;
				}
				loadProject(doc);
				setStatus('ready');
			})
			.catch((err) => {
				console.error(err);
				if (!cancelled) {
					toast.error('Не вдалося завантажити проєкт.');
					setStatus('missing');
				}
			});
		return () => {
			cancelled = true;
		};
	}, [projectId, loadProject]);

	const save = useCallback(async () => {
		if (!projectId) return;
		const current = usePlannerStore.getState();
		if (!current.dirty) return;
		setSaving(true);
		try {
			const variants = current.variantsForSave();
			const active = variants.find((v) => v.id === current.activeVariantId) ?? variants[0];
			await dbProjects.update({
				id: projectId,
				name: (active?.scene ?? current.scene).settings.title,
				scene: active?.scene ?? current.scene,
				variants,
				activeVariantId: current.activeVariantId ?? undefined,
				updatedAt: Date.now(),
			});
			markSaved();
		} catch (err) {
			console.error(err);
			toast.error('Не вдалося зберегти.');
		} finally {
			setSaving(false);
		}
	}, [projectId, markSaved]);

	// автозбереження з дебаунсом
	const timer = useRef<number | null>(null);
	useEffect(() => {
		if (status !== 'ready' || !dirty) return;
		if (timer.current) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(save, 1500);
		return () => {
			if (timer.current) window.clearTimeout(timer.current);
		};
	}, [scene, dirty, status, save]);

	// попередження при закритті вкладки
	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (usePlannerStore.getState().dirty) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, []);

	// гарячі клавіші
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				if (e.shiftKey) redo();
				else undo();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
				e.preventDefault();
				redo();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
				e.preventDefault();
				duplicateSelected();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
				e.preventDefault();
				save();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
				copySelection();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
				paste();
				return;
			}
			if (e.key === 'Delete' || e.key === 'Backspace') {
				deleteSelected();
				return;
			}
			if (e.key.startsWith('Arrow')) {
				const step = e.shiftKey ? 10 : 1;
				const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
				if (d) {
					e.preventDefault();
					nudgeSelected(d[0], d[1]);
				}
				return;
			}
			if (e.key === '?') {
				e.preventDefault();
				const { helpOpen, setHelpOpen } = usePlannerStore.getState();
				setHelpOpen(!helpOpen);
				return;
			}
			if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				const { stageSize, frameSelection } = usePlannerStore.getState();
				frameSelection(stageSize.width, stageSize.height);
				return;
			}
			const tool = SHORTCUTS[e.key.toLowerCase()];
			if (tool && !e.ctrlKey && !e.metaKey) setTool(tool);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [undo, redo, deleteSelected, duplicateSelected, setTool, save, copySelection, paste, nudgeSelected]);

	if (status === 'loading') {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-brand" />
			</div>
		);
	}
	if (status === 'missing') {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted">
				Проєкт не знайдено.
				<button onClick={() => navigate(UrlConfig.projects)} className="text-brand underline">
					До списку проєктів
				</button>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<TopBar key={projectId} onExport={() => setExportOpen(true)} onSave={save} saving={saving} />
			<div className="flex min-h-0 flex-1">
				{!view3d && <Toolbar />}
				{!view3d && <LeftPanel />}
				<div
					className="min-w-0 flex-1"
					onDragOver={(e) => !view3d && e.preventDefault()}
					onDrop={(e) => {
						if (view3d) return;
						const kind = e.dataTransfer.getData('application/x-furniture');
						if (!kind) return;
						const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
						const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
						addFurniture(kind, {
							x: (screen.x - view.offsetX) / view.scale,
							y: (screen.y - view.offsetY) / view.scale,
						});
					}}
				>
					{view3d ? (
						<Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted">Завантаження 3D…</div>}>
							<Scene3D scene={scene} />
						</Suspense>
					) : (
						<PlannerCanvas />
					)}
				</div>
				{!view3d && <PropertiesPanel />}
			</div>
			<ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
			<ElevationView />
			<ShortcutsHelp />
		</div>
	);
}
