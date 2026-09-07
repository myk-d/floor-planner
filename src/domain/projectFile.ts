import { normalizeScene, type Scene } from './scene';
import { readVariants, type Variant } from './variants';

export interface ProjectFile {
	format: 'floor-planner';
	/** 1 — одна сцена; 2 — з варіантами планування */
	version: 1 | 2;
	name: string;
	/** активний варіант — присутній завжди, для сумісності з v1 */
	scene: Scene;
	variants?: { id: string; name: string; scene: Scene }[];
	activeVariantId?: string;
	exportedAt: number;
}

export function toProjectFile(name: string, scene: Scene, variants?: Variant[], activeVariantId?: string): string {
	const multi = !!variants && variants.length > 1;
	const payload: ProjectFile = {
		format: 'floor-planner',
		version: multi ? 2 : 1,
		name,
		scene,
		exportedAt: Date.now(),
		...(multi ? { variants, activeVariantId } : {}),
	};
	return JSON.stringify(payload, null, '\t');
}

export interface ParsedProjectFile {
	name: string;
	scene: Scene;
	variants?: Variant[];
	activeVariantId?: string;
}

export function fromProjectFile(json: string): ParsedProjectFile {
	const raw = JSON.parse(json) as Partial<ProjectFile> & { scene?: unknown; variants?: unknown };
	if (raw.format && raw.format !== 'floor-planner') {
		throw new Error('Непідтримуваний формат файлу.');
	}
	const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Імпортований план';
	const sceneRaw = raw.scene ?? raw;

	if (Array.isArray(raw.variants) && raw.variants.length > 0) {
		const { variants, activeId } = readVariants({ name, scene: sceneRaw, variants: raw.variants as never, activeVariantId: raw.activeVariantId });
		const active = variants.find((v) => v.id === activeId)!;
		if (!hasContent(active.scene)) throw new Error('Файл не містить плану.');
		return { name, scene: active.scene, variants, activeVariantId: activeId };
	}

	const scene = normalizeScene(sceneRaw as never, name);
	if (!hasContent(scene)) throw new Error('Файл не містить плану.');
	return { name, scene };
}

const hasContent = (s: Scene): boolean => s.walls.length > 0 || s.rooms.length > 0 || s.furniture.length > 0;
