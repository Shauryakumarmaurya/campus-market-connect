import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Store, CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isValidSession, setIsValidSession] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        // The password recovery link includes a hash fragment with access_token
        // Supabase automatically processes this when we set up the auth listener

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event, 'Session:', !!session);

            if (event === 'PASSWORD_RECOVERY') {
                // User clicked the recovery link - they can now update their password
                setIsValidSession(true);
                setIsCheckingSession(false);
            } else if (event === 'SIGNED_IN' && session) {
                // Check if this is from a recovery flow by looking at the URL hash
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const type = hashParams.get('type');

                if (type === 'recovery') {
                    setIsValidSession(true);
                    setIsCheckingSession(false);
                } else {
                    // Regular sign in, allow password update if they have a session
                    setIsValidSession(true);
                    setIsCheckingSession(false);
                }
            } else if (event === 'TOKEN_REFRESHED' && session) {
                // Token was refreshed, user is still valid
                setIsValidSession(true);
                setIsCheckingSession(false);
            }
        });

        // Also check the URL hash for recovery tokens that Supabase hasn't processed yet
        const checkHashAndSession = async () => {
            // Give Supabase a moment to process the hash fragment
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // User has a valid session (either from recovery link or existing)
                setIsValidSession(true);
            }

            setIsCheckingSession(false);
        };

        checkHashAndSession();

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast.success('Password updated successfully!');

            // Sign out to clear the recovery session
            await supabase.auth.signOut();

            navigate('/auth');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B0F1A]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#10B981] mx-auto mb-4" />
                    <p className="text-muted-foreground">Verifying your reset link...</p>
                </div>
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="min-h-screen flex flex-col lg:flex-row w-full bg-white dark:bg-[#0B0F1A] overflow-hidden">
                {/* Left Half: Branding */}
                <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-16 overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 z-0">
                        <img
                            src="/iitd-campus.png"
                            alt="IIT Delhi Campus"
                            className="w-full h-full object-cover opacity-100 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/40 to-transparent" />
                    </div>

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
                    </div>
                </div>

                {/* Right Half: Invalid Link Message */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-[#0B0F1A] z-20 relative flex-shrink-0">
                    <div className="w-full max-w-md text-center">
                        <div className="text-center mb-10 lg:hidden">
                            <Store className="h-12 w-12 text-[#10B981] mx-auto mb-4" />
                            <h1 className="text-3xl font-bold dark:text-white">NextBatch</h1>
                        </div>

                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <KeyRound className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-4">Invalid or Expired Link</h2>
                        <p className="text-muted-foreground mb-8">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Button
                            onClick={() => navigate('/auth')}
                            className="bg-[#10B981] hover:bg-[#0D9668] text-white"
                        >
                            Back to Login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row w-full bg-white dark:bg-[#0B0F1A] overflow-hidden">
            {/* Left Half: Branding & IITD Campus Image (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-16 overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/iitd-campus.png"
                        alt="IIT Delhi Campus"
                        className="w-full h-full object-cover opacity-100 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] via-[#0B0F1A]/40 to-transparent" />
                </div>

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

            {/* Right Half: Reset Password Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-[#0B0F1A] z-20 relative flex-shrink-0">
                <div className="w-full max-w-md">
                    {/* Mobile Branding */}
                    <div className="text-center mb-10 lg:hidden">
                        <Store className="h-12 w-12 text-[#10B981] mx-auto mb-4" />
                        <h1 className="text-3xl font-bold dark:text-white">NextBatch</h1>
                    </div>

                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 lg:mx-0">
                        <KeyRound className="h-8 w-8 text-[#10B981]" />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-foreground dark:text-white">
                            Set new password
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            Enter your new password below
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <Label htmlFor="password" className="dark:text-gray-200">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="dark:bg-gray-900 dark:border-gray-700"
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword" className="dark:text-gray-200">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="dark:bg-gray-900 dark:border-gray-700"
                                required
                                minLength={6}
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
                                    Updating password...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Update Password
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

