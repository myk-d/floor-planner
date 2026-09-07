import { describe, expect, it } from 'vitest';
import { themeForMode } from './theme';
import { wallStyle } from './wallStyle';

describe('wallStyle', () => {
	const line = themeForMode('line');
	const color = themeForMode('color');

	it('poché → solid dark fill regardless of material / mode', () => {
		expect(wallStyle(line, 'brick', true)).toMatchObject({ solid: true, base: '#111418' });
		expect(wallStyle(color, 'glass', true).solid).toBe(true);
	});

	it('without poché keeps the per-material behaviour', () => {
		expect(wallStyle(color, 'block').solid).toBe(true); // block always solid
		expect(wallStyle(color, 'brick').solid).toBe(false);
		expect(wallStyle(line, 'brick').base).toBe('#ffffff');
		expect(wallStyle(themeForMode('blueprint'), 'brick').solid).toBe(true);
	});
});
