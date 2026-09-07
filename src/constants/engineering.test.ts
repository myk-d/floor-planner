import { describe, expect, it } from 'vitest';
import { isCeilingSymbol, symbolMountHeight } from './engineering';

describe('symbolMountHeight', () => {
	it('standard mounting heights by kind', () => {
		expect(symbolMountHeight('socket')).toBe(30);
		expect(symbolMountHeight('switch-1')).toBe(90);
		expect(symbolMountHeight('light-wall')).toBe(200);
		expect(symbolMountHeight('radiator-bimetal')).toBe(12);
		expect(symbolMountHeight('sewer-out')).toBe(15);
	});

	it('ceiling lights return the ceiling height', () => {
		expect(symbolMountHeight('light-ceiling', 300)).toBe(300);
		expect(symbolMountHeight('light-spot', 250)).toBe(250);
		expect(isCeilingSymbol('light-ceiling')).toBe(true);
		expect(isCeilingSymbol('socket')).toBe(false);
	});

	it('junction box is just below the ceiling', () => {
		expect(symbolMountHeight('junction-box', 270)).toBe(250);
	});

	it('unknown kind falls back to 30', () => {
		expect(symbolMountHeight('mystery-widget')).toBe(30);
	});
});
