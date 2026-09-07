import type { RenderMode } from '../../../domain/scene';

export interface RenderTheme {
	name: 'color' | 'blueprint' | 'line';
	background: string;
	grid: string;
	gridStrong: string;
	wall: string;
	wallStroke: string;
	/** колір ліній штриховки матеріалу стіни / підлоги */
	hatch: string;
	/** показувати заливку підлоги кімнат та штриховку матеріалів */
	showFills: boolean;
	room: string;
	roomText: string;
	furnitureFill: string;
	furnitureStroke: string;
	furnitureText: string;
	opening: string;
	dimension: string;
	dimensionText: string;
	text: string;
	selection: string;
	symbolStroke: string;
	symbolFill: string;
	titleBlock: string;
	titleBlockText: string;
}

export const screenTheme: RenderTheme = {
	name: 'color',
	background: '#f4f5f7',
	grid: '#e2e5ea',
	gridStrong: '#cfd4dc',
	wall: '#3a3f47',
	wallStroke: '#3a3f47',
	hatch: 'rgba(0,0,0,0.28)',
	showFills: true,
	room: 'rgba(11, 61, 145, 0.05)',
	roomText: '#1a1d23',
	furnitureFill: '#ffffff',
	furnitureStroke: '#5b6472',
	furnitureText: '#374151',
	opening: '#f4f5f7',
	dimension: '#0b3d91',
	dimensionText: '#0b3d91',
	text: '#1a1d23',
	selection: '#2563eb',
	symbolStroke: '#2f3540',
	symbolFill: '#ffffff',
	titleBlock: '#ffffff',
	titleBlockText: '#1a1d23',
};

export const blueprintTheme: RenderTheme = {
	name: 'blueprint',
	background: '#0b3d91',
	grid: 'rgba(255,255,255,0.10)',
	gridStrong: 'rgba(255,255,255,0.20)',
	wall: '#ffffff',
	wallStroke: '#ffffff',
	hatch: 'rgba(255,255,255,0.35)',
	showFills: false,
	room: 'rgba(255,255,255,0.04)',
	roomText: '#ffffff',
	furnitureFill: 'rgba(255,255,255,0.06)',
	furnitureStroke: '#dbe6ff',
	furnitureText: '#eef3ff',
	opening: '#0b3d91',
	dimension: '#cfe0ff',
	dimensionText: '#ffffff',
	text: '#ffffff',
	selection: '#7cc4ff',
	symbolStroke: '#dbe6ff',
	symbolFill: 'rgba(255,255,255,0.06)',
	titleBlock: 'rgba(255,255,255,0.08)',
	titleBlockText: '#ffffff',
};

export const lineTheme: RenderTheme = {
	name: 'line',
	background: '#ffffff',
	grid: '#f0f1f3',
	gridStrong: '#e3e5e9',
	wall: '#111418',
	wallStroke: '#111418',
	hatch: 'rgba(0,0,0,0.4)',
	showFills: false,
	room: 'rgba(0,0,0,0)',
	roomText: '#111418',
	furnitureFill: 'rgba(0,0,0,0)',
	furnitureStroke: '#1a1d23',
	furnitureText: '#20242b',
	opening: '#ffffff',
	dimension: '#20242b',
	dimensionText: '#20242b',
	text: '#111418',
	selection: '#2563eb',
	symbolStroke: '#1a1d23',
	symbolFill: 'rgba(0,0,0,0)',
	titleBlock: '#ffffff',
	titleBlockText: '#111418',
};

/** Сумісність зі старим ім'ям. */
export const lightExportTheme = lineTheme;

export function themeForMode(mode: RenderMode): RenderTheme {
	switch (mode) {
		case 'blueprint':
			return blueprintTheme;
		case 'line':
			return lineTheme;
		case 'color':
		default:
			return screenTheme;
	}
}
