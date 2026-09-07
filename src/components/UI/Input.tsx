import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
	<input
		ref={ref}
		className={cn(
			'w-full rounded-md border border-panel-border bg-panel px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand',
			className,
		)}
		{...props}
	/>
));
Input.displayName = 'Input';

export default Input;
