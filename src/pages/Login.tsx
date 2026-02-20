import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
// import { supabase } from '@/integrations/supabase/client';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { user } = response.data;
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard'); // Redirect to dashboard
      }, 1000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    navigate('/dashboard'); // Guest flow: redirect to dashboard
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] relative">
      <AnimatedBackground />
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="w-full max-w-[400px] z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-800/30 shadow-2xl relative">
          <CardContent className="p-0">
            {/* Logo with animated glow */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                className="mb-2"
                initial={{ filter: 'drop-shadow(0 0 0 #00D4FF)' }}
                animate={{ filter: 'drop-shadow(0 0 16px #00D4FF)' }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
              >
                {/* Placeholder SVG Logo */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="22" stroke="#00D4FF" strokeWidth="4" fill="#111111" />
                  <path d="M16 32L24 16L32 32" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="24" cy="28" r="2.5" fill="#10B981" />
                </svg>
              </motion.div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Welcome to CreatorPulse</h1>
              <p className="text-sm text-gray-400">Sign in to your creator dashboard</p>
            </div>
            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-4 bg-[#1A1A1A] border border-[#EF4444] text-[#EF4444] rounded-lg px-4 py-2 text-sm font-medium"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
                  className="mb-4 bg-[#1A1A1A] border border-[#10B981] text-[#10B981] rounded-lg px-4 py-2 text-sm font-medium"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  role="status"
                  aria-live="polite"
                >
                  Login successful! Redirecting…
                </motion.div>
              )}
            </AnimatePresence>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="on">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          autoComplete="email"
                          {...field}
                          className="focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 bg-[#111111]/80 border-[#27272A] text-white placeholder:text-gray-500"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            {...field}
                            className="focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 bg-[#111111]/80 border-[#27272A] text-white placeholder:text-gray-500 pr-10"
                            aria-label="Password"
                          />
                          <button
                            type="button"
                            tabIndex={0}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 focus:outline-none"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold py-3 rounded-xl shadow-lg hover:scale-[1.02] hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={!form.formState.isValid || loading}
                  aria-disabled={!form.formState.isValid || loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Login'}
                </Button>
              </form>
            </Form>
            <div className="flex flex-col items-center mt-4 space-y-2">
              <button
                onClick={handleGuest}
                className="text-cyan-400 hover:underline text-sm font-medium focus:outline-none"
                tabIndex={0}
              >
                Continue as Guest
              </button>
              <a
                href="#"
                className="text-gray-400 hover:text-cyan-400 text-xs mt-2 focus:underline focus:outline-none"
                tabIndex={0}
              >
                Forgot password?
              </a>
            </div>
            <div className="mt-6 text-center text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-violet-400 hover:underline font-medium focus:underline focus:outline-none">Sign up</Link>
            </div>
            <div className="mt-4 flex flex-col items-center space-y-1 text-xs text-gray-500">
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