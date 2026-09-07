import { create } from 'zustand';
import { toast } from '../components/UI/toast';
import { emptyScene, normalizeScene, type Scene } from '../domain/scene';
import { dbProjects, type ProjectDoc } from '../services/projects.service';

interface ProjectsState {
	list: ProjectDoc[];
	isLoading: boolean;
	fetchAll: () => Promise<void>;
	create: (name: string, createdByEmail: string) => Promise<ProjectDoc | null>;
	importFile: (name: string, scene: Scene, createdByEmail: string) => Promise<ProjectDoc | null>;
	rename: (id: string, name: string) => Promise<void>;
	remove: (id: string) => Promise<void>;
	duplicate: (id: string, createdByEmail: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
	list: [],
	isLoading: false,

	fetchAll: async () => {
		set({ isLoading: true });
		try {
			const list = await dbProjects.getAll('updatedAt', 'desc');
			set({ list });
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося завантажити проєкти.');
		} finally {
			set({ isLoading: false });
		}
	},

	create: async (name, createdByEmail) => {
		try {
			const now = Date.now();
			const doc = await dbProjects.create({
				name: name.trim() || 'Без назви',
				scene: emptyScene(name.trim() || 'Без назви'),
				createdAt: now,
				updatedAt: now,
				createdByEmail,
			});
			set({ list: [doc, ...get().list] });
			return doc;
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося створити проєкт.');
			return null;
		}
	},

	importFile: async (name, scene, createdByEmail) => {
		try {
			const now = Date.now();
			const doc = await dbProjects.create({ name, scene, createdAt: now, updatedAt: now, createdByEmail });
			set({ list: [doc, ...get().list] });
			toast.success('Проєкт імпортовано.');
			return doc;
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося імпортувати.');
			return null;
		}
	},

	rename: async (id, name) => {
		const clean = name.trim() || 'Без назви';
		try {
			await dbProjects.update({ id, name: clean, updatedAt: Date.now() });
			set({ list: get().list.map((p) => (p.id === id ? { ...p, name: clean } : p)) });
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося перейменувати.');
		}
	},

	remove: async (id) => {
		try {
			await dbProjects.delete(id);
			set({ list: get().list.filter((p) => p.id !== id) });
			toast.success('Проєкт видалено.');
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося видалити.');
		}
	},

	duplicate: async (id, createdByEmail) => {
		const src = get().list.find((p) => p.id === id);
		if (!src) return;
		try {
			const now = Date.now();
			const name = `${src.name} (копія)`;
			const doc = await dbProjects.create({
				name,
				scene: normalizeScene(src.scene, name),
				variants: src.variants?.map((v) => ({ ...v, scene: normalizeScene(v.scene, v.name) })),
				activeVariantId: src.activeVariantId,
				createdAt: now,
				updatedAt: now,
				createdByEmail,
			});
			set({ list: [doc, ...get().list] });
			toast.success('Створено копію.');
		} catch (error) {
			console.error(error);
			toast.error('Не вдалося дублювати.');
		}
	},
}));
