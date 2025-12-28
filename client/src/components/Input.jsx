import { forwardRef } from 'react';

const Input = forwardRef(({ label, icon, error, className, ...props }, ref) => {
	return (
		<div className="w-full">
			{label && (
				<label
					htmlFor={props.id}
					className="block text-sm font-medium text-foreground mb-1.5"
				>
					{label}
				</label>
			)}
			<div className="relative">
				{icon && (
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
						{icon}
					</div>
				)}
				<input
					ref={ref}
					className={`w-full bg-input-background border border-input text-foreground text-sm rounded-xl focus:ring-2 focus:ring-ring/20 focus:border-ring block p-3 transition-all duration-200 outline-none placeholder:text-muted-foreground/50
					${icon ? 'pl-10' : ''}
					${error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}
					${className || ''}`}
					{...props}
				/>
			</div>
			{error && (
				<p className="mt-1.5 text-sm text-destructive">
					{error}
				</p>
			)}
		</div>
	);
});

Input.displayName = 'Input';

export default Input;