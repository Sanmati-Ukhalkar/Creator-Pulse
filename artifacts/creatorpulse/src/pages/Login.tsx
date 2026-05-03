import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .refine((v) => EMAIL_REGEX.test(v), { message: 'Email must include @ and a domain (e.g. name@example.com)' }),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full max-w-[400px] px-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-md border border-border">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your CreatorPulse account</p>
            </div>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-4 bg-destructive/5 border border-destructive/30 text-destructive rounded-lg px-4 py-2.5 text-sm font-medium"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-lg px-4 py-2.5 text-sm font-medium"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  role="status"
                  aria-live="polite"
                >
                  Login successful! Redirecting…
                </motion.div>
              )}
            </AnimatePresence>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="email"
                          {...field}
                          className="focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                          aria-label="Email address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            {...field}
                            className="focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200 pr-10"
                            aria-label="Password"
                          />
                          <button
                            type="button"
                            tabIndex={0}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={!form.formState.isValid || loading}
                  aria-disabled={!form.formState.isValid || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-colors focus:underline focus:outline-none"
                tabIndex={0}
              >
                Forgot password?
              </a>
            </div>

            <div className="mt-6 pt-5 border-t border-border text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium focus:underline focus:outline-none">
                Sign up
              </Link>
            </div>

            <div className="mt-4 flex flex-col items-center space-y-1 text-xs text-muted-foreground">
              <a href="#" className="hover:underline focus:underline focus:outline-none">Terms of Service</a>
              <a href="#" className="hover:underline focus:underline focus:outline-none">Privacy Policy</a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
