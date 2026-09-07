import { LogIn } from 'lucide-react';
import Button from '../components/UI/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
	const { loginWithGoogle, isLoggingIn } = useAuthStore();

	return (
		<div className="flex h-full items-center justify-center p-4">
			<div className="w-full max-w-sm rounded-xl bg-panel p-8 text-center shadow-sm">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-white">
					<svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2}>
						<rect x="5" y="5" width="22" height="22" />
						<line x1="5" y1="17" x2="19" y2="17" />
						<line x1="19" y1="17" x2="19" y2="27" />
					</svg>
				</div>
				<h1 className="text-lg font-semibold">Планувальник квартири</h1>
				<p className="mt-1 text-sm text-muted">Приватний доступ. Увійдіть через Google.</p>
				<Button className="mt-6 w-full" size="lg" onClick={loginWithGoogle} isLoading={isLoggingIn}>
					<LogIn className="h-4 w-4" />
					Увійти через Google
				</Button>
			</div>
		</div>
	);
}
