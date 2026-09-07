import { normalizeScene, type Scene } from './scene';

export interface ProjectFile {
	format: 'floor-planner';
	version: 1;
	name: string;
	scene: Scene;
	exportedAt: number;
}

export function toProjectFile(name: string, scene: Scene): string {
	const payload: ProjectFile = { format: 'floor-planner', version: 1, name, scene, exportedAt: Date.now() };
	return JSON.stringify(payload, null, '\t');
}

export interface ParsedProjectFile {
	name: string;
	scene: Scene;
}

export function fromProjectFile(json: string): ParsedProjectFile {
	const raw = JSON.parse(json) as Partial<ProjectFile> & { scene?: unknown };
	if (raw.format && raw.format !== 'floor-planner') {
		throw new Error('Непідтримуваний формат файлу.');
	}
	const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Імпортований план';
	const scene = normalizeScene((raw.scene ?? raw) as never, name);
	if (scene.walls.length === 0 && scene.rooms.length === 0 && scene.furniture.length === 0) {
		throw new Error('Файл не містить плану.');
	}
	return { name, scene };
}
