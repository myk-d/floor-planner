import { describe, expect, it } from 'vitest';
import { emptyScene, type SymbolItem } from './scene';
import { isLight, isSwitch, lightingIssues, lightingLinks, toggleLink } from './lighting';

const sym = (id: string, kind: string, links?: string[]): SymbolItem => ({ id, kind, x: 0, y: 0, rotation: 0, links });

describe('lighting', () => {
	it('classifies switches and lights', () => {
		expect(isSwitch('switch-1')).toBe(true);
		expect(isSwitch('dimmer')).toBe(true);
		expect(isSwitch('socket')).toBe(false);
		expect(isLight('light-ceiling')).toBe(true);
		expect(isLight('light-wall')).toBe(true);
		expect(isLight('socket')).toBe(false);
	});

	it('resolves valid links and drops dangling / wrong-type ids', () => {
		const s = emptyScene();
		s.symbols.push(sym('sw', 'switch-1', ['l1', 'gone', 'sock']), sym('l1', 'light-ceiling'), sym('sock', 'socket'));
		const links = lightingLinks(s);
		expect(links).toHaveLength(1);
		expect(links[0].sw.id).toBe('sw');
		expect(links[0].light.id).toBe('l1');
	});

	it('flags lights with no switch and switches with no light', () => {
		const s = emptyScene();
		s.symbols.push(sym('sw', 'switch-1', ['l1']), sym('l1', 'light-ceiling'), sym('sw2', 'switch-2'), sym('l2', 'light-spot'));
		const issues = lightingIssues(s);
		expect(issues).toContainEqual({ kind: 'switch-no-light', symbolId: 'sw2' });
		expect(issues).toContainEqual({ kind: 'light-no-switch', symbolId: 'l2' });
		expect(issues.some((i) => i.symbolId === 'sw')).toBe(false);
		expect(issues.some((i) => i.symbolId === 'l1')).toBe(false);
	});

	it('toggleLink adds, removes, and collapses to undefined when empty', () => {
		expect(toggleLink(undefined, 'a')).toEqual(['a']);
		expect(toggleLink(['a'], 'b')?.sort()).toEqual(['a', 'b']);
		expect(toggleLink(['a', 'b'], 'a')).toEqual(['b']);
		expect(toggleLink(['a'], 'a')).toBeUndefined();
	});
});
