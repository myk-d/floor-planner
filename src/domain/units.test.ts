import { describe, expect, it } from 'vitest';
import { formatAreaM2, formatLength, formatLengthShort, parseLength } from './units';

describe('formatLength', () => {
	it('metres', () => {
		expect(formatLength(345, 'm')).toBe('3.45 м');
		expect(formatLength(300, 'm')).toBe('3 м');
	});
	it('centimetres', () => {
		expect(formatLength(345, 'cm')).toBe('345 см');
	});
	it('millimetres', () => {
		expect(formatLength(34.5, 'mm')).toBe('345 мм');
	});
});

describe('formatLengthShort', () => {
	it('metres with comma', () => {
		expect(formatLengthShort(345, 'm')).toBe('3,45');
		expect(formatLengthShort(300, 'm')).toBe('3');
	});
});

describe('formatAreaM2', () => {
	it('comma decimal + unit', () => {
		expect(formatAreaM2(12.5)).toBe('12,5 м²');
		expect(formatAreaM2(12)).toBe('12 м²');
	});
});

describe('parseLength', () => {
	it('bare number in metres mode', () => {
		expect(parseLength('3.45', 'm')).toBe(345);
	});
	it('comma decimal', () => {
		expect(parseLength('3,5', 'm')).toBe(350);
	});
	it('explicit suffix overrides mode', () => {
		expect(parseLength('50 см', 'm')).toBe(50);
		expect(parseLength('2m', 'cm')).toBe(200);
	});
	it('bare number in cm mode', () => {
		expect(parseLength('120', 'cm')).toBe(120);
	});
	it('rejects garbage', () => {
		expect(parseLength('abc', 'm')).toBeNull();
		expect(parseLength('', 'm')).toBeNull();
	});
});
