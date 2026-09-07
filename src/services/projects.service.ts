import { firebaseCollections, firebaseFirestore } from '../config/firebase.config';
import { FirebaseFactory } from '../config/firebase.factory';
import type { Scene } from '../domain/scene';

export interface ProjectDoc {
	id: string;
	name: string;
	scene: Scene;
	createdAt: number;
	updatedAt: number;
	createdByEmail: string;
}

export const dbProjects = new FirebaseFactory<ProjectDoc>(firebaseFirestore, firebaseCollections.projects);
