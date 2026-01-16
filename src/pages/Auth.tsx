import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, Store, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;
        const cleanPhone = formData.phoneNumber.replace(/[\s-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          throw new Error('Please enter a valid phone number with country code (e.g., +919876543210)');
        }

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
            phone_number: cleanPhone,
          });

          if (profileError) throw profileError;
        }

        setShowSuccessDialog(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setIsLogin(true);
    setFormData({
      email: '',
      password: '',
      fullName: '',
      hostelName: '',
      phoneNumber: '',
    });
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
              className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            />
            {/* Deep overlay ensures branding is readable in both light and dark modes */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/40 to-transparent" />
          </div>

          {/* Branding Content: 'max-w-md' is the key constraint to prevent text bleed */}
          <div className="relative z-10 text-white w-full max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#10B981] mb-8 shadow-xl shadow-emerald-500/20">
              <Store className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Pass it to the <span className="text-[#10B981]">NextBatch.</span>
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
              <h1 className="text-3xl font-bold dark:text-white">NextBatch</h1>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground dark:text-white">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin ? 'Enter your details to access your account' : 'Join the campus marketplace today'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
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
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+919876543210"
                      className="dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email" className="dark:text-gray-200">College Email ID</Label>
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

              <div>
                <Label htmlFor="password" title="Forgot password?" className="dark:text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="dark:bg-gray-900 dark:border-gray-700"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#0D9668] text-white h-12 text-base font-semibold transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>{isLogin ? 'Sign In' : 'Create Account'}</>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-semibold text-[#10B981] hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
              onClick={handleSuccessDialogClose}
              className="w-full py-6 text-lg font-semibold bg-[#10B981] hover:bg-[#0D9668] text-white"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Got it, Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
