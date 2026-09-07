import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAuthed, RequireAuth } from './components/Auth/RequireAuth';
import { UrlConfig } from './constants/urls';
import { useAuthStore } from './store/useAuthStore';

const Login = lazy(() => import('./pages/Login'));
const Projects = lazy(() => import('./pages/Projects'));
const Editor = lazy(() => import('./pages/Editor'));

export default function App() {
	const initializeAuthListener = useAuthStore((s) => s.initializeAuthListener);

	useEffect(() => initializeAuthListener(), [initializeAuthListener]);

	return (
		<Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted">Завантаження…</div>}>
		<Routes>
			<Route
				path={UrlConfig.login}
				element={
					<RedirectIfAuthed>
						<Login />
					</RedirectIfAuthed>
				}
			/>
			<Route
				path={UrlConfig.projects}
				element={
					<RequireAuth>
						<Projects />
					</RequireAuth>
				}
			/>
			<Route
				path={UrlConfig.editorPattern}
				element={
					<RequireAuth>
						<Editor />
					</RequireAuth>
				}
			/>
			<Route path="*" element={<Navigate to={UrlConfig.projects} replace />} />
		</Routes>
		</Suspense>
	);
}
