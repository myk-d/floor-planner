import {
	AlignHorizontalJustifyCenter,
	AlignStartVertical,
	AlignEndVertical,
	AlignVerticalJustifyCenter,
	AlignStartHorizontal,
	AlignEndHorizontal,
	Copy,
	RotateCw,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { distance, polygonAreaM2, polygonPerimeterCm } from '../../domain/geometry';
import { routeStyle, ROUTE_STYLES, engSymbolLabel } from '../../constants/engineering';
import type {
	DimLine,
	FloorKind,
	Furniture,
	Opening,
	Room,
	Route,
	Surface,
	SymbolItem,
	TextLabel,
	Vec,
	Wall,
	WallMaterial,
	Zone,
} from '../../domain/scene';
import { zoneLabel } from '../../constants/engineering';
import { formatAreaM2, formatLength, parseLength } from '../../domain/units';
import { primarySelection, usePlannerStore, type Selection } from '../../store/usePlannerStore';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';

const MATERIALS: { v: WallMaterial; l: string }[] = [
	{ v: 'block', l: 'Блоки' },
	{ v: 'brick', l: 'Цегла' },
	{ v: 'concrete', l: 'Бетон' },
	{ v: 'drywall', l: 'Гіпсокартон' },
	{ v: 'wood', l: 'Дерево' },
	{ v: 'glass', l: 'Скло' },
];
const THICKNESS_PRESETS = [5, 8, 10, 12, 15, 20];
const FLOORS: { v: FloorKind; l: string }[] = [
	{ v: 'none', l: 'Без покриття' },
	{ v: 'parquet', l: 'Паркет' },
	{ v: 'laminate', l: 'Ламінат' },
	{ v: 'tile', l: 'Плитка' },
	{ v: 'carpet', l: 'Килим' },
	{ v: 'concrete', l: 'Бетон' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-muted">{label}</span>
			{children}
		</label>
	);
}

const stripUnit = (s: string) => s.replace(/\s?(м|см|мм)$/, '');

function LengthInput({ cm, onCommit }: { cm: number; onCommit: (cm: number) => void }) {
	const units = usePlannerStore((s) => s.scene.settings.units);
	const [draft, setDraft] = useState<string | null>(null);
	const display = draft ?? stripUnit(formatLength(cm, units));
	return (
		<Input
			value={display}
			inputMode="decimal"
			onFocus={() => setDraft(stripUnit(formatLength(cm, units)))}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={() => {
				const parsed = draft != null ? parseLength(draft, units) : null;
				if (parsed != null && parsed > 0) onCommit(Math.round(parsed));
				setDraft(null);
			}}
			onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
		/>
	);
}

type Patch = (p: Record<string, unknown>) => void;

export default function PropertiesPanel() {
	const store = usePlannerStore();
	const { selected } = store;
	const primary = primarySelection(store);

	if (selected.length === 0) {
		return (
			<div className="w-64 shrink-0 border-l border-panel-border bg-panel p-4 text-sm text-muted">
				Нічого не вибрано. Клацніть на елемент, щоб редагувати його. Shift+клік або рамка — множинний вибір.
			</div>
		);
	}

	if (selected.length > 1) return <MultiPanel />;
	if (!primary) return null;

	return <SinglePanel sel={primary} />;
}

function MultiPanel() {
	const { selected, alignSelected, deleteSelected, duplicateSelected } = usePlannerStore();
	const counts = selected.reduce<Record<string, number>>((acc, s) => ((acc[s.type] = (acc[s.type] ?? 0) + 1), acc), {});
	return (
		<div className="flex w-64 shrink-0 flex-col gap-3 border-l border-panel-border bg-panel p-4">
			<h3 className="text-sm font-semibold">Вибрано {selected.length}</h3>
			<p className="text-xs text-muted">{Object.entries(counts).map(([t, n]) => `${typeLabels[t] ?? t}: ${n}`).join(' · ')}</p>
			<div>
				<span className="mb-1 block text-xs font-medium text-muted">Вирівняти</span>
				<div className="grid grid-cols-6 gap-1">
					<AlignBtn onClick={() => alignSelected('left')} icon={<AlignStartVertical className="h-4 w-4" />} />
					<AlignBtn onClick={() => alignSelected('hcenter')} icon={<AlignHorizontalJustifyCenter className="h-4 w-4" />} />
					<AlignBtn onClick={() => alignSelected('right')} icon={<AlignEndVertical className="h-4 w-4" />} />
					<AlignBtn onClick={() => alignSelected('top')} icon={<AlignStartHorizontal className="h-4 w-4" />} />
					<AlignBtn onClick={() => alignSelected('vcenter')} icon={<AlignVerticalJustifyCenter className="h-4 w-4" />} />
					<AlignBtn onClick={() => alignSelected('bottom')} icon={<AlignEndHorizontal className="h-4 w-4" />} />
				</div>
			</div>
			<div className="flex gap-2">
				<Button size="sm" variant="outline" className="flex-1" onClick={duplicateSelected}>
					<Copy className="h-4 w-4" /> Дублювати
				</Button>
				<Button size="sm" variant="danger" className="flex-1" onClick={deleteSelected}>
					<Trash2 className="h-4 w-4" /> Видалити
				</Button>
			</div>
		</div>
	);
}

function AlignBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
	return (
		<button onClick={onClick} className="flex h-8 items-center justify-center rounded border border-panel-border text-muted hover:bg-page-bg">
			{icon}
		</button>
	);
}

function SinglePanel({ sel }: { sel: Selection }) {
	const { scene, patchSelected, deleteSelected, duplicateSelected, select, setRoomFloor } = usePlannerStore();
	const bucket = {
		wall: scene.walls,
		room: scene.rooms,
		surface: scene.surfaces,
		furniture: scene.furniture,
		opening: scene.openings,
		text: scene.texts,
		dim: scene.dims,
		symbol: scene.symbols,
		route: scene.routes,
		zone: scene.zones,
	}[sel.type as Exclude<Selection['type'], 'compass'>] as { id: string }[] | undefined;
	const el = sel.type === 'compass' ? scene.compass : bucket?.find((x) => x.id === sel.id);

	if (!el) return <div className="w-64 shrink-0 border-l border-panel-border bg-panel p-4 text-sm text-muted">Елемент видалено.</div>;

	return (
		<div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-panel-border bg-panel p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">{typeLabels[sel.type]}</h3>
				<div className="flex gap-1">
					{['furniture', 'text', 'room', 'symbol', 'surface'].includes(sel.type) && (
						<button title="Дублювати" onClick={duplicateSelected} className="rounded p-1 text-muted hover:bg-page-bg">
							<Copy className="h-4 w-4" />
						</button>
					)}
					<button title="Видалити" onClick={deleteSelected} className="rounded p-1 text-danger hover:bg-page-bg">
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			{sel.type === 'wall' && <WallProps wall={el as Wall} patch={patchSelected} select={select} />}
			{sel.type === 'room' && (
				<RoomProps room={el as Room} patch={patchSelected} setFloor={(f) => setRoomFloor((el as Room).id, f)} fallbackHeight={scene.settings.wallHeight} />
			)}
			{sel.type === 'surface' && <SurfaceProps surface={el as Surface} patch={patchSelected} />}
			{sel.type === 'furniture' && <FurnitureProps item={el as Furniture} patch={patchSelected} />}
			{sel.type === 'opening' && <OpeningProps opening={el as Opening} patch={patchSelected} />}
			{sel.type === 'text' && <TextProps text={el as TextLabel} patch={patchSelected} />}
			{sel.type === 'dim' && <DimProps dim={el as DimLine} patch={patchSelected} />}
			{sel.type === 'symbol' && <SymbolProps sym={el as SymbolItem} patch={patchSelected} />}
			{sel.type === 'route' && <RouteProps route={el as Route} patch={patchSelected} />}
			{sel.type === 'zone' && <ZoneProps zone={el as Zone} />}
			{sel.type === 'compass' && <CompassProps rotation={(el as { rotation: number }).rotation} patch={patchSelected} />}
		</div>
	);
}

const typeLabels: Record<string, string> = {
	wall: 'Стіна',
	room: 'Кімната',
	surface: 'Поверхня',
	furniture: 'Меблі',
	opening: 'Отвір',
	text: 'Текст',
	dim: 'Розмір',
	symbol: 'Інж. елемент',
	route: 'Лінія розведення',
	zone: 'Зона',
	compass: 'Компас',
};

const STATUS_OPTS = [
	{ v: 'existing', l: 'Існує' },
	{ v: 'demolish', l: 'Знести' },
	{ v: 'new', l: 'Нова' },
];

function WallProps({ wall, patch, select }: { wall: Wall; patch: Patch; select: (s: Selection | null) => void }) {
	const length = distance(wall.a, wall.b);
	const setLength = (cm: number) => {
		const dx = wall.b.x - wall.a.x;
		const dy = wall.b.y - wall.a.y;
		const cur = Math.hypot(dx, dy) || 1;
		const k = cm / cur;
		patch({ b: { x: Math.round(wall.a.x + dx * k), y: Math.round(wall.a.y + dy * k) } });
	};
	return (
		<>
			<Field label="Довжина">
				<LengthInput cm={length} onCommit={setLength} />
			</Field>
			<Field label="Товщина, см">
				<div className="flex flex-wrap gap-1">
					{THICKNESS_PRESETS.map((t) => (
						<button
							key={t}
							onClick={() => patch({ thickness: t })}
							className={`rounded border px-2 py-1 text-xs ${wall.thickness === t ? 'border-brand bg-brand-bg text-brand' : 'border-panel-border hover:bg-page-bg'}`}
						>
							{t}
						</button>
					))}
				</div>
			</Field>
			<Field label="Матеріал">
				<Select value={wall.material} onChange={(e) => patch({ material: e.target.value })}>
					{MATERIALS.map((m) => (
						<option key={m.v} value={m.v}>
							{m.l}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Стан (ремонт)">
				<Select value={wall.status ?? 'existing'} onChange={(e) => patch({ status: e.target.value })}>
					{STATUS_OPTS.map((s) => (
						<option key={s.v} value={s.v}>
							{s.l}
						</option>
					))}
				</Select>
			</Field>
			<div className="flex gap-2">
				<Button
					size="sm"
					variant="outline"
					className="flex-1"
					onClick={() => {
						usePlannerStore.getState().autoDetectRooms();
						select(null);
					}}
				>
					Кімнати
				</Button>
				<Button size="sm" variant="outline" className="flex-1" onClick={() => usePlannerStore.getState().openElevation(wall.id)}>
					Розгортка
				</Button>
			</div>
			<span className="text-xs text-muted">Права кнопка на стіні — розбити / видалити. Кінці стіни можна перетягувати.</span>
		</>
	);
}

function RoomProps({
	room,
	patch,
	setFloor,
	fallbackHeight,
}: {
	room: Room;
	patch: Patch;
	setFloor: (f: { kind?: FloorKind; color?: string }) => void;
	fallbackHeight: number;
}) {
	return (
		<>
			<Field label="Назва">
				<Input key={room.id} defaultValue={room.name} onBlur={(e) => patch({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
			</Field>
			<Field label="Висота стелі, см">
				<Input
					key={room.id + '-ch'}
					type="number"
					defaultValue={room.ceilingHeight ?? ''}
					placeholder={String(fallbackHeight)}
					onBlur={(e) => {
						const v = Math.round(Number(e.target.value));
						patch({ ceilingHeight: e.target.value.trim() && v > 0 ? v : undefined });
					}}
					onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
				/>
			</Field>
			<Field label="Покриття підлоги">
				<Select value={room.floor.kind} onChange={(e) => setFloor({ kind: e.target.value as FloorKind })}>
					{FLOORS.map((f) => (
						<option key={f.v} value={f.v}>
							{f.l}
						</option>
					))}
				</Select>
			</Field>
			{room.floor.kind !== 'none' && (
				<Field label="Колір підлоги">
					<input type="color" value={room.floor.color} onChange={(e) => setFloor({ color: e.target.value })} className="h-9 w-full rounded-md border border-panel-border" />
				</Field>
			)}
			<div className="rounded-md bg-page-bg p-2 text-sm">
				<div className="flex justify-between">
					<span className="text-muted">Площа</span>
					<span className="font-medium">{formatAreaM2(polygonAreaM2(room.points))}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted">Периметр</span>
					<span className="font-medium">{(polygonPerimeterCm(room.points) / 100).toFixed(2)} м</span>
				</div>
			</div>
			<DiagonalCheck points={room.points} />
		</>
	);
}

/** Перевірка «прямокутності» чотирикутної кімнати за різницею діагоналей. */
function DiagonalCheck({ points }: { points: Vec[] }) {
	if (points.length !== 4) return null;
	const d1 = distance(points[0], points[2]);
	const d2 = distance(points[1], points[3]);
	const diff = Math.abs(d1 - d2);
	const skewed = diff > 2;
	return (
		<div className={`rounded-md p-2 text-sm ${skewed ? 'bg-amber-50 text-amber-900' : 'bg-page-bg'}`}>
			<div className="flex justify-between">
				<span className="text-muted">Діагоналі</span>
				<span className="font-medium">
					{(d1 / 100).toFixed(2)} · {(d2 / 100).toFixed(2)} м
				</span>
			</div>
			<div className="mt-0.5 text-xs">
				{skewed ? `Кімната не прямокутна — різниця діагоналей ${Math.round(diff)} см` : 'Кути прямі (діагоналі рівні)'}
			</div>
		</div>
	);
}

function FurnitureProps({ item, patch }: { item: Furniture; patch: Patch }) {
	return (
		<>
			<Field label="Підпис">
				<Input key={item.id} defaultValue={item.label} onBlur={(e) => patch({ label: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
			</Field>
			<div className="grid grid-cols-2 gap-2">
				<Field label="Ширина">
					<LengthInput cm={item.w} onCommit={(cm) => patch({ w: cm })} />
				</Field>
				<Field label="Глибина">
					<LengthInput cm={item.d} onCommit={(cm) => patch({ d: cm })} />
				</Field>
			</div>
			<Field label="Поворот">
				<div className="flex items-center gap-2">
					<Input type="number" value={Math.round(item.rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) || 0 })} />
					<Button size="sm" variant="outline" onClick={() => patch({ rotation: (item.rotation + 90) % 360 })}>
						<RotateCw className="h-4 w-4" />
					</Button>
				</div>
			</Field>
			<Field label="Колір">
				<input type="color" value={item.color} onChange={(e) => patch({ color: e.target.value })} className="h-9 w-full rounded-md border border-panel-border" />
			</Field>
		</>
	);
}

function OpeningProps({ opening, patch }: { opening: Opening; patch: Patch }) {
	return (
		<>
			<Field label="Тип">
				<Select value={opening.type} onChange={(e) => patch({ type: e.target.value })}>
					<option value="door">Двері</option>
					<option value="window">Вікно</option>
					<option value="opening">Прохід</option>
				</Select>
			</Field>
			<Field label="Ширина">
				<LengthInput cm={opening.width} onCommit={(cm) => patch({ width: cm })} />
			</Field>
			<Field label="Зсув від початку стіни">
				<LengthInput cm={opening.offset} onCommit={(cm) => patch({ offset: cm })} />
			</Field>
			{opening.type === 'door' && (
				<Button size="sm" variant="outline" onClick={() => patch({ flip: !opening.flip })}>
					Дзеркально
				</Button>
			)}
			{opening.type !== 'opening' && (
				<div className="grid grid-cols-2 gap-2">
					<Field label="Низ, см">
						<Input type="number" value={opening.sill ?? (opening.type === 'window' ? 90 : 0)} onChange={(e) => patch({ sill: Number(e.target.value) || 0 })} />
					</Field>
					<Field label="Верх, см">
						<Input type="number" value={opening.head ?? (opening.type === 'window' ? 230 : 210)} onChange={(e) => patch({ head: Number(e.target.value) || 0 })} />
					</Field>
				</div>
			)}
			<Field label="Стан (ремонт)">
				<Select value={opening.status ?? 'existing'} onChange={(e) => patch({ status: e.target.value })}>
					{STATUS_OPTS.map((s) => (
						<option key={s.v} value={s.v}>
							{s.l}
						</option>
					))}
				</Select>
			</Field>
		</>
	);
}

function TextProps({ text, patch }: { text: TextLabel; patch: Patch }) {
	return (
		<>
			<Field label="Текст">
				<textarea key={text.id} defaultValue={text.text} onBlur={(e) => patch({ text: e.target.value })} className="w-full rounded-md border border-panel-border bg-panel px-3 py-2 text-sm outline-none focus:border-brand" rows={3} />
			</Field>
			<div className="grid grid-cols-2 gap-2">
				<Field label="Розмір (см)">
					<Input type="number" value={Math.round(text.size)} onChange={(e) => patch({ size: Number(e.target.value) || 10 })} />
				</Field>
				<Field label="Поворот">
					<Input type="number" value={Math.round(text.rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) || 0 })} />
				</Field>
			</div>
		</>
	);
}

function DimProps({ dim, patch }: { dim: DimLine; patch: Patch }) {
	return (
		<Field label="Зсув лінії (см)">
			<Input type="number" value={Math.round(dim.offset)} onChange={(e) => patch({ offset: Number(e.target.value) || 0 })} />
		</Field>
	);
}

function SymbolProps({ sym, patch }: { sym: SymbolItem; patch: Patch }) {
	return (
		<>
			<p className="text-sm">{engSymbolLabel(sym.kind)}</p>
			<Field label="Поворот">
				<div className="flex items-center gap-2">
					<Input type="number" value={Math.round(sym.rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) || 0 })} />
					<Button size="sm" variant="outline" onClick={() => patch({ rotation: (sym.rotation + 90) % 360 })}>
						<RotateCw className="h-4 w-4" />
					</Button>
				</div>
			</Field>
			<Field label="Група/лінія">
				<Input defaultValue={sym.circuit ?? ''} onBlur={(e) => patch({ circuit: e.target.value || undefined })} placeholder="напр. Кухня-1" />
			</Field>
			{sym.wallId != null && (
				<Field label="Зсув уздовж стіни">
					<LengthInput cm={sym.offset ?? 0} onCommit={(cm) => patch({ offset: cm })} />
				</Field>
			)}
		</>
	);
}

function RouteProps({ route, patch }: { route: Route; patch: Patch }) {
	const st = routeStyle(route.kind);
	let len = 0;
	for (let i = 0; i < route.points.length - 1; i++) len += distance(route.points[i], route.points[i + 1]);
	return (
		<>
			<Field label="Тип">
				<Select value={route.kind} onChange={(e) => patch({ kind: e.target.value })}>
					{ROUTE_STYLES.map((r) => (
						<option key={r.kind} value={r.kind}>
							{r.label}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Переріз / діаметр">
				<Input defaultValue={route.gauge ?? ''} onBlur={(e) => patch({ gauge: e.target.value || undefined })} placeholder={st.kind === 'wire' ? '2.5 мм²' : 'Ø20'} />
			</Field>
			<Field label="Група/лінія">
				<Input defaultValue={route.circuit ?? ''} onBlur={(e) => patch({ circuit: e.target.value || undefined })} placeholder="напр. Світло-1" />
			</Field>
			<div className="rounded-md bg-page-bg p-2 text-sm">
				<span className="text-muted">Довжина: </span>
				<span className="font-medium">{(len / 100).toFixed(2)} м</span>
			</div>
		</>
	);
}

function ZoneProps({ zone }: { zone: Zone }) {
	const { patchSelected } = usePlannerStore();
	return (
		<>
			<Field label="Тип зони">
				<Select value={zone.kind} onChange={(e) => patchSelected({ kind: e.target.value })}>
					{['heat-cable', 'heat-water', 'screed', 'plaster', 'insulation', 'waterproofing'].map((k) => (
						<option key={k} value={k}>
							{zoneLabel(k as Zone['kind'])}
						</option>
					))}
				</Select>
			</Field>
			<div className="rounded-md bg-page-bg p-2 text-sm">
				<span className="text-muted">Площа: </span>
				<span className="font-medium">{formatAreaM2(polygonAreaM2(zone.points))}</span>
			</div>
		</>
	);
}

function SurfaceProps({ surface, patch }: { surface: Surface; patch: Patch }) {
	return (
		<>
			<Field label="Назва">
				<Input key={surface.id} defaultValue={surface.name} onBlur={(e) => patch({ name: e.target.value })} />
			</Field>
			<Field label="Покриття">
				<Select value={surface.kind} onChange={(e) => patch({ kind: e.target.value })}>
					{FLOORS.filter((f) => f.v !== 'none').map((f) => (
						<option key={f.v} value={f.v}>
							{f.l}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Колір">
				<input type="color" value={surface.color} onChange={(e) => patch({ color: e.target.value })} className="h-9 w-full rounded-md border border-panel-border" />
			</Field>
			<div className="rounded-md bg-page-bg p-2 text-sm">
				<span className="text-muted">Площа: </span>
				<span className="font-medium">{formatAreaM2(polygonAreaM2(surface.points))}</span>
			</div>
		</>
	);
}

function CompassProps({ rotation, patch }: { rotation: number; patch: Patch }) {
	return (
		<Field label="Кут повороту (Пн)">
			<Input type="number" value={Math.round(rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) || 0 })} />
		</Field>
	);
}
