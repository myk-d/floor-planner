import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { create } from 'zustand';
import { toast } from '../components/UI/toast';
import { firebaseAuth, firebaseProvider } from '../config/firebase.config';
import { isAllowedEmail } from '../constants/allowlist';

interface AuthState {
	user: User | null;
	isInitializing: boolean;
	isLoggingIn: boolean;
	loginWithGoogle: () => Promise<void>;
	logout: () => Promise<void>;
	initializeAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	isInitializing: true,
	isLoggingIn: false,

	loginWithGoogle: async () => {
		try {
			set({ isLoggingIn: true });
			await signInWithPopup(firebaseAuth, firebaseProvider);
		} catch (error) {
			const code = (error as { code?: string })?.code;
			if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
				toast.error(`Не вдалося увійти через Google${code ? ` (${code})` : ''}.`);
			}
		} finally {
			set({ isLoggingIn: false });
		}
	},

	logout: async () => {
		try {
			await signOut(firebaseAuth);
			set({ user: null });
		} catch (error) {
			console.error('Помилка виходу:', error);
		}
	},

	initializeAuthListener: () => {
		// Якщо Firebase недоступний (немає конфігу / офлайн) — не залипаємо на спінері назавжди.
		const fallback = window.setTimeout(() => {
			if (get().isInitializing) set({ isInitializing: false });
		}, 5000);

		const unsub = onAuthStateChanged(firebaseAuth, async (currentUser) => {
			window.clearTimeout(fallback);
			if (currentUser && !isAllowedEmail(currentUser.email)) {
				// Стороння Google-акаунт — застосунок приватний.
				toast.error('Немає доступу: цей акаунт не в списку дозволених.');
				await signOut(firebaseAuth);
				set({ user: null, isInitializing: false });
				return;
			}
			set({ user: currentUser, isInitializing: false });
		});

		return () => {
			window.clearTimeout(fallback);
			unsub();
		};
	},
}));
