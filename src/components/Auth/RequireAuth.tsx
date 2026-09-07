import { Loader2 } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { UrlConfig } from '../../constants/urls';
import { isAllowedEmail } from '../../constants/allowlist';
import { useAuthStore } from '../../store/useAuthStore';

const FullscreenLoader: React.FC = () => (
	<div className="flex h-full items-center justify-center">
		<Loader2 className="h-6 w-6 animate-spin text-brand" />
	</div>
);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, isInitializing } = useAuthStore();
	if (isInitializing) return <FullscreenLoader />;
	if (!user || !isAllowedEmail(user.email)) return <Navigate to={UrlConfig.login} replace />;
	return <>{children}</>;
};

export const RedirectIfAuthed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, isInitializing } = useAuthStore();
	if (isInitializing) return <FullscreenLoader />;
	if (user && isAllowedEmail(user.email)) return <Navigate to={UrlConfig.projects} replace />;
	return <>{children}</>;
};
