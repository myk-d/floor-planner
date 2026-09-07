export const UrlConfig = {
	login: '/login',
	projects: '/',
	editor: (projectId: string) => `/editor/${projectId}`,
	editorPattern: '/editor/:projectId',
} as const;
