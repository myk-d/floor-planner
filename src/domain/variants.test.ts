import { describe, expect, it } from 'vitest';
import { emptyScene, makeRoomRect } from './scene';
import { duplicateVariant, nextVariantName, readVariants, removeVariant } from './variants';

function legacyDoc() {
	const scene = emptyScene('Квартира');
	const r = makeRoomRect(0, 0, 300, 400, 10, 'Кімната');
	scene.rooms.push(r.room);
	scene.walls.push(...r.walls);
	return { name: 'Квартира', scene };
}

describe('readVariants', () => {
	it('wraps a single-plan doc into "Варіант 1"', () => {
		const { variants, activeId } = readVariants(legacyDoc());
		expect(variants).toHaveLength(1);
		expect(variants[0].name).toBe('Варіант 1');
		expect(variants[0].scene.rooms).toHaveLength(1);
		expect(activeId).toBe(variants[0].id);
	});

	it('normalizes every stored variant and keeps the active id', () => {
		const doc = {
			name: 'Квартира',
			scene: emptyScene('Квартира'),
			variants: [
				{ id: 'a', name: 'Було', scene: { rooms: [], walls: [] } },
				{ id: 'b', name: 'Стало', scene: { rooms: [], walls: [] } },
			],
			activeVariantId: 'b',
		};
		const { variants, activeId } = readVariants(doc);
		expect(variants.map((v) => v.id)).toEqual(['a', 'b']);
		expect(variants[0].scene.settings).toBeDefined(); // normalizeScene ran
		expect(activeId).toBe('b');
	});

	it('falls back to the first variant when activeVariantId is stale', () => {
		const doc = {
			name: 'X',
			scene: emptyScene('X'),
			variants: [{ id: 'a', name: 'A', scene: {} }],
			activeVariantId: 'gone',
		};
		expect(readVariants(doc).activeId).toBe('a');
	});
});

describe('nextVariantName', () => {
	it('picks the first free "Варіант N"', () => {
		expect(nextVariantName([])).toBe('Варіант 1');
		expect(nextVariantName(['Варіант 1', 'Варіант 2'])).toBe('Варіант 3');
		expect(nextVariantName(['Варіант 1', 'Мій план'])).toBe('Варіант 3');
	});
});

describe('duplicateVariant / removeVariant', () => {
	it('duplicate inserts a deep copy after the source and activates it', () => {
		const set = readVariants(legacyDoc());
		const dup = duplicateVariant(set, set.activeId);
		expect(dup.variants).toHaveLength(2);
		expect(dup.variants[1].name).toBe('Варіант 1 (копія)');
		expect(dup.activeId).toBe(dup.variants[1].id);
		dup.variants[1].scene.rooms[0].name = 'Змінено';
		expect(dup.variants[0].scene.rooms[0].name).toBe('Кімната'); // independent copy
	});

	it('remove keeps at least one variant and re-points the active id', () => {
		let set = readVariants(legacyDoc());
		set = duplicateVariant(set, set.activeId); // now 2, active = copy
		const firstId = set.variants[0].id;
		const afterRemoveActive = removeVariant(set, set.activeId);
		expect(afterRemoveActive.variants).toHaveLength(1);
		expect(afterRemoveActive.activeId).toBe(firstId);
		expect(removeVariant(afterRemoveActive, firstId).variants).toHaveLength(1); // last one stays
	});
});
