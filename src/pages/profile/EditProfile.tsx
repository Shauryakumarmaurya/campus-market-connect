import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function EditProfile() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        hostel_name: '',
        phone_number: '',
    });

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                hostel_name: profile.hostel_name || '',
                phone_number: profile.phone_number || '',
            });
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            // Validate phone number
            const phoneRegex = /^\+?[1-9]\d{9,14}$/;
            const cleanPhone = formData.phone_number.replace(/[\s-]/g, '');
            if (cleanPhone && !phoneRegex.test(cleanPhone)) {
                throw new Error('Please enter a valid phone number with country code');
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name.trim(),
                    hostel_name: formData.hostel_name.trim(),
                    phone_number: cleanPhone,
                })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-6">
                <div className="max-w-md mx-auto">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
                        <p className="text-muted-foreground mt-1">Update your personal information</p>
                    </div>

                    <div className="bg-card rounded-xl shadow-card p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile?.email || user.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Email cannot be changed
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <Label htmlFor="hostel_name">Hostel Name</Label>
                                <Input
                                    id="hostel_name"
                                    value={formData.hostel_name}
                                    onChange={(e) => setFormData({ ...formData, hostel_name: e.target.value })}
                                    placeholder="Hostel A"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone_number">WhatsApp Number</Label>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="+919876543210"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Include country code for WhatsApp integration
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
