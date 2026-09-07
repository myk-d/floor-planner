/* eslint-disable react-refresh/only-export-components */
import Konva from 'konva';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { totalAreaM2 } from '../../../domain/dimensions';
import { sceneBBox } from '../../../domain/geometry';
import { furnitureSchedule, roomSchedule } from '../../../domain/schedule';
import type { RenderMode, Scene } from '../../../domain/scene';
import { formatAreaM2, unitLabel } from '../../../domain/units';
import SceneView, { type SceneViewOptions } from './SceneView';
import { themeForMode, type RenderTheme } from './theme';

export type PaperSize = 'fit' | 'A4' | 'A3' | 'A2' | 'A1';
export type ScaleRatio = 0 | 20 | 50 | 100 | 200;

export interface ExportOptions {
	theme: RenderMode;
	pixelRatio: number;
	options: SceneViewOptions;
	title: string;
	showTitleBlock: boolean;
	showFurnitureLegend: boolean;
	showRoomTable: boolean;
	paper: PaperSize;
	orientation: 'landscape' | 'portrait' | 'auto';
	scaleRatio: ScaleRatio;
	dpi: 150 | 300;
}

const PAPER_MM: Record<Exclude<PaperSize, 'fit'>, [number, number]> = {
	A4: [297, 210],
	A3: [420, 297],
	A2: [594, 420],
	A1: [841, 594],
};
const FIT_TARGET_PX = 1800;
const MARGIN_CM = 120;

interface Layout {
	scale: number;
	width: number;
	height: number;
	offsetX: number;
	offsetY: number;
	fits: boolean;
	ratioText: string;
}

function computeLayout(scene: Scene, opts: ExportOptions): Layout {
	const bbox = sceneBBox(scene);
	let w = bbox.maxX - bbox.minX;
	let h = bbox.maxY - bbox.minY;
	if (!isFinite(w) || w <= 0) w = 500;
	if (!isFinite(h) || h <= 0) h = 500;
	const minX = isFinite(bbox.minX) ? bbox.minX : 0;
	const minY = isFinite(bbox.minY) ? bbox.minY : 0;

	if (opts.paper === 'fit') {
		const worldW = w + MARGIN_CM * 2;
		const worldH = h + MARGIN_CM * 2;
		const scale = FIT_TARGET_PX / Math.max(worldW, worldH);
		return {
			scale,
			width: Math.round(worldW * scale),
			height: Math.round(worldH * scale),
			offsetX: (MARGIN_CM - minX) * scale,
			offsetY: (MARGIN_CM - minY) * scale,
			fits: true,
			ratioText: '',
		};
	}

	let [pw, ph] = PAPER_MM[opts.paper];
	const wantLandscape = opts.orientation === 'auto' ? w >= h : opts.orientation === 'landscape';
	if (!wantLandscape) [pw, ph] = [ph, pw];
	const pxPerMm = opts.dpi / 25.4;
	const width = Math.round(pw * pxPerMm);
	const height = Math.round(ph * pxPerMm);
	const marginPx = 14 * pxPerMm;

	// px на см
	let scale: number;
	if (opts.scaleRatio === 0) {
		scale = Math.min((width - marginPx * 2) / (w + 200), (height - marginPx * 2) / (h + 200));
	} else {
		// 1 см плану = (10 / N) мм на папері
		scale = (10 / opts.scaleRatio) * pxPerMm;
	}
	const fits = w * scale <= width - marginPx * 2 && h * scale <= height - marginPx * 2;
	return {
		scale,
		width,
		height,
		offsetX: (width - w * scale) / 2 - minX * scale,
		offsetY: (height - h * scale) / 2 - minY * scale,
		fits,
		ratioText: opts.scaleRatio ? `Масштаб 1:${opts.scaleRatio}` : '',
	};
}

function ExportStage({
	scene,
	opts,
	stageRef,
	onReady,
}: {
	scene: Scene;
	opts: ExportOptions;
	stageRef: React.MutableRefObject<Konva.Stage | null>;
	onReady: () => void;
}) {
	const layout = computeLayout(scene, opts);
	const theme: RenderTheme = themeForMode(opts.theme);

	useEffect(() => {
		const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
		return () => cancelAnimationFrame(id);
	}, [onReady]);

	const totalArea = totalAreaM2(scene);
	const furn = opts.showFurnitureLegend ? furnitureSchedule(scene) : [];
	const rooms = opts.showRoomTable ? roomSchedule(scene) : { rows: [], totalM2: 0 };

	const infoLines = [
		`Дата: ${new Date().toLocaleDateString('uk-UA')}`,
		`Загальна площа: ${formatAreaM2(totalArea)}`,
		`Кімнат: ${scene.rooms.length}`,
		`Одиниці: ${unitLabel[scene.settings.units]}`,
		layout.ratioText,
	].filter(Boolean);

	const blockW = 300;
	const blockH = 30 + infoLines.length * 18 + 12;

	return (
		<Stage ref={stageRef} width={layout.width} height={layout.height}>
			<Layer listening={false}>
				<Rect x={0} y={0} width={layout.width} height={layout.height} fill={theme.background} />
			</Layer>

			<SceneView
				scene={scene}
				view={{ scale: layout.scale, offsetX: layout.offsetX, offsetY: layout.offsetY }}
				theme={theme}
				stageWidth={layout.width}
				stageHeight={layout.height}
				options={opts.options}
			/>

			<Layer listening={false}>
				{opts.showTitleBlock && (
					<Group x={16} y={layout.height - blockH - 16}>
						<Rect width={blockW} height={blockH} fill={theme.titleBlock} stroke={theme.dimension} strokeWidth={1} cornerRadius={4} />
						<Line points={[0, 26, blockW, 26]} stroke={theme.dimension} strokeWidth={1} />
						<Text x={12} y={7} text={opts.title || scene.settings.title} fontSize={15} fontStyle="bold" fill={theme.titleBlockText} width={blockW - 24} />
						<Text x={12} y={34} text={infoLines.join('\n')} fontSize={11} lineHeight={1.55} fill={theme.titleBlockText} width={blockW - 24} />
					</Group>
				)}

				{opts.showFurnitureLegend && furn.length > 0 && (
					<ScheduleTable
						x={layout.width - 296}
						y={16}
						title="Специфікація меблів"
						theme={theme}
						rows={furn.map((f) => [`${f.label}`, `${f.w}×${f.d}`, `×${f.count}`])}
						widths={[170, 70, 40]}
					/>
				)}

				{opts.showRoomTable && rooms.rows.length > 0 && (
					<ScheduleTable
						x={layout.width - 296}
						y={16 + (opts.showFurnitureLegend && furn.length ? 40 + furn.length * 18 + 28 : 0)}
						title="Експлікація приміщень"
						theme={theme}
						rows={[...rooms.rows.map((r) => [r.name, '', `${r.areaM2.toFixed(2)} м²`]), ['Разом', '', `${rooms.totalM2.toFixed(2)} м²`]]}
						widths={[190, 20, 70]}
					/>
				)}
			</Layer>
		</Stage>
	);
}

function ScheduleTable({
	x,
	y,
	title,
	theme,
	rows,
	widths,
}: {
	x: number;
	y: number;
	title: string;
	theme: RenderTheme;
	rows: string[][];
	widths: number[];
}) {
	const w = widths.reduce((a, b) => a + b, 0) + 16;
	const h = 26 + rows.length * 18 + 8;
	return (
		<Group x={x} y={y}>
			<Rect width={w} height={h} fill={theme.titleBlock} stroke={theme.dimension} strokeWidth={1} cornerRadius={4} />
			<Text x={8} y={6} text={title} fontSize={12} fontStyle="bold" fill={theme.titleBlockText} />
			<Line points={[0, 24, w, 24]} stroke={theme.dimension} strokeWidth={1} />
			{rows.map((cells, i) => (
				<Group key={i} y={28 + i * 18}>
					{cells.map((c, j) => (
						<Text key={j} x={8 + widths.slice(0, j).reduce((a, b) => a + b, 0)} text={c} fontSize={10.5} fill={theme.titleBlockText} width={widths[j]} />
					))}
				</Group>
			))}
		</Group>
	);
}

export function exportSceneToDataURL(scene: Scene, opts: ExportOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		const container = document.createElement('div');
		container.style.position = 'fixed';
		container.style.left = '-100000px';
		container.style.top = '0';
		document.body.appendChild(container);
		const root = createRoot(container);
		const stageRef: React.MutableRefObject<Konva.Stage | null> = { current: null };
		const cleanup = () => {
			root.unmount();
			container.remove();
		};
		const onReady = () => {
			try {
				const url = stageRef.current!.toDataURL({ pixelRatio: opts.pixelRatio, mimeType: 'image/png' });
				cleanup();
				resolve(url);
			} catch (err) {
				cleanup();
				reject(err);
			}
		};
		root.render(<ExportStage scene={scene} opts={opts} stageRef={stageRef} onReady={onReady} />);
	});
}

export function exportFits(scene: Scene, opts: ExportOptions): boolean {
	return computeLayout(scene, opts).fits;
}
