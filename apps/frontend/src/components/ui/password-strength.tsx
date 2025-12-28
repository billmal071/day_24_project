'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  validatePassword,
  getPasswordStrength,
  type PasswordValidation,
} from '@/lib/utils/password-validation';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  const validation = validatePassword(password);

  const requirements: { key: keyof PasswordValidation; label: string }[] = [
    { key: 'minLength', label: 'At least 8 characters' },
    { key: 'hasUppercase', label: 'One uppercase letter' },
    { key: 'hasLowercase', label: 'One lowercase letter' },
    { key: 'hasNumber', label: 'One number' },
    { key: 'hasSpecial', label: 'One special character' },
  ];

  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={cn(
              'font-medium',
              strength.score <= 2 && 'text-red-500',
              strength.score === 3 && 'text-yellow-500',
              strength.score >= 4 && 'text-green-500',
            )}
          >
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              strength.color,
            )}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="grid grid-cols-1 gap-1 text-xs">
          {requirements.map(({ key, label }) => {
            const isMet = validation[key];
            return (
              <li
                key={key}
                className={cn(
                  'flex items-center gap-1.5 transition-colors',
                  isMet ? 'text-green-600' : 'text-muted-foreground',
                )}
              >
                {isMet ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
