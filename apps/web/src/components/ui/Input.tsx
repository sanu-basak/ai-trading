import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={cn('input', error && 'border-bear', className)} {...props} />
      {error && <p className="mt-1 text-xs text-bear">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
