import { Circle, Group, Line, Text } from 'react-konva';
import type { Compass } from '../../../domain/scene';
import type { RenderTheme } from './theme';

export default function CompassMark({
	compass,
	scale,
	theme,
	selected,
	onMouseDown,
	onDragEnd,
}: {
	compass: Compass;
	scale: number;
	theme: RenderTheme;
	selected?: boolean;
	onMouseDown?: () => void;
	onDragEnd?: (x: number, y: number) => void;
}) {
	const u = 1 / scale;
	const R = 34 * u;
	const s = theme.text;
	return (
		<Group
			x={compass.x}
			y={compass.y}
			rotation={compass.rotation}
			draggable={!!onDragEnd}
			onMouseDown={onMouseDown}
			onDragEnd={(e) => onDragEnd?.(Math.round(e.target.x()), Math.round(e.target.y()))}
		>
			<Circle radius={R} stroke={s} strokeWidth={1.2 * u} fill={theme.background} opacity={0.9} />
			<Line points={[0, R * 0.75, -R * 0.28, 0, 0, -R * 0.75, R * 0.28, 0, 0, R * 0.75]} closed stroke={s} strokeWidth={1.2 * u} fill={s} />
			<Text text="Пн" fontSize={13 * u} fill={s} offsetX={12 * u} offsetY={R + 15 * u} />
			{selected && <Circle radius={R + 5 * u} stroke={theme.selection} strokeWidth={1.5 * u} dash={[4 * u, 3 * u]} />}
		</Group>
	);
}
