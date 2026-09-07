import {
	Compass,
	DoorClosed,
	Grid3x3,
	Hammer,
	Hand,
	Magnet,
	MousePointer2,
	Move3d,
	PaintBucket,
	PenLine,
	Pentagon,
	RectangleHorizontal,
	Ruler,
	Spline,
	Square,
	Type,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePlannerStore, type Tool } from '../../store/usePlannerStore';

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
	{ tool: 'select', label: 'Вибір (V)', icon: <MousePointer2 className="h-4 w-4" /> },
	{ tool: 'wall', label: 'Стіна (W)', icon: <PenLine className="h-4 w-4" /> },
	{ tool: 'room', label: 'Кімната-прямокутник (R)', icon: <Square className="h-4 w-4" /> },
	{ tool: 'room-poly', label: 'Кімната-полігон', icon: <Pentagon className="h-4 w-4" /> },
	{ tool: 'room-l', label: 'Кімната L', icon: <span className="text-[11px] font-bold">L</span> },
	{ tool: 'room-u', label: 'Кімната П', icon: <span className="text-[11px] font-bold">П</span> },
	{ tool: 'room-t', label: 'Кімната Т', icon: <span className="text-[11px] font-bold">Т</span> },
	{ tool: 'surface', label: 'Поверхня (килим/зона)', icon: <PaintBucket className="h-4 w-4" /> },
	{ tool: 'door', label: 'Двері (D)', icon: <DoorClosed className="h-4 w-4" /> },
	{ tool: 'window', label: 'Вікно (N)', icon: <RectangleHorizontal className="h-4 w-4" /> },
	{ tool: 'opening', label: 'Прохід (O)', icon: <Move3d className="h-4 w-4" /> },
	{ tool: 'demolish', label: 'Демонтаж (клік — знести/нова)', icon: <Hammer className="h-4 w-4" /> },
	{ tool: 'text', label: 'Текст (T)', icon: <Type className="h-4 w-4" /> },
	{ tool: 'dimension', label: 'Розмір (M)', icon: <Ruler className="h-4 w-4" /> },
	{ tool: 'measure', label: 'Виміряти (L)', icon: <Spline className="h-4 w-4" /> },
	{ tool: 'compass', label: 'Компас', icon: <Compass className="h-4 w-4" /> },
	{ tool: 'pan', label: 'Панорама (пробіл)', icon: <Hand className="h-4 w-4" /> },
];

export default function Toolbar() {
	const { tool, setTool, showGrid, snapEnabled, toggleGrid, toggleSnap } = usePlannerStore();

	return (
		<div className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-panel-border bg-panel py-2">
			{TOOLS.map((t) => (
				<button
					key={t.tool}
					title={t.label}
					onClick={() => setTool(t.tool)}
					className={cn(
						'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
						tool === t.tool ? 'bg-brand text-white' : 'text-page-text hover:bg-page-bg',
					)}
				>
					{t.icon}
				</button>
			))}
			<div className="my-1 h-px w-6 bg-panel-border" />
			<button
				title="Сітка"
				onClick={toggleGrid}
				className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', showGrid ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg')}
			>
				<Grid3x3 className="h-4 w-4" />
			</button>
			<button
				title="Прив'язка"
				onClick={toggleSnap}
				className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', snapEnabled ? 'bg-brand-bg text-brand' : 'text-muted hover:bg-page-bg')}
			>
				<Magnet className="h-4 w-4" />
			</button>
		</div>
	);
}
