import { Arc, Circle, Group, Line, Rect, Text } from 'react-konva';
import type { SymbolItem } from '../../../domain/scene';
import type { RenderTheme } from './theme';

interface Props {
	item: SymbolItem;
	theme: RenderTheme;
	/** пікселів на см */
	scale: number;
	/** перекриває колір штриха (для режиму «за групою») */
	colorOverride?: string;
}

/** Інженерні символи малюються сталого екранного розміру (px), незалежно від зуму. */
export default function SymbolShape({ item, theme, scale, colorOverride }: Props) {
	const u = 1 / scale; // 1px у світових одиницях
	const R = 11 * u;
	const s = colorOverride ?? theme.symbolStroke;
	const sw = 1.4 * u;
	const line = (pts: number[], extra?: object) => <Line points={pts} stroke={s} strokeWidth={sw} lineCap="round" {...extra} />;

	const socketBase = (
		<>
			<Arc x={0} y={0} innerRadius={R} outerRadius={R} angle={180} rotation={180} stroke={s} strokeWidth={sw} />
			{line([-R, 0, R, 0])}
		</>
	);

	switch (item.kind) {
		case 'socket':
			return <Group>{socketBase}{line([0, 0, 0, -R])}</Group>;
		case 'socket-double':
			return (
				<Group>
					{socketBase}
					{line([-R * 0.4, 0, -R * 0.4, -R])}
					{line([R * 0.4, 0, R * 0.4, -R])}
				</Group>
			);
		case 'socket-quad':
			return (
				<Group>
					{socketBase}
					{[-0.7, -0.25, 0.25, 0.7].map((k, i) => (
						<Line key={i} points={[R * k, 0, R * k, -R]} stroke={s} strokeWidth={sw} />
					))}
				</Group>
			);
		case 'socket-waterproof':
			return (
				<Group>
					{socketBase}
					{line([0, 0, 0, -R])}
					<Circle radius={R + 2 * u} stroke={s} strokeWidth={sw} dash={[3 * u, 2 * u]} />
				</Group>
			);
		case 'socket-floor':
			return (
				<Group>
					<Rect x={-R} y={-R} width={2 * R} height={2 * R} stroke={s} strokeWidth={sw} />
					{line([0, -R, 0, R])}
					{line([-R, 0, R, 0])}
				</Group>
			);
		case 'switch-1':
		case 'switch-2':
		case 'switch-3':
		case 'switch-pass':
		case 'dimmer': {
			const n = item.kind === 'switch-2' ? 2 : item.kind === 'switch-3' ? 3 : 1;
			return (
				<Group>
					<Circle radius={R} stroke={s} strokeWidth={sw} />
					{line([0, 0, R * 1.4, -R * 1.4])}
					{Array.from({ length: n }, (_, i) => (
						<Line key={i} points={[R * 1.1 + i * 3 * u, -R * 1.1, R * 1.5 + i * 3 * u, -R * 1.5]} stroke={s} strokeWidth={sw} />
					))}
					{item.kind === 'switch-pass' && line([-R * 1.4, R * 1.4, 0, 0])}
					{item.kind === 'dimmer' && <Circle radius={R * 0.35} fill={s} />}
				</Group>
			);
		}
		case 'light-ceiling':
			return (
				<Group>
					<Circle radius={R} stroke={s} strokeWidth={sw} />
					{line([-R, -R, R, R])}
					{line([-R, R, R, -R])}
					{line([-R * 1.4, 0, R * 1.4, 0])}
					{line([0, -R * 1.4, 0, R * 1.4])}
				</Group>
			);
		case 'light-spot':
			return (
				<Group>
					<Circle radius={R * 0.7} stroke={s} strokeWidth={sw} />
					<Circle radius={R * 0.25} fill={s} />
				</Group>
			);
		case 'light-wall':
			return (
				<Group>
					<Circle radius={R * 0.7} stroke={s} strokeWidth={sw} />
					{line([-R, R * 0.9, R, R * 0.9])}
					{line([0, R * 0.5, 0, R * 0.9])}
				</Group>
			);
		case 'panel':
			return (
				<Group>
					<Rect x={-R * 1.3} y={-R} width={R * 2.6} height={R * 2} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
					{line([-R * 1.3, -R * 0.3, R * 1.3, -R * 0.3])}
					{line([-R * 1.3, R * 0.3, R * 1.3, R * 0.3])}
				</Group>
			);
		case 'junction-box':
			return (
				<Group>
					<Circle radius={R} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
					<Text text="●" fontSize={R} fill={s} offsetX={R * 0.3} offsetY={R * 0.6} />
				</Group>
			);
		case 'water-cold':
		case 'water-hot': {
			const col = item.kind === 'water-hot' ? '#dc2626' : '#1d4ed8';
			return (
				<Group>
					<Circle radius={R * 0.8} stroke={col} strokeWidth={sw} fill={theme.symbolFill} />
					<Line points={[0, -R * 0.8, 0, R * 0.8]} stroke={col} strokeWidth={sw} />
				</Group>
			);
		}
		case 'sewer-out':
			return (
				<Group>
					<Circle radius={R * 0.9} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
					<Circle radius={R * 0.4} stroke={s} strokeWidth={sw} />
				</Group>
			);
		case 'riser':
			return (
				<Group>
					<Circle radius={R} stroke={s} strokeWidth={sw} />
					{line([-R * 0.7, -R * 0.7, R * 0.7, R * 0.7])}
				</Group>
			);
		case 'floor-drain':
			return (
				<Group>
					<Rect x={-R} y={-R} width={2 * R} height={2 * R} stroke={s} strokeWidth={sw} />
					{line([-R, 0, R, 0])}
					{line([0, -R, 0, R])}
				</Group>
			);
		case 'manifold':
			return (
				<Group>
					<Rect x={-R * 1.4} y={-R * 0.5} width={R * 2.8} height={R} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
					{[-0.8, -0.3, 0.3, 0.8].map((k, i) => (
						<Line key={i} points={[R * 1.4 * k, R * 0.5, R * 1.4 * k, R * 1.1]} stroke={s} strokeWidth={sw} />
					))}
				</Group>
			);
		case 'thermostat':
			return (
				<Group>
					<Circle radius={R * 0.85} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
					<Text text="T" fontSize={R} fill={s} offsetX={R * 0.3} offsetY={R * 0.6} />
				</Group>
			);
		case 'convector-floor':
			return <Rect x={-R * 2} y={-R * 0.5} width={R * 4} height={R} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />;
		default: {
			// радіатори
			if (item.kind.startsWith('radiator')) {
				const vertical = item.kind === 'radiator-vertical';
				const w = vertical ? R * 1.2 : R * 3.2;
				const h = vertical ? R * 3.2 : R * 1.2;
				const ribs = vertical ? 3 : 6;
				return (
					<Group>
						<Rect x={-w / 2} y={-h / 2} width={w} height={h} stroke={s} strokeWidth={sw} fill={theme.symbolFill} />
						{Array.from({ length: ribs - 1 }, (_, i) =>
							vertical ? (
								<Line key={i} points={[-w / 2, -h / 2 + (h / ribs) * (i + 1), w / 2, -h / 2 + (h / ribs) * (i + 1)]} stroke={s} strokeWidth={sw} />
							) : (
								<Line key={i} points={[-w / 2 + (w / ribs) * (i + 1), -h / 2, -w / 2 + (w / ribs) * (i + 1), h / 2]} stroke={s} strokeWidth={sw} />
							),
						)}
					</Group>
				);
			}
			return <Circle radius={R * 0.6} stroke={s} strokeWidth={sw} />;
		}
	}
}
