import Modal from '../UI/Modal';
import { usePlannerStore } from '../../store/usePlannerStore';

const GROUPS: { title: string; rows: [string, string][] }[] = [
	{
		title: 'Загальні',
		rows: [
			['Скасувати / повторити', 'Ctrl+Z · Ctrl+Shift+Z'],
			['Зберегти', 'Ctrl+S'],
			['Дублювати вибране', 'Ctrl+D'],
			['Копіювати / вставити', 'Ctrl+C · Ctrl+V'],
			['Видалити вибране', 'Delete · Backspace'],
			['Довідка (це вікно)', '?'],
		],
	},
	{
		title: 'Вид',
		rows: [
			['Вписати вибране / всю сцену', 'F'],
			['Панорама', 'Пробіл + тягнути · середня кнопка'],
			['Масштаб', 'Колесо миші'],
		],
	},
	{
		title: 'Вибране',
		rows: [
			['Зсув на 1 см', 'Стрілки'],
			['Зсув на 10 см', 'Shift + стрілки'],
		],
	},
	{
		title: 'Інструменти',
		rows: [
			['Вибір', 'V'],
			['Стіна', 'W'],
			['Кімната', 'R'],
			['Двері / вікно / прохід', 'D · N · O'],
			['Текст', 'T'],
			['Розмір / виміряти', 'M · L'],
			['Рука (панорама)', 'H'],
		],
	},
	{
		title: 'Малювання ланцюгом (стіна / кімната / поверхня / лінія)',
		rows: [
			['Задати довжину сегмента', 'ввести число + Enter'],
			['Завершити контур', 'Enter'],
			['Скасувати малювання', 'Esc'],
		],
	},
];

export default function ShortcutsHelp() {
	const open = usePlannerStore((s) => s.helpOpen);
	const setHelpOpen = usePlannerStore((s) => s.setHelpOpen);
	return (
		<Modal open={open} onClose={() => setHelpOpen(false)} title="Гарячі клавіші" className="max-w-2xl">
			<div className="max-h-[70vh] overflow-y-auto pr-1 text-sm sm:columns-2 sm:gap-6">
				{GROUPS.map((g) => (
					<div key={g.title} className="mb-3 break-inside-avoid">
						<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</div>
						<dl className="divide-y divide-panel-border">
							{g.rows.map(([label, keys]) => (
								<div key={label} className="flex items-baseline justify-between gap-4 py-1">
									<dt>{label}</dt>
									<dd className="shrink-0 font-mono text-xs text-muted">{keys}</dd>
								</div>
							))}
						</dl>
					</div>
				))}
			</div>
		</Modal>
	);
}
