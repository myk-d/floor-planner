/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		headers: {
			// Firebase Auth signInWithPopup needs the opener relationship kept across the popup.
			'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
		},
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.{ts,tsx}'],
	},
});
