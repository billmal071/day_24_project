'use client';

import * as React from 'react';
import { useState } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

export interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  hint?: string;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, success, hint, className, id, type, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;
    const isValid = success && !hasError;
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
        <div className="relative">
          <Input
            id={fieldId}
            ref={ref}
            type={inputType}
            className={cn(
              className,
              hasError && 'border-red-500 focus-visible:ring-red-500',
              isValid && 'border-green-500 focus-visible:ring-green-500',
              isPassword ? 'pr-16' : 'pr-10',
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
            }
            {...props}
          />
          {hasError && (
            <AlertCircle className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-red-500", isPassword ? "right-8" : "right-3")} />
          )}
          {isValid && (
            <Check className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-green-500", isPassword ? "right-8" : "right-3")} />
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {hasError && (
          <p
            id={`${fieldId}-error`}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            {error}
          </p>
        )}
        {hint && !hasError && (
          <p id={`${fieldId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = 'FormField';

export { FormField };
