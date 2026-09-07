import { Arc, Circle, Group, Line, Rect } from 'react-konva';
import type { Furniture } from '../../../domain/scene';
import type { RenderTheme } from '../render/theme';

interface Props {
	item: Furniture;
	theme: RenderTheme;
	/** пікселів на см — щоб тримати товщину ліній сталою на екрані */
	scale: number;
}

/**
 * Меблі малюються в ЛОКАЛЬНИХ координатах із центром у (0,0), габарит w×d (см).
 * Позицію/поворот задає батьківський <Group> у SceneView.
 */
export default function FurnitureShape({ item, theme, scale }: Props) {
	const { w, d, kind } = item;
	const hw = w / 2;
	const hd = d / 2;
	const stroke = theme.furnitureStroke;
	const fill = item.color && theme.showFills ? tint(item.color) : theme.furnitureFill;
	const sw = 1 / scale; // 1px

	const body = (
		<Rect x={-hw} y={-hd} width={w} height={d} stroke={stroke} strokeWidth={sw} fill={fill} cornerRadius={2 / scale} />
	);

	// круглі елементи
	if (['round-coffee-table', 'round-dining', 'rug-round', 'plant-large', 'plant-small', 'floor-lamp', 'office-chair', 'bar-stool', 'ottoman', 'umbrella-stand', 'parasol'].includes(kind)) {
		return (
			<Group>
				<Circle
					radius={Math.min(hw, hd)}
					stroke={stroke}
					strokeWidth={sw}
					fill={fill}
					dash={kind === 'rug-round' || kind === 'parasol' ? [8 / scale, 6 / scale] : undefined}
				/>
				{(kind === 'plant-large' || kind === 'plant-small') && <Circle radius={Math.min(hw, hd) * 0.45} stroke={stroke} strokeWidth={sw} />}
			</Group>
		);
	}

	switch (kind) {
		case 'bed-double':
		case 'bed-single':
		case 'kid-bed':
		case 'bed-queen':
		case 'bed-king':
		case 'crib':
		case 'bunk-bed':
		case 'sofa-bed': {
			const pillowH = Math.min(hd * 0.5, 35);
			const twoPillows = ['bed-double', 'bed-queen', 'bed-king'].includes(kind);
			return (
				<Group>
					<Rect x={-hw} y={-hd} width={w} height={d} stroke={stroke} strokeWidth={sw} fill={fill} cornerRadius={3 / scale} />
					<Rect x={-hw} y={-hd} width={w} height={pillowH} stroke={stroke} strokeWidth={sw} />
					{twoPillows ? (
						<>
							<Rect x={-hw + 6} y={-hd + 5} width={hw - 12} height={pillowH - 10} stroke={stroke} strokeWidth={sw} cornerRadius={3 / scale} />
							<Rect x={6} y={-hd + 5} width={hw - 12} height={pillowH - 10} stroke={stroke} strokeWidth={sw} cornerRadius={3 / scale} />
						</>
					) : (
						<Rect x={-hw + 6} y={-hd + 5} width={w - 12} height={pillowH - 10} stroke={stroke} strokeWidth={sw} cornerRadius={3 / scale} />
					)}
				</Group>
			);
		}

		case 'sofa':
		case 'sofa-2':
		case 'sofa-3':
		case 'corner-sofa':
		case 'outdoor-sofa':
		case 'armchair': {
			const back = Math.min(hd * 0.4, 22);
			const arm = Math.min(hw * 0.25, 20);
			return (
				<Group>
					{body}
					<Rect x={-hw} y={-hd} width={w} height={back} stroke={stroke} strokeWidth={sw} />
					<Rect x={-hw} y={-hd + back} width={arm} height={d - back} stroke={stroke} strokeWidth={sw} />
					<Rect x={hw - arm} y={-hd + back} width={arm} height={d - back} stroke={stroke} strokeWidth={sw} />
					{kind === 'corner-sofa' && <Rect x={hw - arm} y={hd - arm} width={arm} height={arm} stroke={stroke} strokeWidth={sw} />}
				</Group>
			);
		}

		case 'stove': {
			return (
				<Group>
					{body}
					{[
						[-hw / 2, -hd / 2],
						[hw / 2, -hd / 2],
						[-hw / 2, hd / 2],
						[hw / 2, hd / 2],
					].map(([cx, cy], i) => (
						<Circle key={i} x={cx} y={cy} radius={Math.min(w, d) * 0.16} stroke={stroke} strokeWidth={sw} />
					))}
				</Group>
			);
		}

		case 'kitchen-sink':
		case 'sink':
		case 'bidet': {
			return (
				<Group>
					{body}
					<Rect
						x={-hw + w * 0.12}
						y={-hd + d * 0.18}
						width={w * 0.76}
						height={d * 0.6}
						stroke={stroke}
						strokeWidth={sw}
						cornerRadius={3 / scale}
					/>
					<Circle x={0} y={-hd + d * 0.1} radius={Math.min(w, d) * 0.05} stroke={stroke} strokeWidth={sw} />
				</Group>
			);
		}

		case 'toilet': {
			return (
				<Group>
					<Rect x={-hw} y={-hd} width={w} height={d * 0.35} stroke={stroke} strokeWidth={sw} fill={fill} />
					<Line
						closed
						stroke={stroke}
						strokeWidth={sw}
						fill={fill}
						points={ellipsePoints(0, hd * 0.15, hw * 0.9, hd * 0.8)}
						tension={0.2}
					/>
				</Group>
			);
		}

		case 'bathtub': {
			return (
				<Group>
					{body}
					<Rect
						x={-hw + 8}
						y={-hd + 8}
						width={w - 16}
						height={d - 16}
						stroke={stroke}
						strokeWidth={sw}
						cornerRadius={Math.min(w, d) * 0.25}
					/>
					<Circle x={hw - 14} y={0} radius={3 / scale + 2} stroke={stroke} strokeWidth={sw} />
				</Group>
			);
		}

		case 'shower': {
			return (
				<Group>
					{body}
					<Line points={[-hw, -hd, hw, hd]} stroke={stroke} strokeWidth={sw} />
					<Line points={[-hw, hd, hw, -hd]} stroke={stroke} strokeWidth={sw} />
					<Circle x={-hw + 10} y={-hd + 10} radius={4 / scale + 2} stroke={stroke} strokeWidth={sw} />
				</Group>
			);
		}

		case 'fridge':
		case 'wine-fridge':
		case 'washer':
		case 'dryer':
		case 'dishwasher':
		case 'boiler':
		case 'oven':
		case 'cooktop':
		case 'microwave':
		case 'safe': {
			const round = kind === 'washer' || kind === 'dryer' || kind === 'dishwasher';
			return (
				<Group>
					{body}
					<Line points={[-hw, kind === 'fridge' || kind === 'wine-fridge' ? -hd + d * 0.35 : 0, hw, kind === 'fridge' || kind === 'wine-fridge' ? -hd + d * 0.35 : 0]} stroke={stroke} strokeWidth={sw} />
					{round && <Circle radius={Math.min(w, d) * 0.3} stroke={stroke} strokeWidth={sw} />}
					{kind === 'cooktop' &&
						[[-hw / 2, -hd / 2], [hw / 2, -hd / 2], [-hw / 2, hd / 2], [hw / 2, hd / 2]].map(([cx, cy], i) => (
							<Circle key={i} x={cx} y={cy} radius={Math.min(w, d) * 0.13} stroke={stroke} strokeWidth={sw} />
						))}
				</Group>
			);
		}

		case 'dining-table':
		case 'coffee-table':
		case 'desk':
		case 'office-desk':
		case 'corner-desk':
		case 'kitchen-counter':
		case 'kitchen-cabinet':
		case 'kitchen-island':
		case 'bar-counter':
		case 'dining-6':
		case 'dining-8':
		case 'vanity':
		case 'vanity-unit':
		case 'double-vanity':
		case 'console-table':
		case 'changing-table':
		case 'printer-stand':
		case 'bench-bed':
		case 'bench-hall':
		case 'outdoor-table': {
			return <Group>{body}</Group>;
		}

		case 'chair':
		case 'bench': {
			return (
				<Group>
					{body}
					<Rect x={-hw} y={-hd} width={w} height={d * 0.22} stroke={stroke} strokeWidth={sw} />
				</Group>
			);
		}

		case 'wardrobe':
		case 'wardrobe-3':
		case 'wardrobe-corner':
		case 'hall-wardrobe':
		case 'hall-wardrobe-corner':
		case 'kid-wardrobe':
		case 'kid-wardrobe-corner':
		case 'bookshelf':
		case 'library-shelf':
		case 'toy-storage':
		case 'tv-stand':
		case 'tv-wall':
		case 'dresser':
		case 'chest-tall':
		case 'sideboard':
		case 'display-cabinet':
		case 'corner-cabinet':
		case 'tall-cabinet':
		case 'filing-cabinet':
		case 'bathroom-cabinet':
		case 'shoe-cabinet': {
			const doors = Math.max(2, Math.round(w / 60));
			return (
				<Group>
					{body}
					{Array.from({ length: doors - 1 }, (_, i) => {
						const x = -hw + (w / doors) * (i + 1);
						return <Line key={i} points={[x, -hd, x, hd]} stroke={stroke} strokeWidth={sw} />;
					})}
				</Group>
			);
		}

		case 'rug':
		case 'mirror':
		case 'radiator':
		case 'towel-rail':
		case 'ac-unit': {
			return (
				<Rect
					x={-hw}
					y={-hd}
					width={w}
					height={d}
					stroke={stroke}
					strokeWidth={sw}
					fill={fill}
					dash={kind === 'rug' ? [8 / scale, 6 / scale] : undefined}
				/>
			);
		}

		case 'nightstand':
		default:
			return <Group>{body}</Group>;
	}
}

function tint(hex: string): string {
	return hex;
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, steps = 24): number[] {
	const pts: number[] = [];
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2;
		pts.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
	}
	return pts;
}

/** Дуга відкривання дверей — використовується в OpeningsLayer, але лишаємо тут поряд із меблями. */
export function DoorSwing({ x, y, size, rotation, theme, scale }: { x: number; y: number; size: number; rotation: number; theme: RenderTheme; scale: number }) {
	const sw = 1 / scale;
	return (
		<Group x={x} y={y} rotation={rotation}>
			<Line points={[0, 0, size, 0]} stroke={theme.opening === theme.background ? theme.wall : theme.wallStroke} strokeWidth={sw} />
			<Line points={[0, 0, 0, size]} stroke={theme.wallStroke} strokeWidth={sw} />
			<Arc x={0} y={0} innerRadius={size} outerRadius={size} angle={90} rotation={0} stroke={theme.wallStroke} strokeWidth={sw} dash={[4 / scale, 4 / scale]} />
		</Group>
	);
}
