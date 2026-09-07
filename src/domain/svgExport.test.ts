import { describe, expect, it } from 'vitest';
import { sceneToSVG } from './svgExport';
import { emptyScene, makeRoomRect, newId } from './scene';

describe('sceneToSVG', () => {
	it('produces a valid svg root with viewBox and content', () => {
		const s = emptyScene('Тест');
		const { walls, room } = makeRoomRect(0, 0, 400, 300, 10, 'Кухня');
		s.walls.push(...walls);
		s.rooms.push(room);
		s.furniture.push({ id: newId(), kind: 'sofa', x: 200, y: 150, rotation: 0, w: 200, d: 90, label: 'Диван', color: '#8ea9c4' });

		const svg = sceneToSVG(s, {
			theme: 'blueprint',
			showDimensions: true,
			showOverallChains: true,
			showRoomLabels: true,
			showFurnitureLabels: true,
			showFinishes: false,
			title: 'Тест',
		});
		expect(svg.startsWith('<?xml')).toBe(true);
		expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('viewBox=');
		expect(svg).toContain('Кухня');
		expect(svg).toContain('Диван');
		expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
		// збалансовані теги svg
		expect((svg.match(/<svg/g) || []).length).toBe(1);
	});

	it('escapes special characters in labels', () => {
		const s = emptyScene('A & B <x>');
		const svg = sceneToSVG(s, {
			theme: 'line',
			showDimensions: false,
			showOverallChains: false,
			showRoomLabels: false,
			showFurnitureLabels: false,
			showFinishes: false,
			title: 'A & B <x>',
		});
		expect(svg).toContain('A &amp; B &lt;x&gt;');
	});
});
