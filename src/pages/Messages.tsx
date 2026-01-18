import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Loader2, MessageSquare, Package, ShoppingBag, Store, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatDrawer } from '@/components/ChatDrawer';
import { Button } from '@/components/ui/button';

type FilterType = 'all' | 'buying' | 'selling';

interface Conversation {
    id: number;
    product_id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    unread_count: number;
    product?: {
        id: string;
        title: string;
        price: number;
        image_url: string | null;
    };
    buyer?: {
        full_name: string;
        hostel_name: string;
    };
    seller?: {
        full_name: string;
        hostel_name: string;
    };
    last_message?: {
        content: string;
        created_at: string;
        sender_id: string;
    };
}

export default function Messages() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    // Fetch conversations with unread counts
    const fetchConversations = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const { data: convs, error } = await supabase
                .from('conversations')
                .select('id, product_id, buyer_id, seller_id, created_at')
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

            if (error) throw error;

            const enrichedConvs = await Promise.all(
                (convs || []).map(async (conv) => {
                    const { data: product } = await supabase
                        .from('products')
                        .select('id, title, price, image_url')
                        .eq('id', conv.product_id)
                        .single();

                    const { data: buyer } = await supabase
                        .from('profiles')
                        .select('full_name, hostel_name')
                        .eq('id', conv.buyer_id)
                        .single();

                    const { data: seller } = await supabase
                        .from('profiles')
                        .select('full_name, hostel_name')
                        .eq('id', conv.seller_id)
                        .single();

                    const { data: messages } = await supabase
                        .from('messages')
                        .select('content, created_at, sender_id')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const { count: unreadCount } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('conversation_id', conv.id)
                        .neq('sender_id', user.id)
                        .eq('is_read', false);

                    return {
                        ...conv,
                        product: product || undefined,
                        buyer: buyer || undefined,
                        seller: seller || undefined,
                        last_message: messages?.[0] || undefined,
                        unread_count: unreadCount || 0,
                    };
                })
            );

            const sortedConvs = enrichedConvs.sort((a, b) => {
                const aTime = a.last_message?.created_at || a.created_at;
                const bTime = b.last_message?.created_at || b.created_at;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            });

            setConversations(sortedConvs);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('messages-inbox-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: any) => {
                    const newMessage = payload.new;
                    setConversations((prev) => {
                        const convIndex = prev.findIndex(c => c.id === newMessage.conversation_id);
                        if (convIndex === -1) {
                            fetchConversations();
                            return prev;
                        }
                        const updated = [...prev];
                        const conv = { ...updated[convIndex] };
                        conv.last_message = {
                            content: newMessage.content,
                            created_at: newMessage.created_at,
                            sender_id: newMessage.sender_id,
                        };
                        if (newMessage.sender_id !== user.id) {
                            conv.unread_count = (conv.unread_count || 0) + 1;
                        }
                        updated.splice(convIndex, 1);
                        updated.unshift(conv);
                        return updated;
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages' },
                (payload: any) => {
                    if (payload.new.is_read === true && payload.old?.is_read === false) {
                        fetchConversations();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchConversations]);

    // Filter conversations
    const filteredConversations = conversations.filter((conv) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'buying') return conv.buyer_id === user?.id;
        if (activeFilter === 'selling') return conv.seller_id === user?.id;
        return true;
    });

    const getOtherPartyName = (conv: Conversation) => {
        if (user?.id === conv.seller_id) {
            return conv.buyer?.full_name || 'Buyer';
        }
        return conv.seller?.full_name || 'Seller';
    };

    const handleConversationClick = (conv: Conversation) => {
        setConversations((prev) =>
            prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
        setSelectedConversation(conv);
    };

    // Counts for tabs
    const buyingCount = conversations.filter(c => c.buyer_id === user?.id).length;
    const sellingCount = conversations.filter(c => c.seller_id === user?.id).length;

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-6 max-w-3xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Your negotiations and deals</p>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white dark:bg-[#161B22] rounded-xl p-1.5 mb-6 inline-flex shadow-sm border border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            activeFilter === 'all'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                    >
                        All ({conversations.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('buying')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                            activeFilter === 'buying'
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Buying ({buyingCount})
                    </button>
                    <button
                        onClick={() => setActiveFilter('selling')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                            activeFilter === 'selling'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                    >
                        <Store className="h-4 w-4" />
                        Selling ({sellingCount})
                    </button>
                </div>

                {/* Conversation List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    // Empty States
                    <div className="text-center py-16 bg-white dark:bg-[#161B22] rounded-xl border border-gray-200 dark:border-gray-800">
                        {activeFilter === 'buying' ? (
                            <>
                                <ShoppingBag className="h-16 w-16 text-blue-300 dark:text-blue-800 mx-auto mb-4" />
                                <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">No buying conversations</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                                    You haven't started any negotiations yet. Browse the marketplace to find a deal!
                                </p>
                                <Link to="/">
                                    <Button className="mt-6 bg-blue-500 hover:bg-blue-600">
                                        Browse Items
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </Link>
                            </>
                        ) : activeFilter === 'selling' ? (
                            <>
                                <Store className="h-16 w-16 text-emerald-300 dark:text-emerald-800 mx-auto mb-4" />
                                <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">No selling conversations</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                                    No one has contacted you about your listings yet. Make sure your items are listed!
                                </p>
                                <Link to="/profile/listings">
                                    <Button className="mt-6 bg-emerald-500 hover:bg-emerald-600">
                                        View My Listings
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <MessageSquare className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">No messages yet</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                    Start a conversation by clicking "Chat with Seller" on any product
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredConversations.map((conv) => {
                            const isSeller = user?.id === conv.seller_id;
                            const isLastMessageFromOther = conv.last_message?.sender_id !== user?.id;
                            const hasUnread = conv.unread_count > 0;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => handleConversationClick(conv)}
                                    className={cn(
                                        'bg-white dark:bg-[#161B22] rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer transition-all duration-200',
                                        'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5',
                                        hasUnread && 'ring-2 ring-emerald-500/20 border-emerald-200 dark:border-emerald-800'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Product Thumbnail - Larger */}
                                        <div className="relative w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                            {conv.product?.image_url ? (
                                                <img
                                                    src={conv.product.image_url}
                                                    alt={conv.product.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package className="h-6 w-6 text-slate-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Product Name - Bold Headline */}
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className={cn(
                                                    'text-base text-slate-900 dark:text-white truncate',
                                                    hasUnread ? 'font-bold' : 'font-semibold'
                                                )}>
                                                    {conv.product?.title || 'Unknown Product'}
                                                </h3>
                                                {/* Status Badge */}
                                                <span className={cn(
                                                    'text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                                                    isSeller
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                )}>
                                                    {isSeller ? 'Selling' : 'Buying'}
                                                </span>
                                            </div>

                                            {/* Chat with [Name] */}
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                                Chat with <span className="font-medium text-slate-700 dark:text-slate-300">{getOtherPartyName(conv)}</span>
                                            </p>

                                            {/* Last Message */}
                                            {conv.last_message && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={cn(
                                                        'text-sm truncate flex-1',
                                                        hasUnread && isLastMessageFromOther
                                                            ? 'text-slate-900 dark:text-white font-medium'
                                                            : 'text-slate-500 dark:text-slate-400'
                                                    )}>
                                                        {!isLastMessageFromOther && <span className="text-slate-400">You: </span>}
                                                        {conv.last_message.content}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={cn(
                                                            'text-xs',
                                                            hasUnread ? 'text-emerald-600 font-medium' : 'text-slate-400'
                                                        )}>
                                                            {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                                                        </span>
                                                        {hasUnread && (
                                                            <span className="bg-emerald-500 text-white text-xs font-bold rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                                                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Price */}
                                            {conv.product?.price && (
                                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                                    ₹{conv.product.price.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Chat Drawer */}
            {selectedConversation && (
                <ChatDrawer
                    open={!!selectedConversation}
                    onOpenChange={(open) => !open && setSelectedConversation(null)}
                    productId={selectedConversation.product_id}
                    productTitle={selectedConversation.product?.title || 'Product'}
                    productPrice={selectedConversation.product?.price}
                    sellerId={selectedConversation.seller_id}
                    sellerName={selectedConversation.seller?.full_name || 'Seller'}
                />
            )}
        </div>
    );
}
