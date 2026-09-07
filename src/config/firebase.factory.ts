import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	DocumentData,
	DocumentSnapshot,
	Firestore,
	getDoc,
	getDocs,
	onSnapshot,
	orderBy,
	OrderByDirection,
	query,
	QueryDocumentSnapshot,
	QueryFieldFilterConstraint,
	setDoc,
	updateDoc,
} from 'firebase/firestore';

interface ObjectWithId {
	id: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && value.constructor === Object;
}

function sanitizeValue(value: unknown): unknown {
	if (value === undefined) return null;
	if (Array.isArray(value)) return value.map(sanitizeValue);
	if (isPlainObject(value)) {
		const sanitized: Record<string, unknown> = {};
		for (const key of Object.keys(value)) sanitized[key] = sanitizeValue(value[key]);
		return sanitized;
	}
	return value;
}

/**
 * Firestore відхиляє поля зі значенням `undefined` — рекурсивно замінюємо їх на `null`,
 * щоб частковий/застарілий локальний стан не ламав запис.
 */
export function sanitizeForFirestore<T>(data: T): T {
	return sanitizeValue(data) as T;
}

/** Generic CRUD-обгортка над однією Firestore-колекцією. */
export class FirebaseFactory<T extends ObjectWithId> {
	constructor(
		private readonly firestore: Firestore,
		private readonly collectionName: string,
	) {}

	private withId = (snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): T =>
		({ ...snap.data(), id: snap.id }) as T;

	getAll = async (order?: string, direction: OrderByDirection = 'asc'): Promise<T[]> => {
		const col = collection(this.firestore, this.collectionName);
		const snapshot = await getDocs(order ? query(col, orderBy(order, direction)) : col);
		return snapshot.docs.map(this.withId);
	};

	getById = async (id: string): Promise<T | undefined> => {
		const ref = doc(this.firestore, this.collectionName, id);
		const snap = await getDoc(ref);
		return snap.exists() ? this.withId(snap) : undefined;
	};

	create = async (data: Omit<T, 'id'>): Promise<T> => {
		const col = collection(this.firestore, this.collectionName);
		const sanitized = sanitizeForFirestore(data);
		const created = await addDoc(col, sanitized as DocumentData);
		return { ...sanitized, id: created.id } as T;
	};

	set = async (id: string, data: Omit<T, 'id'>): Promise<T> => {
		const ref = doc(this.firestore, this.collectionName, id);
		const sanitized = sanitizeForFirestore(data);
		await setDoc(ref, sanitized as DocumentData);
		return { ...sanitized, id } as T;
	};

	update = async (data: Partial<T> & ObjectWithId): Promise<void> => {
		const { id, ...rest } = data;
		const ref = doc(this.firestore, this.collectionName, id);
		await updateDoc(ref, sanitizeForFirestore(rest) as DocumentData);
	};

	delete = async (id: string): Promise<void> => {
		await deleteDoc(doc(this.firestore, this.collectionName, id));
	};

	query = async (filter: QueryFieldFilterConstraint | QueryFieldFilterConstraint[]): Promise<T[]> => {
		const col = collection(this.firestore, this.collectionName);
		const q = query(col, ...(Array.isArray(filter) ? filter : [filter]));
		const snapshot = await getDocs(q);
		return snapshot.docs.map(this.withId);
	};

	/** Live-версія `getAll` — викликає `onData` одразу й на кожну зміну. Повертає unsubscribe. */
	subscribeAll = (onData: (items: T[]) => void, order?: string, direction: OrderByDirection = 'asc'): (() => void) => {
		const col = collection(this.firestore, this.collectionName);
		const q = order ? query(col, orderBy(order, direction)) : query(col);
		return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(this.withId)));
	};
}
