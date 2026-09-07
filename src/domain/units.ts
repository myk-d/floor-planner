import type { Units } from './scene';

/** Форматує довжину в см у рядок у вибраних одиницях. */
export function formatLength(cm: number, units: Units): string {
	switch (units) {
		case 'm': {
			const m = cm / 100;
			// до мм, без зайвих нулів
			return `${trimZeros(m.toFixed(3))} м`;
		}
		case 'cm':
			return `${trimZeros(cm.toFixed(1))} см`;
		case 'mm':
			return `${Math.round(cm * 10)} мм`;
	}
}

/** Коротка форма для розмірних ліній: "3,45" (м) або "345" (см) без суфікса. */
export function formatLengthShort(cm: number, units: Units): string {
	switch (units) {
		case 'm':
			return trimZeros((cm / 100).toFixed(2)).replace('.', ',');
		case 'cm':
			return trimZeros(cm.toFixed(0));
		case 'mm':
			return String(Math.round(cm * 10));
	}
}

export function formatAreaM2(m2: number): string {
	return `${trimZeros(m2.toFixed(2)).replace('.', ',')} м²`;
}

/** Парсить рядок користувача у см. Приймає кому/крапку та явний суфікс (м/см/мм). */
export function parseLength(input: string, units: Units): number | null {
	const raw = input.trim().toLowerCase().replace(',', '.');
	if (!raw) return null;
	const match = raw.match(/^(-?\d*\.?\d+)\s*(м|m|см|cm|мм|mm)?$/);
	if (!match) return null;
	const value = parseFloat(match[1]);
	if (Number.isNaN(value)) return null;
	const suffix = match[2];
	if (suffix === 'м' || suffix === 'm') return value * 100;
	if (suffix === 'см' || suffix === 'cm') return value;
	if (suffix === 'мм' || suffix === 'mm') return value / 10;
	// без суфікса — трактуємо в поточних одиницях
	if (units === 'm') return value * 100;
	if (units === 'mm') return value / 10;
	return value;
}

export const unitLabel: Record<Units, string> = { m: 'метри', cm: 'сантиметри', mm: 'міліметри' };

function trimZeros(s: string): string {
	return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
