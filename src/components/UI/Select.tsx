import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
	({ className, children, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				'w-full rounded-md border border-panel-border bg-panel px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand',
				className,
			)}
			{...props}
		>
			{children}
		</select>
	),
);
Select.displayName = 'Select';

export default Select;
