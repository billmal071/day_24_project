// Password validation rules matching backend requirements
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  },
} as const;

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
}

export function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= PASSWORD_RULES.minLength,
    hasUppercase: PASSWORD_RULES.patterns.uppercase.test(password),
    hasLowercase: PASSWORD_RULES.patterns.lowercase.test(password),
    hasNumber: PASSWORD_RULES.patterns.number.test(password),
    hasSpecial: PASSWORD_RULES.patterns.special.test(password),
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'bg-gray-200' };
  }

  const validation = validatePassword(password);
  let score = 0;

  if (validation.minLength) score++;
  if (validation.hasUppercase) score++;
  if (validation.hasLowercase) score++;
  if (validation.hasNumber) score++;
  if (validation.hasSpecial) score++;

  const strengthMap: Record<number, PasswordStrength> = {
    0: { score: 0, label: 'Very Weak', color: 'bg-red-500' },
    1: { score: 1, label: 'Very Weak', color: 'bg-red-500' },
    2: { score: 2, label: 'Weak', color: 'bg-orange-500' },
    3: { score: 3, label: 'Fair', color: 'bg-yellow-500' },
    4: { score: 4, label: 'Good', color: 'bg-lime-500' },
    5: { score: 5, label: 'Strong', color: 'bg-green-500' },
  };

  return strengthMap[score];
}

export function isPasswordValid(password: string): boolean {
  const validation = validatePassword(password);
  return (
    validation.minLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecial
  );
}

export function getPasswordErrors(password: string): string[] {
  const validation = validatePassword(password);
  const errors: string[] = [];

  if (!validation.minLength) {
    errors.push('At least 8 characters');
  }
  if (!validation.hasUppercase) {
    errors.push('One uppercase letter');
  }
  if (!validation.hasLowercase) {
    errors.push('One lowercase letter');
  }
  if (!validation.hasNumber) {
    errors.push('One number');
  }
  if (!validation.hasSpecial) {
    errors.push('One special character (!@#$%^&*...)');
  }

  return errors;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
