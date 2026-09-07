import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className }) => {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			onMouseDown={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className={cn('w-full max-w-lg rounded-lg bg-panel shadow-xl', className)}>
				<div className="flex items-center justify-between border-b border-panel-border px-5 py-3">
					<h2 className="text-base font-semibold">{title}</h2>
					<button onClick={onClose} className="rounded p-1 text-muted hover:bg-page-bg">
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="px-5 py-4">{children}</div>
			</div>
		</div>
	);
};

export default Modal;
