'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  validateEmail,
  isPasswordValid,
  getPasswordErrors,
} from '@/lib/utils/password-validation';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedFields {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Real-time validation
  const errors = useMemo((): FormErrors => {
    const errs: FormErrors = {};

    if (touched.email && email) {
      if (!validateEmail(email)) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (touched.password && password) {
      if (!isPasswordValid(password)) {
        const passwordErrors = getPasswordErrors(password);
        errs.password = `Missing: ${passwordErrors.join(', ')}`;
      }
    }

    if (touched.confirmPassword && confirmPassword) {
      if (password !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
    }

    return errs;
  }, [email, password, confirmPassword, touched]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    return (
      email &&
      validateEmail(email) &&
      isPasswordValid(password) &&
      password === confirmPassword
    );
  }, [email, password, confirmPassword]);

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Mark all fields as touched to show any remaining errors
    setTouched({ email: true, password: true, confirmPassword: true });

    if (!isFormValid) {
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverError && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {serverError}
              </div>
            )}

            <FormField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              error={errors.email}
              success={touched.email && !errors.email && !!email}
              required
              autoComplete="email"
            />

            <div className="space-y-2">
              <FormField
                label="Password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                error={touched.password && errors.password ? errors.password : undefined}
                success={touched.password && !errors.password && isPasswordValid(password)}
                required
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <FormField
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={errors.confirmPassword}
              success={
                touched.confirmPassword &&
                !errors.confirmPassword &&
                !!confirmPassword &&
                password === confirmPassword
              }
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
