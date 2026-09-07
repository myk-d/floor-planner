import { firebaseCollections, firebaseFirestore } from '../config/firebase.config';
import { FirebaseFactory } from '../config/firebase.factory';
import type { Scene } from '../domain/scene';

/** Один варіант планування всередині проєкту. */
export interface ProjectVariant {
	id: string;
	name: string;
	scene: Scene;
}

export interface ProjectDoc {
	id: string;
	name: string;
	/** сцена активного варіанта — дублюється тут для сумісності зі старими читачами / експортом */
	scene: Scene;
	/** усі варіанти планування; якщо немає — проєкт однопланний (див. `domain/variants.ts`) */
	variants?: ProjectVariant[];
	activeVariantId?: string;
	createdAt: number;
	updatedAt: number;
	createdByEmail: string;
}

export const dbProjects = new FirebaseFactory<ProjectDoc>(firebaseFirestore, firebaseCollections.projects);
