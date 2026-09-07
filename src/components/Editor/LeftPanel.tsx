import { ChevronDown, Eye, EyeOff, Lock, LockOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATALOG, CATALOG_CATEGORIES, type CatalogCategory } from '../../constants/catalog';
import { ENG_CATEGORIES, ENG_SYMBOLS, ROUTE_STYLES, ZONE_KINDS, type EngCategory } from '../../constants/engineering';
import { circuitGroups } from '../../domain/circuits';
import { finishEstimate } from '../../domain/finishes';
import { engineeringSpec } from '../../domain/engspec';
import { reconfigSummary } from '../../domain/reconfig';
import type { FloorKind, LayerName, WallMaterial } from '../../domain/scene';
import { cn } from '../../utils/cn';
import { toWorld, usePlannerStore } from '../../store/usePlannerStore';

type Tab = 'catalog' | 'engineering' | 'finishes' | 'objects';

const TABS: { id: Tab; label: string }[] = [
	{ id: 'catalog', label: 'Каталог' },
	{ id: 'engineering', label: 'Інженерне' },
	{ id: 'finishes', label: 'Оздоблення' },
	{ id: 'objects', label: "Об'єкти" },
];

export default function LeftPanel() {
	const [tab, setTab] = useState<Tab>('catalog');
	return (
		<div className="flex w-64 shrink-0 flex-col border-r border-panel-border bg-panel">
			<div className="flex border-b border-panel-border text-xs">
				{TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={cn('flex-1 py-2 font-medium transition-colors', tab === t.id ? 'border-b-2 border-brand text-brand' : 'text-muted hover:bg-page-bg')}
					>
						{t.label}
					</button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{tab === 'catalog' && <CatalogTab />}
				{tab === 'engineering' && <EngineeringTab />}
				{tab === 'finishes' && <FinishesTab />}
				{tab === 'objects' && <ObjectsTab />}
			</div>
		</div>
	);
}

function centerWorld() {
	const { view, stageSize } = usePlannerStore.getState();
	return toWorld({ x: stageSize.width / 2, y: stageSize.height / 2 }, view);
}

function CatalogTab() {
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState<CatalogCategory[]>([CATALOG_CATEGORIES[0]]);
	const addFurniture = usePlannerStore((s) => s.addFurniture);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return CATALOG.filter((c) => !q || c.label.toLowerCase().includes(q));
	}, [query]);

	return (
		<div className="p-2">
			<SearchBox value={query} onChange={setQuery} placeholder="Пошук меблів…" />
			{CATALOG_CATEGORIES.map((cat) => {
				const items = filtered.filter((c) => c.category === cat);
				if (!items.length) return null;
				const isOpen = query.trim() !== '' || open.includes(cat);
				return (
					<Accordion key={cat} title={cat} open={isOpen} onToggle={() => setOpen((o) => (o.includes(cat) ? o.filter((c) => c !== cat) : [...o, cat]))}>
						<div className="grid grid-cols-2 gap-1 pb-1">
							{items.map((c) => (
								<button
									key={c.kind}
									draggable
									onDragStart={(e) => e.dataTransfer.setData('application/x-furniture', c.kind)}
									onClick={() => addFurniture(c.kind, centerWorld())}
									className="flex flex-col items-center gap-1 rounded-md border border-panel-border bg-page-bg p-2 text-center text-[11px] leading-tight hover:border-brand hover:bg-brand-bg"
								>
									<span className="block h-8 w-full rounded border border-panel-border" style={{ background: c.color, aspectRatio: `${c.w} / ${c.d}` }} />
									{c.label}
									<span className="text-[10px] text-muted">
										{c.w}×{c.d}
									</span>
								</button>
							))}
						</div>
					</Accordion>
				);
			})}
		</div>
	);
}

function EngineeringTab() {
	const [cat, setCat] = useState<EngCategory>('Електрика');
	const { setTool, tool, pendingKind } = usePlannerStore();

	return (
		<div className="p-2">
			<div className="mb-2 flex gap-1">
				{ENG_CATEGORIES.map((c) => (
					<button
						key={c}
						onClick={() => setCat(c)}
						className={cn('flex-1 rounded border px-1 py-1 text-[11px]', cat === c ? 'border-brand bg-brand-bg text-brand' : 'border-panel-border hover:bg-page-bg')}
					>
						{c}
					</button>
				))}
			</div>

			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Символи</p>
			<div className="grid grid-cols-2 gap-1">
				{ENG_SYMBOLS.filter((s) => s.category === cat).map((s) => (
					<button
						key={s.kind}
						onClick={() => setTool('symbol', s.kind)}
						className={cn(
							'rounded-md border p-2 text-left text-[11px] leading-tight hover:border-brand hover:bg-brand-bg',
							tool === 'symbol' && pendingKind === s.kind ? 'border-brand bg-brand-bg' : 'border-panel-border bg-page-bg',
						)}
					>
						{s.label}
					</button>
				))}
			</div>

			<p className="mb-1 mt-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Лінії розведення</p>
			<div className="space-y-1">
				{ROUTE_STYLES.filter((r) => r.category === cat).map((r) => (
					<button
						key={r.kind}
						onClick={() => setTool(r.kind === 'wire' ? 'wire' : 'pipe', r.kind)}
						className={cn(
							'flex w-full items-center gap-2 rounded-md border p-2 text-left text-[11px] hover:border-brand hover:bg-brand-bg',
							(tool === 'wire' || tool === 'pipe') && pendingKind === r.kind ? 'border-brand bg-brand-bg' : 'border-panel-border bg-page-bg',
						)}
					>
						<span className="h-1 w-6 rounded" style={{ background: r.color }} />
						{r.label}
					</button>
				))}
			</div>

			{ZONE_KINDS.filter((z) => z.category === cat).length > 0 && (
				<>
					<p className="mb-1 mt-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Зони</p>
					<div className="space-y-1">
						{ZONE_KINDS.filter((z) => z.category === cat).map((z) => (
							<button
								key={z.kind}
								onClick={() => setTool('zone', z.kind)}
								className={cn(
									'flex w-full items-center gap-2 rounded-md border p-2 text-left text-[11px] hover:border-brand',
									tool === 'zone' && pendingKind === z.kind ? 'border-brand bg-brand-bg' : 'border-panel-border bg-page-bg',
								)}
							>
								<span className="h-3 w-3 rounded border" style={{ background: z.fill, borderColor: z.stroke }} />
								{z.label}
							</button>
						))}
					</div>
				</>
			)}
			<p className="mt-2 px-1 text-[10px] text-muted">Клік — ставить символ. Лінія/зона — клацай по точках, Enter завершує.</p>
		</div>
	);
}

const FLOOR_OPTS: { v: FloorKind; l: string; c: string }[] = [
	{ v: 'parquet', l: 'Паркет', c: '#d8b98c' },
	{ v: 'laminate', l: 'Ламінат', c: '#e2cba6' },
	{ v: 'tile', l: 'Плитка', c: '#dfe4e8' },
	{ v: 'carpet', l: 'Килим', c: '#cdbfae' },
	{ v: 'concrete', l: 'Бетон', c: '#cfd2d6' },
	{ v: 'none', l: 'Прибрати', c: '#ffffff' },
];
const WALL_OPTS: { v: WallMaterial; l: string }[] = [
	{ v: 'block', l: 'Блоки' },
	{ v: 'brick', l: 'Цегла' },
	{ v: 'concrete', l: 'Бетон' },
	{ v: 'drywall', l: 'Гіпсокартон' },
	{ v: 'wood', l: 'Дерево' },
	{ v: 'glass', l: 'Скло' },
];

function FinishesTab() {
	const { scene, selected, setRoomFloor, setWallMaterial, saveStyleboard, applyStyleboard, deleteStyleboard } = usePlannerStore();
	const roomSel = selected.filter((s) => s.type === 'room');
	const wallSel = selected.filter((s) => s.type === 'wall');
	const [sbName, setSbName] = useState('');
	return (
		<div className="space-y-4 p-3">
			<div>
				<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Стайлборди</p>
				<div className="mb-1 flex gap-1">
					<input value={sbName} onChange={(e) => setSbName(e.target.value)} placeholder="Назва набору" className="min-w-0 flex-1 rounded border border-panel-border px-2 py-1 text-[11px]" />
					<button
						disabled={!roomSel.length && !wallSel.length}
						onClick={() => {
							saveStyleboard(sbName || 'Набір');
							setSbName('');
						}}
						className="rounded border border-panel-border px-2 py-1 text-[11px] hover:border-brand disabled:opacity-40"
					>
						Зберегти
					</button>
				</div>
				{scene.styleboards.length === 0 && <p className="text-[11px] text-muted">Виберіть кімнату/стіну і збережіть набір оздоблення.</p>}
				<div className="space-y-1">
					{scene.styleboards.map((sb) => (
						<div key={sb.id} className="flex items-center gap-1 rounded border border-panel-border p-1.5 text-[11px]">
							<span className="h-3 w-3 rounded border" style={{ background: sb.floor.color }} />
							<span className="flex-1 truncate">{sb.name}</span>
							<button onClick={() => applyStyleboard(sb.id)} disabled={!selected.length} className="rounded bg-brand-bg px-1.5 text-brand disabled:opacity-40">
								Застосувати
							</button>
							<button onClick={() => deleteStyleboard(sb.id)} className="text-danger">
								✕
							</button>
						</div>
					))}
				</div>
			</div>
			<div className="h-px bg-panel-border" />
			<div>
				<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Підлога кімнати</p>
				<p className="mb-2 text-[11px] text-muted">{roomSel.length ? `Вибрано кімнат: ${roomSel.length}` : 'Виберіть кімнату(и) на плані'}</p>
				<div className="grid grid-cols-2 gap-1">
					{FLOOR_OPTS.map((f) => (
						<button
							key={f.v}
							disabled={!roomSel.length}
							onClick={() => roomSel.forEach((s) => setRoomFloor(s.id, { kind: f.v, color: f.c }))}
							className="flex items-center gap-2 rounded-md border border-panel-border p-2 text-left text-[11px] hover:border-brand disabled:opacity-40"
						>
							<span className="h-4 w-4 rounded border border-panel-border" style={{ background: f.c }} />
							{f.l}
						</button>
					))}
				</div>
			</div>
			<div>
				<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Матеріал стіни</p>
				<p className="mb-2 text-[11px] text-muted">{wallSel.length ? `Вибрано стін: ${wallSel.length}` : 'Виберіть стіну(и) на плані'}</p>
				<div className="grid grid-cols-2 gap-1">
					{WALL_OPTS.map((m) => (
						<button
							key={m.v}
							disabled={!wallSel.length}
							onClick={() => setWallMaterial(wallSel.map((s) => s.id), m.v)}
							className="rounded-md border border-panel-border p-2 text-left text-[11px] hover:border-brand disabled:opacity-40"
						>
							{m.l}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

const LAYER_LABELS: Record<LayerName, string> = {
	construction: 'Конструкція',
	openings: 'Отвори',
	furniture: 'Меблі',
	engineering: 'Інженерне',
	dimensions: 'Розміри',
	labels: 'Підписи / компас',
};

function ObjectsTab() {
	const { scene, select, toggleLayerVisible, toggleLayerLocked } = usePlannerStore();
	const layers = scene.settings.layers;
	return (
		<div className="p-2">
			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Шари</p>
			<div className="mb-3 space-y-0.5">
				{(Object.keys(LAYER_LABELS) as LayerName[]).map((l) => (
					<div key={l} className="flex items-center gap-1 rounded px-1 py-1 text-xs hover:bg-page-bg">
						<button onClick={() => toggleLayerVisible(l)} className="text-muted hover:text-page-text">
							{layers[l].visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
						</button>
						<button onClick={() => toggleLayerLocked(l)} className="text-muted hover:text-page-text">
							{layers[l].locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
						</button>
						<span className={cn('flex-1', !layers[l].visible && 'text-muted line-through')}>{LAYER_LABELS[l]}</span>
					</div>
				))}
			</div>
			{circuitGroups(scene).length > 0 && (
				<>
					<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Групи / лінії</p>
					<div className="mb-3 space-y-0.5">
						{circuitGroups(scene).map((g) => (
							<div key={g.circuit} className="flex items-center gap-2 px-1 py-0.5 text-xs">
								<span className="h-3 w-3 rounded-sm" style={{ background: g.color }} />
								<span className="flex-1 truncate">{g.circuit}</span>
								<span className="text-muted">{g.count}</span>
							</div>
						))}
					</div>
				</>
			)}
			<ReconfigSummary />
			<EngSummary />
			<FinishSummary />
			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Елементи</p>
			<div className="space-y-0.5">
				{scene.rooms.map((r) => (
					<Row key={r.id} label={`🏠 ${r.name}`} onClick={() => select({ id: r.id, type: 'room' })} disabled={layers.labels.locked} />
				))}
				{scene.furniture.map((f) => (
					<Row key={f.id} label={`▫ ${f.label}`} onClick={() => select({ id: f.id, type: 'furniture' })} disabled={layers.furniture.locked} />
				))}
				{scene.symbols.map((sy) => (
					<Row key={sy.id} label={`⚡ ${sy.kind}`} onClick={() => select({ id: sy.id, type: 'symbol' })} disabled={layers.engineering.locked} />
				))}
				{scene.rooms.length + scene.furniture.length + scene.symbols.length === 0 && <p className="px-2 py-1 text-xs text-muted">Порожньо</p>}
			</div>
		</div>
	);
}

function ReconfigSummary() {
	const scene = usePlannerStore((s) => s.scene);
	const r = reconfigSummary(scene);
	if (!r.any) return null;
	const rows: [string, string][] = [];
	if (r.wallsDemolish.count > 0) rows.push(['Демонтаж стін', `${r.wallsDemolish.count} · ${r.wallsDemolish.lengthM.toFixed(1)} пог.м`]);
	if (r.wallsNew.count > 0) rows.push(['Нові перегородки', `${r.wallsNew.count} · ${r.wallsNew.lengthM.toFixed(1)} пог.м`]);
	if (r.openingsDemolish > 0) rows.push(['Закласти отворів', `${r.openingsDemolish} шт`]);
	if (r.openingsNew > 0) rows.push(['Нові отвори', `${r.openingsNew} шт`]);
	return (
		<>
			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Перепланування</p>
			<div className="mb-3 space-y-0.5">
				{rows.map(([label, value]) => (
					<div key={label} className="flex justify-between gap-2 px-1 text-xs">
						<span className="truncate">{label}</span>
						<span className="shrink-0 font-medium">{value}</span>
					</div>
				))}
			</div>
		</>
	);
}

function EngSummary() {
	const scene = usePlannerStore((s) => s.scene);
	const { symbols, routes } = engineeringSpec(scene);
	if (symbols.length === 0 && routes.length === 0) return null;
	return (
		<>
			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Специфікація мереж</p>
			<div className="mb-3 space-y-0.5">
				{symbols.map((r) => (
					<div key={r.label} className="flex justify-between gap-2 px-1 text-xs">
						<span className="truncate">{r.label}</span>
						<span className="shrink-0 font-medium">
							{r.qty} {r.unit}
						</span>
					</div>
				))}
				{routes.map((r) => (
					<div key={r.label} className="flex justify-between gap-2 px-1 text-xs">
						<span className="truncate">{r.label}</span>
						<span className="shrink-0 font-medium">
							{r.qty.toFixed(1)} {r.unit}
						</span>
					</div>
				))}
			</div>
		</>
	);
}

function FinishSummary() {
	const scene = usePlannerStore((s) => s.scene);
	const setFinishRate = usePlannerStore((s) => s.setFinishRate);
	const { rows, total } = finishEstimate(scene);
	if (rows.length === 0) return null;
	return (
		<>
			<p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Відомість оздоблення</p>
			<div className="mb-3 space-y-1.5">
				{rows.map((r) => (
					<div key={r.key} className="px-1 text-xs">
						<div className="flex justify-between gap-2">
							<span className="truncate">{r.label}</span>
							<span className="shrink-0 font-medium">
								{r.qty.toFixed(1)} {r.unit}
							</span>
						</div>
						<div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
							<span className="truncate">{r.rooms.join(', ')}</span>
							<span className="flex shrink-0 items-center gap-1">
								<input
									type="number"
									defaultValue={r.rate || ''}
									placeholder="0"
									onBlur={(e) => setFinishRate(r.key, Number(e.target.value) || 0)}
									onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
									className="w-14 rounded border border-panel-border bg-page-bg px-1 py-0.5 text-right"
								/>
								<span>грн/{r.unit} =</span>
								<span className="w-16 text-right font-medium text-page-text">{r.cost.toLocaleString('uk')}</span>
							</span>
						</div>
					</div>
				))}
				<div className="flex justify-between border-t border-panel-border px-1 pt-1 text-sm font-semibold">
					<span>Разом оздоблення</span>
					<span>{total.toLocaleString('uk')} грн</span>
				</div>
			</div>
		</>
	);
}

function Row({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
	return (
		<button onClick={onClick} disabled={disabled} className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-page-bg disabled:opacity-40">
			{label}
		</button>
	);
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
	return (
		<div className="relative mb-2">
			<Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
			<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-panel-border bg-page-bg py-1.5 pl-7 pr-2 text-sm outline-none focus:border-brand" />
		</div>
	);
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
	return (
		<div className="mb-1">
			<button onClick={onToggle} className="flex w-full items-center justify-between rounded px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted hover:bg-page-bg">
				{title}
				<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
			</button>
			{open && children}
		</div>
	);
}
