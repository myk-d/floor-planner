import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RenderMode } from '../../domain/scene';
import { toast } from '../UI/toast';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import { usePlannerStore } from '../../store/usePlannerStore';
import { sceneToSVG } from '../../domain/svgExport';
import { defaultOptions, type SceneViewOptions } from './render/SceneView';
import { exportFits, exportSceneToDataURL, type ExportOptions, type PaperSize, type ScaleRatio } from './render/exportScene';

const OPTION_LABELS: { key: keyof SceneViewOptions; label: string }[] = [
	{ key: 'showDimensions', label: 'Розміри стін' },
	{ key: 'showOverallChains', label: 'Ланцюги розмірів по периметру' },
	{ key: 'showRoomLabels', label: 'Назви та площі кімнат' },
	{ key: 'showFurnitureLabels', label: 'Підписи меблів' },
	{ key: 'showEngineering', label: 'Інженерні елементи' },
	{ key: 'showSymbolHeights', label: 'Висоти інженерних символів' },
	{ key: 'showFinishes', label: 'Покриття / штриховки' },
	{ key: 'showGrid', label: 'Сітка' },
	{ key: 'showTexts', label: 'Текстові підписи' },
	{ key: 'showCompass', label: 'Компас' },
];

const THEMES: { v: RenderMode; l: string; bg: string; fg: string; border?: boolean }[] = [
	{ v: 'blueprint', l: 'Синє креслення', bg: '#0b3d91', fg: '#fff' },
	{ v: 'line', l: 'Лінійний', bg: '#ffffff', fg: '#111', border: true },
	{ v: 'color', l: 'Кольоровий', bg: '#f4f5f7', fg: '#111', border: true },
];

export default function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const scene = usePlannerStore((s) => s.scene);
	const [theme, setTheme] = useState<RenderMode>('blueprint');
	const [format, setFormat] = useState<'png' | 'pdf' | 'svg'>('pdf');
	const [pixelRatio, setPixelRatio] = useState(2);
	const [paper, setPaper] = useState<PaperSize>('fit');
	const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'auto'>('auto');
	const [scaleRatio, setScaleRatio] = useState<ScaleRatio>(0);
	const [dpi, setDpi] = useState<150 | 300>(150);
	const [showTitleBlock, setShowTitleBlock] = useState(true);
	const [showFurnitureLegend, setShowFurnitureLegend] = useState(false);
	const [showRoomTable, setShowRoomTable] = useState(true);
	const [showFinishSchedule, setShowFinishSchedule] = useState(false);
	const [opts, setOpts] = useState<SceneViewOptions>({ ...defaultOptions, showGrid: false });
	const [busy, setBusy] = useState(false);

	const fileBase = (scene.settings.title || 'plan').replace(/[^\p{L}\p{N}_-]+/gu, '_');

	const exportOpts = useMemo<ExportOptions>(
		() => ({ theme, pixelRatio, options: opts, title: scene.settings.title, showTitleBlock, showFurnitureLegend, showRoomTable, showFinishSchedule, paper, orientation, scaleRatio, dpi }),
		[theme, pixelRatio, opts, scene.settings.title, showTitleBlock, showFurnitureLegend, showRoomTable, showFinishSchedule, paper, orientation, scaleRatio, dpi],
	);
	const fits = paper === 'fit' || exportFits(scene, exportOpts);

	const run = async () => {
		setBusy(true);
		try {
			if (format === 'svg') {
				const svg = sceneToSVG(scene, {
					theme,
					showDimensions: opts.showDimensions,
					showOverallChains: opts.showOverallChains,
					showRoomLabels: opts.showRoomLabels,
					showFurnitureLabels: opts.showFurnitureLabels,
					showFinishes: opts.showFinishes,
					title: scene.settings.title,
				});
				const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
				triggerDownload(url, `${fileBase}.svg`);
				setTimeout(() => URL.revokeObjectURL(url), 2000);
			} else {
				const dataUrl = await exportSceneToDataURL(scene, exportOpts);
				if (format === 'png') {
					triggerDownload(dataUrl, `${fileBase}.png`);
				} else {
					const img = await loadImage(dataUrl);
					const o = img.width >= img.height ? 'landscape' : 'portrait';
					const pdf = new jsPDF({ orientation: o, unit: 'px', format: [img.width, img.height], compress: true });
					pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
					pdf.save(`${fileBase}.pdf`);
				}
			}
			toast.success('Готово. Перевірте завантаження.');
			onClose();
		} catch (err) {
			console.error(err);
			toast.error('Не вдалося зробити експорт.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title="Експорт креслення" className="max-w-xl">
			<div className="space-y-4 text-sm">
				<div>
					<span className="mb-1.5 block text-xs font-medium text-muted">Стиль</span>
					<div className="grid grid-cols-3 gap-2">
						{THEMES.map((t) => (
							<button key={t.v} onClick={() => setTheme(t.v)} className={`rounded-md border-2 p-2 text-left ${theme === t.v ? 'border-brand' : 'border-panel-border'}`}>
								<span className={`mb-1.5 flex h-10 w-full items-center justify-center rounded text-xs ${t.border ? 'border border-panel-border' : ''}`} style={{ background: t.bg, color: t.fg }}>
									3,45
								</span>
								<span className="text-xs font-medium">{t.l}</span>
							</button>
						))}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<label>
						<span className="mb-1 block text-xs font-medium text-muted">Формат файлу</span>
						<select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'pdf' | 'svg')} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2">
							<option value="pdf">PDF</option>
							<option value="png">PNG</option>
							<option value="svg">SVG (векторний)</option>
						</select>
					</label>
					<label>
						<span className="mb-1 block text-xs font-medium text-muted">Якість (растр)</span>
						<select value={pixelRatio} onChange={(e) => setPixelRatio(Number(e.target.value))} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2">
							<option value={1}>1×</option>
							<option value={2}>2×</option>
							<option value={3}>3×</option>
						</select>
					</label>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<label>
						<span className="mb-1 block text-xs font-medium text-muted">Розмір аркуша</span>
						<select value={paper} onChange={(e) => setPaper(e.target.value as PaperSize)} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2">
							<option value="fit">За вмістом</option>
							<option value="A4">A4</option>
							<option value="A3">A3</option>
							<option value="A2">A2</option>
							<option value="A1">A1</option>
						</select>
					</label>
					<label>
						<span className="mb-1 block text-xs font-medium text-muted">Орієнтація</span>
						<select value={orientation} onChange={(e) => setOrientation(e.target.value as typeof orientation)} disabled={paper === 'fit'} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2 disabled:opacity-50">
							<option value="auto">Авто</option>
							<option value="landscape">Альбомна</option>
							<option value="portrait">Книжкова</option>
						</select>
					</label>
				</div>

				{paper !== 'fit' && (
					<div className="grid grid-cols-2 gap-3">
						<label>
							<span className="mb-1 block text-xs font-medium text-muted">Масштаб креслення</span>
							<select value={scaleRatio} onChange={(e) => setScaleRatio(Number(e.target.value) as ScaleRatio)} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2">
								<option value={0}>Вписати в аркуш</option>
								<option value={20}>1:20</option>
								<option value={50}>1:50</option>
								<option value={100}>1:100</option>
								<option value={200}>1:200</option>
							</select>
						</label>
						<label>
							<span className="mb-1 block text-xs font-medium text-muted">DPI</span>
							<select value={dpi} onChange={(e) => setDpi(Number(e.target.value) as 150 | 300)} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2">
								<option value={150}>150</option>
								<option value={300}>300</option>
							</select>
						</label>
					</div>
				)}
				{!fits && <p className="rounded bg-red-50 px-2 py-1 text-xs text-danger">План не вміщається в аркуш за цим масштабом — оберіть менший масштаб або більший аркуш.</p>}

				<div>
					<span className="mb-1.5 block text-xs font-medium text-muted">Показувати</span>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
						{OPTION_LABELS.map(({ key, label }) => (
							<label key={key} className="flex items-center gap-2">
								<input type="checkbox" checked={opts[key]} onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))} />
								{label}
							</label>
						))}
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={showTitleBlock} onChange={(e) => setShowTitleBlock(e.target.checked)} />
							Штамп
						</label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={showRoomTable} onChange={(e) => setShowRoomTable(e.target.checked)} />
							Експлікація приміщень
						</label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={showFurnitureLegend} onChange={(e) => setShowFurnitureLegend(e.target.checked)} />
							Специфікація меблів
						</label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={showFinishSchedule} onChange={(e) => setShowFinishSchedule(e.target.checked)} />
							Відомість оздоблення
						</label>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-1">
					<Button variant="outline" onClick={onClose}>
						Скасувати
					</Button>
					<Button onClick={run} isLoading={busy}>
						<Download className="h-4 w-4" />
						Завантажити
					</Button>
				</div>
			</div>
		</Modal>
	);
}

function triggerDownload(dataUrl: string, filename: string) {
	const a = document.createElement('a');
	a.href = dataUrl;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}
