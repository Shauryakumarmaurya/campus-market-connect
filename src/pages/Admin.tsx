import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Trash2, Package, ShieldAlert, AlertTriangle, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatRupee } from '@/lib/formatRupee';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
    category: string;
    image_url: string | null;
    status: string | null;
    created_at: string | null;
    report_count: number;
    seller_id: string;
    seller?: {
        full_name: string | null;
        email: string | null;
    };
}

export default function Admin() {
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [showReportedFirst, setShowReportedFirst] = useState(false);

    // Redirect non-admins
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                navigate('/auth');
                return;
            }
            if (profile && !profile.is_admin) {
                toast.error('Unauthorized', {
                    description: 'You do not have permission to access the admin area.',
                });
                navigate('/');
            }
        }
    }, [user, profile, authLoading, navigate]);

    const { data: products, isLoading } = useQuery({
        queryKey: ['admin-products', showReportedFirst],
        queryFn: async () => {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    seller:profiles!products_seller_id_fkey(full_name, email)
                `)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;

            let sortedData = data as Product[];

            // Sort by report_count if filter is enabled
            if (showReportedFirst) {
                sortedData = sortedData.sort((a, b) => (b.report_count || 0) - (a.report_count || 0));
            }

            return sortedData;
        },
        enabled: !!user && !!profile?.is_admin,
    });

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm("Are you sure you want to permanently ban this item?")) return;

        try {
            // 1. First get all conversation IDs for this product
            const { data: conversations } = await supabase
                .from('conversations')
                .select('id')
                .eq('product_id', productId);

            // 2. Delete all messages for these conversations (FK constraint!)
            if (conversations && conversations.length > 0) {
                const conversationIds = conversations.map(c => c.id);
                try {
                    await supabase.from('messages').delete().in('conversation_id', conversationIds);
                } catch (e) {
                    console.warn('Messages cleanup:', e);
                }
            }

            // 3. Delete Conversations
            try {
                await supabase.from('conversations').delete().eq('product_id', productId);
            } catch (e) {
                console.warn('Conversations cleanup:', e);
            }

            // 4. Delete Market Orders
            try {
                await supabase.from('market_orders').delete().eq('product_id', productId);
            } catch (e) {
                console.warn('Market orders cleanup:', e);
            }

            // 5. Delete Saved/Wishlist Items
            try {
                await supabase.from('saved_items').delete().eq('product_id', productId);
            } catch (e) {
                console.warn('Saved items cleanup:', e);
            }

            // 6. NOW delete the Product
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            toast.success("Item banned and removed successfully");

            // Refresh the list immediately
            window.location.reload();

        } catch (error: any) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete: " + error.message);
        }
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    // Don't render anything if not admin (will redirect)
    if (!user || !profile?.is_admin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const getStatusBadge = (status: string | null) => {
        const statusMap: Record<string, { bg: string; text: string; label: string }> = {
            available: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Available' },
            sold: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Sold' },
            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Pending' },
        };
        const config = statusMap[status || 'available'] || statusMap.available;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and moderate all products</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-white dark:bg-[#161B22] px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <Label htmlFor="reported-filter" className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                            Show Reported First
                        </Label>
                        <Switch
                            id="reported-filter"
                            checked={showReportedFirst}
                            onCheckedChange={setShowReportedFirst}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : products && products.length > 0 ? (
                    <div className="bg-white dark:bg-[#161B22] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-[#0d1117] hover:bg-slate-50 dark:hover:bg-[#0d1117]">
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Seller</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Reports</TableHead>
                                    <TableHead className="text-right w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow
                                        key={product.id}
                                        className={product.report_count > 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}
                                    >
                                        <TableCell>
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="w-14 h-14 object-cover rounded-lg bg-gray-100 dark:bg-[#0d1117] border border-gray-100 dark:border-gray-800"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 bg-gray-100 dark:bg-[#0d1117] rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-800">
                                                    <Package className="h-6 w-6 text-gray-300" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-900 dark:text-white line-clamp-1">
                                                    {product.title}
                                                </span>
                                                {product.report_count > 0 && (
                                                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {product.seller?.full_name || product.seller?.email || 'Unknown'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-600">
                                            {formatRupee(product.price)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(product.status)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {product.report_count > 0 ? (
                                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                                                    {product.report_count}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="h-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-[#161B22] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No products found</h3>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">There are no products in the database.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
