export type CatalogCategory =
	| 'Кухня'
	| 'Ванна та санвузол'
	| 'Вітальня'
	| 'Спальня'
	| 'Дитяча'
	| 'Кабінет'
	| 'Їдальня'
	| 'Передпокій'
	| 'Техніка'
	| 'Декор та рослини'
	| 'Вулиця';

export interface CatalogItem {
	kind: string;
	category: CatalogCategory;
	label: string;
	/** ширина (локальна X), см */
	w: number;
	/** глибина (локальна Y), см */
	d: number;
	color: string;
}

const WOOD = '#c9a27a';
const SOFT = '#8ea9c4';
const WHITE = '#e7ebef';
const METAL = '#b8bfc7';

export const CATALOG: CatalogItem[] = [
	// Кухня
	{ kind: 'stove', category: 'Кухня', label: 'Плита', w: 60, d: 60, color: METAL },
	{ kind: 'kitchen-sink', category: 'Кухня', label: 'Мийка', w: 80, d: 60, color: METAL },
	{ kind: 'fridge', category: 'Кухня', label: 'Холодильник', w: 60, d: 65, color: WHITE },
	{ kind: 'kitchen-cabinet', category: 'Кухня', label: 'Кухонна шафа', w: 60, d: 60, color: WOOD },
	{ kind: 'kitchen-counter', category: 'Кухня', label: 'Стільниця', w: 120, d: 60, color: WOOD },
	{ kind: 'hood', category: 'Кухня', label: 'Витяжка', w: 60, d: 45, color: METAL },
	{ kind: 'dining-table', category: 'Кухня', label: 'Обідній стіл', w: 120, d: 80, color: WOOD },
	{ kind: 'chair', category: 'Кухня', label: 'Стілець', w: 45, d: 45, color: WOOD },

	// Ванна
	{ kind: 'bathtub', category: 'Ванна та санвузол', label: 'Ванна', w: 170, d: 75, color: WHITE },
	{ kind: 'shower', category: 'Ванна та санвузол', label: 'Душова кабіна', w: 90, d: 90, color: WHITE },
	{ kind: 'toilet', category: 'Ванна та санвузол', label: 'Унітаз', w: 40, d: 65, color: WHITE },
	{ kind: 'sink', category: 'Ванна та санвузол', label: 'Раковина', w: 55, d: 45, color: WHITE },
	{ kind: 'washer', category: 'Ванна та санвузол', label: 'Пральна машина', w: 60, d: 60, color: WHITE },
	{ kind: 'towel-rail', category: 'Ванна та санвузол', label: 'Рушникосушка', w: 60, d: 12, color: METAL },
	{ kind: 'bidet', category: 'Ванна та санвузол', label: 'Біде', w: 38, d: 60, color: WHITE },

	// Вітальня
	{ kind: 'sofa', category: 'Вітальня', label: 'Диван', w: 220, d: 95, color: SOFT },
	{ kind: 'corner-sofa', category: 'Вітальня', label: 'Кутовий диван', w: 260, d: 190, color: SOFT },
	{ kind: 'armchair', category: 'Вітальня', label: 'Крісло', w: 85, d: 85, color: SOFT },
	{ kind: 'coffee-table', category: 'Вітальня', label: 'Журнальний столик', w: 110, d: 60, color: WOOD },
	{ kind: 'tv-stand', category: 'Вітальня', label: 'ТВ-тумба', w: 160, d: 40, color: WOOD },
	{ kind: 'bookshelf', category: 'Вітальня', label: 'Стелаж', w: 90, d: 35, color: WOOD },
	{ kind: 'rug', category: 'Вітальня', label: 'Килим', w: 200, d: 140, color: '#d8c7b0' },

	// Спальня
	{ kind: 'bed-double', category: 'Спальня', label: 'Двоспальне ліжко', w: 160, d: 200, color: SOFT },
	{ kind: 'bed-single', category: 'Спальня', label: 'Односпальне ліжко', w: 90, d: 200, color: SOFT },
	{ kind: 'nightstand', category: 'Спальня', label: 'Тумбочка', w: 45, d: 40, color: WOOD },
	{ kind: 'wardrobe', category: 'Спальня', label: 'Шафа', w: 180, d: 60, color: WOOD },
	{ kind: 'dresser', category: 'Спальня', label: 'Комод', w: 100, d: 45, color: WOOD },
	{ kind: 'vanity', category: 'Спальня', label: 'Туалетний столик', w: 100, d: 45, color: WOOD },

	// Дитяча
	{ kind: 'kid-bed', category: 'Дитяча', label: 'Дитяче ліжко', w: 80, d: 160, color: SOFT },
	{ kind: 'desk', category: 'Дитяча', label: 'Письмовий стіл', w: 120, d: 60, color: WOOD },
	{ kind: 'kid-wardrobe', category: 'Дитяча', label: 'Дитяча шафа', w: 100, d: 55, color: WOOD },

	// Передпокій
	{ kind: 'hall-wardrobe', category: 'Передпокій', label: 'Шафа-купе', w: 150, d: 60, color: WOOD },
	{ kind: 'shoe-cabinet', category: 'Передпокій', label: 'Взуттєвиця', w: 80, d: 35, color: WOOD },
	{ kind: 'mirror', category: 'Передпокій', label: 'Дзеркало', w: 60, d: 6, color: '#cfe6f0' },

	// Техніка
	{ kind: 'radiator', category: 'Техніка', label: 'Радіатор', w: 90, d: 12, color: METAL },
	{ kind: 'boiler', category: 'Техніка', label: 'Бойлер', w: 45, d: 45, color: WHITE },
	{ kind: 'ac-unit', category: 'Техніка', label: 'Кондиціонер', w: 90, d: 20, color: WHITE },

	// Кухня (додатково)
	{ kind: 'oven', category: 'Кухня', label: 'Духова шафа', w: 60, d: 58, color: METAL },
	{ kind: 'cooktop', category: 'Кухня', label: 'Варильна поверхня', w: 60, d: 52, color: '#2b2b2b' },
	{ kind: 'dishwasher', category: 'Кухня', label: 'Посудомийна машина', w: 60, d: 60, color: WHITE },
	{ kind: 'microwave', category: 'Кухня', label: 'Мікрохвильова піч', w: 50, d: 40, color: METAL },
	{ kind: 'kitchen-island', category: 'Кухня', label: 'Острів', w: 120, d: 90, color: WOOD },
	{ kind: 'bar-counter', category: 'Кухня', label: 'Барна стійка', w: 140, d: 45, color: WOOD },
	{ kind: 'bar-stool', category: 'Кухня', label: 'Барний стілець', w: 40, d: 40, color: METAL },
	{ kind: 'wine-fridge', category: 'Кухня', label: 'Винний холодильник', w: 45, d: 60, color: '#2b2b2b' },
	{ kind: 'corner-cabinet', category: 'Кухня', label: 'Кутова шафа', w: 90, d: 90, color: WOOD },
	{ kind: 'tall-cabinet', category: 'Кухня', label: 'Пенал', w: 60, d: 60, color: WOOD },

	// Ванна (додатково)
	{ kind: 'shower-tray', category: 'Ванна та санвузол', label: 'Піддон', w: 80, d: 80, color: WHITE },
	{ kind: 'vanity-unit', category: 'Ванна та санвузол', label: 'Тумба з раковиною', w: 80, d: 48, color: WOOD },
	{ kind: 'double-vanity', category: 'Ванна та санвузол', label: 'Подвійна тумба', w: 130, d: 48, color: WOOD },
	{ kind: 'dryer', category: 'Ванна та санвузол', label: 'Сушильна машина', w: 60, d: 60, color: WHITE },
	{ kind: 'bathroom-cabinet', category: 'Ванна та санвузол', label: 'Шафка у ванну', w: 60, d: 20, color: WHITE },
	{ kind: 'urinal', category: 'Ванна та санвузол', label: 'Пісуар', w: 35, d: 30, color: WHITE },

	// Вітальня (додатково)
	{ kind: 'sofa-3', category: 'Вітальня', label: 'Диван 3-місний', w: 240, d: 100, color: SOFT },
	{ kind: 'sofa-2', category: 'Вітальня', label: 'Диван 2-місний', w: 160, d: 95, color: SOFT },
	{ kind: 'sofa-bed', category: 'Вітальня', label: 'Диван-ліжко', w: 210, d: 100, color: SOFT },
	{ kind: 'ottoman', category: 'Вітальня', label: 'Пуф', w: 60, d: 60, color: SOFT },
	{ kind: 'round-coffee-table', category: 'Вітальня', label: 'Круглий столик', w: 80, d: 80, color: WOOD },
	{ kind: 'tv-wall', category: 'Вітальня', label: 'ТВ на стіні', w: 130, d: 10, color: '#2b2b2b' },
	{ kind: 'fireplace', category: 'Вітальня', label: 'Камін', w: 120, d: 40, color: '#8a8a8a' },
	{ kind: 'piano', category: 'Вітальня', label: 'Піаніно', w: 150, d: 60, color: '#1e1e1e' },
	{ kind: 'display-cabinet', category: 'Вітальня', label: 'Вітрина', w: 100, d: 40, color: WOOD },

	// Спальня (додатково)
	{ kind: 'bed-queen', category: 'Спальня', label: 'Ліжко queen', w: 150, d: 200, color: SOFT },
	{ kind: 'bed-king', category: 'Спальня', label: 'Ліжко king', w: 180, d: 200, color: SOFT },
	{ kind: 'bench-bed', category: 'Спальня', label: 'Банкетка', w: 120, d: 40, color: SOFT },
	{ kind: 'wardrobe-corner', category: 'Спальня', label: 'Кутова шафа', w: 120, d: 120, color: WOOD },
	{ kind: 'wardrobe-3', category: 'Спальня', label: 'Шафа 3-дверна', w: 240, d: 60, color: WOOD },
	{ kind: 'chest-tall', category: 'Спальня', label: 'Високий комод', w: 60, d: 45, color: WOOD },

	// Дитяча (додатково)
	{ kind: 'bunk-bed', category: 'Дитяча', label: 'Двоярусне ліжко', w: 90, d: 200, color: SOFT },
	{ kind: 'crib', category: 'Дитяча', label: 'Дитяче ліжечко', w: 70, d: 130, color: SOFT },
	{ kind: 'changing-table', category: 'Дитяча', label: 'Пеленальний столик', w: 80, d: 55, color: WOOD },
	{ kind: 'toy-storage', category: 'Дитяча', label: 'Стелаж для іграшок', w: 90, d: 35, color: WOOD },
	{ kind: 'play-mat', category: 'Дитяча', label: 'Ігровий килимок', w: 150, d: 150, color: '#d8c7b0' },

	// Кабінет
	{ kind: 'office-desk', category: 'Кабінет', label: 'Робочий стіл', w: 140, d: 70, color: WOOD },
	{ kind: 'corner-desk', category: 'Кабінет', label: 'Кутовий стіл', w: 140, d: 140, color: WOOD },
	{ kind: 'office-chair', category: 'Кабінет', label: 'Крісло офісне', w: 60, d: 60, color: '#2b2b2b' },
	{ kind: 'filing-cabinet', category: 'Кабінет', label: 'Картотека', w: 45, d: 60, color: METAL },
	{ kind: 'library-shelf', category: 'Кабінет', label: 'Книжкова шафа', w: 100, d: 30, color: WOOD },
	{ kind: 'safe', category: 'Кабінет', label: 'Сейф', w: 45, d: 45, color: '#3a3a3a' },
	{ kind: 'printer-stand', category: 'Кабінет', label: 'Тумба під принтер', w: 55, d: 50, color: WOOD },

	// Їдальня
	{ kind: 'dining-6', category: 'Їдальня', label: 'Стіл на 6', w: 160, d: 90, color: WOOD },
	{ kind: 'dining-8', category: 'Їдальня', label: 'Стіл на 8', w: 220, d: 100, color: WOOD },
	{ kind: 'round-dining', category: 'Їдальня', label: 'Круглий обідній стіл', w: 120, d: 120, color: WOOD },
	{ kind: 'sideboard', category: 'Їдальня', label: 'Буфет', w: 160, d: 45, color: WOOD },
	{ kind: 'bar-cart', category: 'Їдальня', label: 'Сервірувальний візок', w: 70, d: 40, color: METAL },

	// Передпокій (додатково)
	{ kind: 'console-table', category: 'Передпокій', label: 'Консоль', w: 100, d: 35, color: WOOD },
	{ kind: 'coat-rack', category: 'Передпокій', label: 'Вішак', w: 40, d: 40, color: METAL },
	{ kind: 'bench-hall', category: 'Передпокій', label: 'Лавка', w: 100, d: 40, color: WOOD },
	{ kind: 'umbrella-stand', category: 'Передпокій', label: 'Підставка для парасоль', w: 25, d: 25, color: METAL },

	// Декор та рослини
	{ kind: 'plant-large', category: 'Декор та рослини', label: 'Велика рослина', w: 50, d: 50, color: '#4b7f52' },
	{ kind: 'plant-small', category: 'Декор та рослини', label: 'Мала рослина', w: 25, d: 25, color: '#4b7f52' },
	{ kind: 'floor-lamp', category: 'Декор та рослини', label: 'Торшер', w: 35, d: 35, color: '#c9b28a' },
	{ kind: 'rug-round', category: 'Декор та рослини', label: 'Круглий килим', w: 160, d: 160, color: '#d8c7b0' },
	{ kind: 'rug-runner', category: 'Декор та рослини', label: 'Доріжка', w: 80, d: 250, color: '#d8c7b0' },
	{ kind: 'artwork', category: 'Декор та рослини', label: 'Картина', w: 90, d: 5, color: '#cdb58c' },
	{ kind: 'aquarium', category: 'Декор та рослини', label: 'Акваріум', w: 100, d: 40, color: '#9cc9d6' },

	// Вулиця
	{ kind: 'outdoor-sofa', category: 'Вулиця', label: 'Вуличний диван', w: 200, d: 85, color: '#9aa79a' },
	{ kind: 'outdoor-table', category: 'Вулиця', label: 'Вуличний стіл', w: 120, d: 80, color: '#9aa79a' },
	{ kind: 'sun-lounger', category: 'Вулиця', label: 'Шезлонг', w: 60, d: 190, color: '#9aa79a' },
	{ kind: 'parasol', category: 'Вулиця', label: 'Парасоля', w: 250, d: 250, color: '#c9b28a' },
	{ kind: 'bbq', category: 'Вулиця', label: 'Гриль', w: 70, d: 60, color: '#3a3a3a' },
	{ kind: 'planter-box', category: 'Вулиця', label: 'Вазон', w: 100, d: 40, color: '#4b7f52' },
	{ kind: 'car', category: 'Вулиця', label: 'Автомобіль', w: 180, d: 450, color: '#8a9aa8' },
];

export const catalogByKind: Record<string, CatalogItem> = Object.fromEntries(CATALOG.map((c) => [c.kind, c]));

export const CATALOG_CATEGORIES: CatalogCategory[] = [
	'Кухня',
	'Ванна та санвузол',
	'Вітальня',
	'Спальня',
	'Дитяча',
	'Кабінет',
	'Їдальня',
	'Передпокій',
	'Техніка',
	'Декор та рослини',
	'Вулиця',
];
