/* eslint-disable react-refresh/only-export-components */
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { create } from 'zustand';
import { newId } from '../../domain/scene';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
	id: string;
	kind: ToastKind;
	message: string;
}

interface ToastState {
	toasts: Toast[];
	push: (kind: ToastKind, message: string) => void;
	dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	push: (kind, message) => {
		const id = newId();
		set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
		setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
	},
	dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
	success: (m: string) => useToastStore.getState().push('success', m),
	error: (m: string) => useToastStore.getState().push('error', m),
	info: (m: string) => useToastStore.getState().push('info', m),
};

const icons = {
	success: <CheckCircle2 className="h-4 w-4 text-ok" />,
	error: <AlertTriangle className="h-4 w-4 text-danger" />,
	info: <Info className="h-4 w-4 text-brand" />,
};

export const Toaster: React.FC = () => {
	const { toasts, dismiss } = useToastStore();
	return (
		<div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className="flex items-center gap-2 rounded-md border border-panel-border bg-panel px-3 py-2 text-sm shadow-lg"
				>
					{icons[t.kind]}
					<span>{t.message}</span>
					<button onClick={() => dismiss(t.id)} className="ml-1 text-muted hover:text-page-text">
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			))}
		</div>
	);
};
