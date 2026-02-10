import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'; // Ensure we import DialogDescription
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileCompletionModal() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        hostelName: '',
        phoneNumber: '',
    });

    // Check if profile is incomplete
    useEffect(() => {
        if (authLoading) return;

        if (user) {
            // Check if critical fields are missing
            // If profile is null, it's incomplete. If profile exists, check fields.
            const isIncomplete = !profile || !profile.full_name || !profile.hostel_name || !profile.phone_number;
            setIsOpen(isIncomplete);

            // Pre-fill existing data if any (e.g. they might have name but no hostel)
            if (profile) {
                setFormData(prev => ({
                    fullName: profile.full_name || prev.fullName,
                    hostelName: profile.hostel_name || prev.hostelName,
                    phoneNumber: profile.phone_number ? profile.phone_number.replace('+91', '') : prev.phoneNumber,
                }));
            }
        } else {
            setIsOpen(false);
        }
    }, [user, profile, authLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            // Validation
            if (!formData.fullName.trim() || !formData.hostelName.trim() || !formData.phoneNumber.trim()) {
                throw new Error('Please fill in all fields');
            }

            const phoneRegex = /^[6-9]\d{9}$/;
            const cleanPhone = formData.phoneNumber.replace(/[\s-]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Please enter a valid 10-digit Indian phone number (starting with 6-9)');
            }

            const fullPhoneNumber = `+91${cleanPhone}`;

            // Update profile in Supabase
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: formData.fullName.trim(),
                    hostel_name: formData.hostelName.trim(),
                    phone_number: fullPhoneNumber,
                });

            if (error) throw error;

            toast.success('Profile updated successfully!');

            // Refresh profile in context to close modal
            await refreshProfile();
            setIsOpen(false);

        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            {/* Configure DialogContent to prevent closing */}
            <DialogContent
                className="sm:max-w-md dark:bg-[#161B22] dark:border-gray-800 [&>button]:hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold dark:text-white">Complete Your Profile</DialogTitle>
                    <DialogDescription className="text-base mt-2 dark:text-gray-400">
                        Please provide a few details to finish setting up your account. These help us verify student identity.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="dark:text-gray-200">WhatsApp Number</Label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium z-10 text-sm">
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
                                className="pl-12 dark:bg-gray-900 dark:border-gray-700"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-[#10B981] hover:bg-[#0D9668] text-white h-11 text-base font-semibold transition-all mt-2"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save & Continue'
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
