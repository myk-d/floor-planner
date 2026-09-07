import { Circle, Group, Line, Text } from 'react-konva';
import { routeStyle } from '../../../constants/engineering';
import type { Route, Vec } from '../../../domain/scene';
import type { RenderTheme } from './theme';

function KLabel({ points, text, u, color }: { points: Vec[]; text: string; u: number; color: string }) {
	if (points.length < 2) return null;
	const a = points[Math.floor(points.length / 2) - 1];
	const b = points[Math.floor(points.length / 2)];
	return <Text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 12 * u} text={text} fontSize={10 * u} fill={color} />;
}

export default function RouteShape({
	route,
	scale,
	theme,
	selected,
	colorOverride,
	onMouseDown,
}: {
	route: Route;
	scale: number;
	theme: RenderTheme;
	selected?: boolean;
	colorOverride?: string;
	onMouseDown?: () => void;
}) {
	const u = 1 / scale;
	const st = routeStyle(route.kind);
	const col = colorOverride ?? route.color ?? (theme.name === 'blueprint' ? theme.dimension : st.color);
	const flat = route.points.flatMap((p) => [p.x, p.y]);
	return (
		<Group onMouseDown={onMouseDown}>
			<Line
				points={flat}
				stroke={col}
				strokeWidth={st.width * u}
				dash={st.dash?.map((d) => d * u)}
				lineCap="round"
				lineJoin="round"
				hitStrokeWidth={12 * u}
			/>
			{route.gauge && (
				<KLabel points={route.points} text={route.gauge} u={u} color={col} />
			)}
			{selected &&
				route.points.map((p, i) => (
					<Circle key={i} x={p.x} y={p.y} radius={3 * u} fill={theme.selection} />
				))}
		</Group>
	);
}
