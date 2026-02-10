import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import GoogleSignIn from '@/components/GoogleSignIn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Store, Mail, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showResetEmailSentDialog, setShowResetEmailSentDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    hostelName: '',
    phoneNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/', { replace: true });
      } else if (mode === 'signup') {
        // Validate IITD email domain
        const emailDomain = formData.email.split('@')[1]?.toLowerCase();
        if (emailDomain !== 'iitd.ac.in') {
          throw new Error('Only IIT Delhi email addresses (@iitd.ac.in) are allowed');
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        const cleanPhone = formData.phoneNumber.replace(/[\s-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          throw new Error('Please enter a valid 10-digit Indian phone number starting with 6-9');
        }

        const fullPhoneNumber = `+91${cleanPhone}`;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: formData.email.trim(),
            full_name: formData.fullName.trim(),
            hostel_name: formData.hostelName.trim(),
            phone_number: fullPhoneNumber,
          });

          if (profileError) throw profileError;
        }

        setShowSuccessDialog(true);
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setShowResetEmailSentDialog(true);
      }
    } catch (error: any) {
      // Handle unverified duplicate signup gracefully
      const errorMessage = error.message?.toLowerCase() || '';
      if (mode === 'signup' && (errorMessage.includes('user already registered') || errorMessage.includes('duplicate'))) {
        // Resend verification email instead of showing error
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: formData.email,
          });
          toast.success('Account already exists! We have sent a new verification link to your email.');
          setShowSuccessDialog(true);
        } catch (resendError) {
          toast.error('Unable to resend verification email. Please try again later.');
        }
      } else {
        toast.error(error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setMode('login');
    setFormData({
      email: '',
      password: '',
      fullName: '',
      hostelName: '',
      phoneNumber: '',
    });
  };

  const handleResetEmailDialogClose = () => {
    setShowResetEmailSentDialog(false);
    setMode('login');
    setFormData({ ...formData, email: '' });
  };

  const getHeading = () => {
    switch (mode) {
      case 'login':
        return 'Welcome back';
      case 'signup':
        return 'Create account';
      case 'forgot-password':
        return 'Reset password';
    }
  };

  const getSubheading = () => {
    switch (mode) {
      case 'login':
        return 'Enter your details to access your account';
      case 'signup':
        return 'Join the campus marketplace today';
      case 'forgot-password':
        return "Enter your email and we'll send you a reset link";
    }
  };

  return (
    <>
      {/* Root Container: Force rigid flex layout and prevent horizontal overflow */}
      <div className="min-h-screen flex flex-col lg:flex-row w-full bg-white dark:bg-[#0B0F1A] overflow-hidden">

        {/* Left Half: Branding & IITD Campus Image (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-16 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 z-0">
            <img
              src="/iitd-campus.png"
              alt="IIT Delhi Campus"
              className="w-full h-full object-cover opacity-100 mix-blend-overlay"
            />
            {/* Deep overlay ensures branding is readable in both light and dark modes */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[rgba(11,15,26,0.4)] to-transparent" />
          </div>

          {/* Branding Content: 'max-w-md' is the key constraint to prevent text bleed */}
          <div className="relative z-10 text-white w-full max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#10B981] mb-8 shadow-xl shadow-emerald-500/20">
              <Store className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Pass it to the <span className="text-[#10B981]">IITD.Store.</span>
            </h1>
            <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-sm">
              The trusted marketplace for IIT Delhi students. Buy, sell, and connect safely on campus.
            </p>

            <div className="mt-12 flex items-center gap-4 text-sm text-slate-400">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700" />
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-600" />
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-500" />
              </div>
              <span>Join 1,000+ students on campus</span>
            </div>
          </div>
        </div>

        {/* Right Half: Login Form Container serving as a "Visual Wall" */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-[#0B0F1A] z-20 relative flex-shrink-0">
          <div className="w-full max-w-md">
            {/* Mobile Branding (Only visible when Left Half is hidden) */}
            <div className="text-center mb-10 lg:hidden">
              <Store className="h-12 w-12 text-[#10B981] mx-auto mb-4" />
              <h1 className="text-3xl font-bold dark:text-white">IITD.Store</h1>
            </div>

            {/* Back button for forgot password */}
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#10B981] mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            )}

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground dark:text-white">
                {getHeading()}
              </h2>
              <p className="text-muted-foreground mt-2">
                {getSubheading()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <>
                  <div>
                    <Label htmlFor="fullName" className="dark:text-gray-200">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="hostelName" className="dark:text-gray-200">Hostel Name</Label>
                    <Input
                      id="hostelName"
                      value={formData.hostelName}
                      onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                      placeholder="Hostel A"
                      className="dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="dark:text-gray-200">WhatsApp Number</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium z-10">
                        +91
                      </div>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, phoneNumber: value });
                        }}
                        placeholder="9876543210"
                        className="dark:bg-gray-900 dark:border-gray-700 pl-12"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email" className="dark:text-gray-200">
                  {mode === 'forgot-password' ? 'Email Address' : 'College Email ID'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kerberos@iitd.ac.in"
                  className="dark:bg-gray-900 dark:border-gray-700"
                  required
                />
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="dark:text-gray-200">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-sm text-[#10B981] hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="dark:bg-gray-900 dark:border-gray-700 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#0D9668] text-white h-12 text-base font-semibold transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending link...'}
                  </>
                ) : (
                  <>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</>
                )}
              </Button>
            </form>

            {mode !== 'forgot-password' && (
              <>
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-[#0B0F1A] text-gray-500">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <GoogleSignIn />

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-sm font-semibold text-[#10B981] hover:underline"
                  >
                    {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Signup Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md dark:bg-[#161B22] dark:border-gray-800" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="h-8 w-8 text-[#10B981]" />
            </div>
            <DialogTitle className="text-2xl font-bold dark:text-white">Check your Inbox</DialogTitle>
            <DialogDescription className="text-base mt-2 dark:text-gray-400">
              We have sent a verification link to your email. You must verify your account before logging in.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button
              onClick={() => window.open('https://webmail.iitd.ac.in/', '_blank')}
              className="w-full py-6 text-lg font-semibold bg-[#10B981] hover:bg-[#0D9668] text-white"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Got it, Go to Webmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Email Sent Dialog */}
      <Dialog open={showResetEmailSentDialog} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md dark:bg-[#161B22] dark:border-gray-800" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="h-8 w-8 text-[#10B981]" />
            </div>
            <DialogTitle className="text-2xl font-bold dark:text-white">Check your Inbox</DialogTitle>
            <DialogDescription className="text-base mt-2 dark:text-gray-400">
              We have sent a password reset link to your email. Click the link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button
              onClick={() => window.open('https://webmail.iitd.ac.in/', '_blank')}
              className="w-full py-6 text-lg font-semibold bg-[#10B981] hover:bg-[#0D9668] text-white"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Got it, Go to Webmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

