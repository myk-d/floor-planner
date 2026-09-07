import { newId, normalizeScene, type Scene } from './scene';

export interface Variant {
	id: string;
	name: string;
	scene: Scene;
}

export interface VariantSet {
	variants: Variant[];
	activeId: string;
}

interface RawDoc {
	name: string;
	scene: unknown;
	variants?: { id: string; name: string; scene: unknown }[];
	activeVariantId?: string;
}

/**
 * Розкладає проєкт на варіанти планування, нормалізуючи кожну сцену.
 * Старий однопланний документ → один «Варіант 1».
 */
export function readVariants(doc: RawDoc): VariantSet {
	const list: Variant[] =
		doc.variants && doc.variants.length > 0
			? doc.variants.map((v) => ({ id: v.id, name: v.name, scene: normalizeScene(v.scene as never, v.name) }))
			: [{ id: newId(), name: 'Варіант 1', scene: normalizeScene(doc.scene as never, doc.name) }];
	const activeId = list.some((v) => v.id === doc.activeVariantId) ? doc.activeVariantId! : list[0].id;
	return { variants: list, activeId };
}

/** Наступна вільна назва в ряду «Варіант N». */
export function nextVariantName(existing: string[]): string {
	const taken = new Set(existing);
	for (let n = existing.length + 1; ; n++) {
		const name = `Варіант ${n}`;
		if (!taken.has(name)) return name;
	}
}

/** Копія варіанта `id` з новою назвою «… (копія)», вставлена одразу після нього. */
export function duplicateVariant(set: VariantSet, id: string): VariantSet {
	const idx = set.variants.findIndex((v) => v.id === id);
	if (idx < 0) return set;
	const src = set.variants[idx];
	const copy: Variant = { id: newId(), name: `${src.name} (копія)`, scene: normalizeScene(structuredClone(src.scene) as never, src.scene.settings.title) };
	const variants = [...set.variants.slice(0, idx + 1), copy, ...set.variants.slice(idx + 1)];
	return { variants, activeId: copy.id };
}

/** Прибирає варіант; не дає видалити останній. Якщо прибрали активний — активним стає перший. */
export function removeVariant(set: VariantSet, id: string): VariantSet {
	if (set.variants.length < 2) return set;
	const variants = set.variants.filter((v) => v.id !== id);
	const activeId = variants.some((v) => v.id === set.activeId) ? set.activeId : variants[0].id;
	return { variants, activeId };
}
