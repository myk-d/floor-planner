import { ArrowLeft, Check, CircleHelp, Compass, Download, FileDown, Grid2x2, Hammer, Maximize, Palette, PenLine, Redo2, Rows3, ScanSearch, Save, Undo2, Zap } from 'lucide-react';
import { toProjectFile } from '../../domain/projectFile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UrlConfig } from '../../constants/urls';
import type { RenderMode, Units } from '../../domain/scene';
import { cn } from '../../utils/cn';
import { usePlannerStore } from '../../store/usePlannerStore';
import Button from '../UI/Button';

const MODES: { mode: RenderMode; label: string; icon: React.ReactNode }[] = [
	{ mode: 'line', label: 'Лінійний', icon: <PenLine className="h-4 w-4" /> },
	{ mode: 'blueprint', label: 'Синє креслення', icon: <Grid2x2 className="h-4 w-4" /> },
	{ mode: 'color', label: 'Кольоровий', icon: <Palette className="h-4 w-4" /> },
];

export default function TopBar({ onExport, onSave, saving }: { onExport: () => void; onSave: () => void; saving: boolean }) {
	const navigate = useNavigate();
	const {
		scene,
		dirty,
		undo,
		redo,
		past,
		future,
		view,
		fitToScene,
		stageSize,
		setUnits,
		setTitle,
		setRenderMode,
		toggleOverallChains,
		toggleDemolition,
		toggleColorByCircuit,
		addCompassAtViewCenter,
		autoDetectRooms,
		view3d,
		toggle3d,
		setHelpOpen,
		setPlanPhase,
	} = usePlannerStore();
	const [title, setLocalTitle] = useState(scene.settings.title);

	return (
		<div className="flex h-12 items-center gap-2 border-b border-panel-border bg-panel px-3">
			<button onClick={() => navigate(UrlConfig.projects)} className="rounded p-1.5 text-muted hover:bg-page-bg" title="До проєктів">
				<ArrowLeft className="h-4 w-4" />
			</button>

			<input
				value={title}
				onChange={(e) => setLocalTitle(e.target.value)}
				onBlur={() => setTitle(title.trim() || 'Без назви')}
				onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
				className="w-48 rounded border border-transparent px-2 py-1 text-sm font-medium hover:border-panel-border focus:border-brand focus:outline-none"
			/>

			<div className="mx-1 h-6 w-px bg-panel-border" />

			<button onClick={undo} disabled={past.length === 0} className="rounded p-1.5 text-muted hover:bg-page-bg disabled:opacity-30" title="Скасувати (Ctrl+Z)">
				<Undo2 className="h-4 w-4" />
			</button>
			<button onClick={redo} disabled={future.length === 0} className="rounded p-1.5 text-muted hover:bg-page-bg disabled:opacity-30" title="Повторити (Ctrl+Shift+Z)">
				<Redo2 className="h-4 w-4" />
			</button>
			<button
				onClick={() => fitToScene(stageSize.width, stageSize.height)}
				className="rounded p-1.5 text-muted hover:bg-page-bg"
				title="За розміром"
			>
				<Maximize className="h-4 w-4" />
			</button>
			<span className="w-12 text-center text-xs text-muted">{Math.round(view.scale * 100)}%</span>

			<div className="mx-1 h-6 w-px bg-panel-border" />

			<div className="flex overflow-hidden rounded-md border border-panel-border">
				<button
					onClick={() => view3d && toggle3d()}
					className={cn('h-7 px-2 text-xs font-medium', !view3d ? 'bg-brand text-white' : 'text-muted hover:bg-page-bg')}
				>
					2D
				</button>
				<button
					onClick={() => !view3d && toggle3d()}
					className={cn('h-7 px-2 text-xs font-medium', view3d ? 'bg-brand text-white' : 'text-muted hover:bg-page-bg')}
				>
					3D
				</button>
			</div>

			<div className={cn('flex overflow-hidden rounded-md border border-panel-border', view3d && 'pointer-events-none opacity-40')}>
				{MODES.map((m) => (
					<button
						key={m.mode}
						title={m.label}
						onClick={() => setRenderMode(m.mode)}
						className={cn(
							'flex h-7 w-8 items-center justify-center transition-colors',
							scene.settings.renderMode === m.mode ? 'bg-brand text-white' : 'text-muted hover:bg-page-bg',
						)}
					>
						{m.icon}
					</button>
				))}
			</div>

			<button
				title="Ланцюги розмірів по периметру"
				onClick={toggleOverallChains}
				className={cn(
					'flex h-7 w-8 items-center justify-center rounded-md border border-panel-border',
					scene.settings.showOverallChains ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg',
				)}
			>
				<Rows3 className="h-4 w-4" />
			</button>
			<button
				title="Компас / північ"
				onClick={addCompassAtViewCenter}
				className={cn(
					'flex h-7 w-8 items-center justify-center rounded-md border border-panel-border',
					scene.compass ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg',
				)}
			>
				<Compass className="h-4 w-4" />
			</button>
			<button
				title="Визначити кімнати з контурів стін"
				onClick={autoDetectRooms}
				className="flex h-7 w-8 items-center justify-center rounded-md border border-panel-border text-muted hover:bg-page-bg"
			>
				<ScanSearch className="h-4 w-4" />
			</button>
			<button
				title="Підсвітити демонтаж / нові (у фазі «Все»)"
				onClick={toggleDemolition}
				className={cn(
					'flex h-7 w-8 items-center justify-center rounded-md border border-panel-border',
					scene.settings.showDemolition ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg',
				)}
			>
				<Hammer className="h-4 w-4" />
			</button>
			<select
				value={scene.settings.planPhase ?? 'both'}
				onChange={(e) => setPlanPhase(e.target.value as 'both' | 'before' | 'after')}
				className={cn(
					'h-7 rounded-md border border-panel-border bg-panel px-1.5 text-xs',
					(scene.settings.planPhase ?? 'both') !== 'both' && 'bg-brand-bg text-brand',
				)}
				title="Фаза плану"
			>
				<option value="both">Фаза: все</option>
				<option value="before">Фаза: до</option>
				<option value="after">Фаза: після</option>
			</select>
			<button
				title="Фарбувати інженерні лінії за групою"
				onClick={toggleColorByCircuit}
				className={cn(
					'flex h-7 w-8 items-center justify-center rounded-md border border-panel-border',
					scene.settings.colorByCircuit ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg',
				)}
			>
				<Zap className="h-4 w-4" />
			</button>

			<div className="mx-1 h-6 w-px bg-panel-border" />

			<select
				value={scene.settings.units}
				onChange={(e) => setUnits(e.target.value as Units)}
				className="rounded-md border border-panel-border bg-panel px-2 py-1 text-xs"
				title="Одиниці"
			>
				<option value="m">метри</option>
				<option value="cm">сантиметри</option>
				<option value="mm">міліметри</option>
			</select>

			<div className="ml-auto flex items-center gap-2">
				<button
					title="Гарячі клавіші (?)"
					onClick={() => setHelpOpen(true)}
					className="flex h-8 w-8 items-center justify-center rounded-md border border-panel-border text-muted hover:bg-page-bg"
				>
					<CircleHelp className="h-4 w-4" />
				</button>
				<span className="flex items-center gap-1 text-xs text-muted">
					{dirty ? (
						'Не збережено'
					) : (
						<>
							<Check className="h-3.5 w-3.5 text-ok" /> Збережено
						</>
					)}
				</span>
				<button
					title="Зберегти як .floorplan (файл)"
					onClick={() => {
						const st = usePlannerStore.getState();
						const json = toProjectFile(scene.settings.title, scene, st.variantsForSave(), st.activeVariantId ?? undefined);
						const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
						const a = document.createElement('a');
						a.href = url;
						a.download = `${(scene.settings.title || 'plan').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.floorplan`;
						a.click();
						setTimeout(() => URL.revokeObjectURL(url), 2000);
					}}
					className="flex h-8 w-8 items-center justify-center rounded-md border border-panel-border text-muted hover:bg-page-bg"
				>
					<FileDown className="h-4 w-4" />
				</button>
				<Button size="sm" variant="outline" onClick={onSave} isLoading={saving} disabled={!dirty && !saving}>
					<Save className="h-4 w-4" />
					Зберегти
				</Button>
				<Button size="sm" onClick={onExport}>
					<Download className="h-4 w-4" />
					Експорт
				</Button>
			</div>
		</div>
	);
}
