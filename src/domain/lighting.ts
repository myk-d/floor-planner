import type { Scene, SymbolItem } from './scene';

export const SWITCH_KINDS = new Set(['switch-1', 'switch-2', 'switch-3', 'switch-pass', 'dimmer']);
export const LIGHT_KINDS = new Set(['light-ceiling', 'light-spot', 'light-wall']);

export const isSwitch = (kind: string): boolean => SWITCH_KINDS.has(kind);
export const isLight = (kind: string): boolean => LIGHT_KINDS.has(kind);

export interface LightingLink {
	sw: SymbolItem;
	light: SymbolItem;
}

/** Валідні зв'язки «вимикач → світильник» (ігнорує id, що вказують на видалені / не-світильники). */
export function lightingLinks(scene: Scene): LightingLink[] {
	const byId = new Map(scene.symbols.map((s) => [s.id, s]));
	const out: LightingLink[] = [];
	for (const sw of scene.symbols) {
		if (!isSwitch(sw.kind) || !sw.links) continue;
		for (const id of sw.links) {
			const light = byId.get(id);
			if (light && isLight(light.kind)) out.push({ sw, light });
		}
	}
	return out;
}

export type LightingIssueKind = 'light-no-switch' | 'switch-no-light';

export interface LightingIssue {
	kind: LightingIssueKind;
	symbolId: string;
}

/** Світильники без жодного вимикача та вимикачі без жодного світильника. */
export function lightingIssues(scene: Scene): LightingIssue[] {
	const links = lightingLinks(scene);
	const litLightIds = new Set(links.map((l) => l.light.id));
	const wiredSwitchIds = new Set(links.map((l) => l.sw.id));
	const issues: LightingIssue[] = [];
	for (const s of scene.symbols) {
		if (isLight(s.kind) && !litLightIds.has(s.id)) issues.push({ kind: 'light-no-switch', symbolId: s.id });
		if (isSwitch(s.kind) && !wiredSwitchIds.has(s.id)) issues.push({ kind: 'switch-no-light', symbolId: s.id });
	}
	return issues;
}

/** Додати / прибрати зв'язок; повертає новий масив `links` для вимикача. */
export function toggleLink(current: string[] | undefined, lightId: string): string[] | undefined {
	const set = new Set(current ?? []);
	if (set.has(lightId)) set.delete(lightId);
	else set.add(lightId);
	return set.size ? [...set] : undefined;
}
