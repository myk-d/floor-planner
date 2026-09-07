import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	isLoading?: boolean;
}

const variants: Record<Variant, string> = {
	primary: 'bg-brand text-white hover:bg-brand-hover',
	outline: 'border border-panel-border bg-panel text-page-text hover:bg-page-bg',
	ghost: 'bg-transparent text-page-text hover:bg-page-bg',
	danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
	sm: 'px-3 py-1.5 text-sm',
	md: 'px-4 py-2 text-sm',
	lg: 'px-5 py-2.5 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => (
		<button
			ref={ref}
			disabled={disabled || isLoading}
			className={cn(
				'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
				variants[variant],
				sizes[size],
				className,
			)}
			{...props}
		>
			{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
			{children}
		</button>
	),
);
Button.displayName = 'Button';

export default Button;
