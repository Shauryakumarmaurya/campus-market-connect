import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: number;
    content: string;
    sender_id: string;
    created_at: string;
}

interface ChatDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string;
    productTitle: string;
    productPrice?: number;
    sellerId: string;
    sellerName: string;
}

export function ChatDrawer({
    open,
    onOpenChange,
    productId,
    productTitle,
    productPrice,
    sellerId,
    sellerName,
}: ChatDrawerProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [showSafetyTip, setShowSafetyTip] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Find or create conversation when drawer opens
    useEffect(() => {
        if (!open || !user || !productId) return;

        const findOrCreateConversation = async () => {
            setIsLoading(true);
            setConversationId(null);
            setMessages([]);

            try {
                // Determine if current user is buyer or seller
                const isSeller = user.id === sellerId;
                let existingConv = null;

                if (isSeller) {
                    // Seller: find any conversation for this product where they are seller
                    const { data, error } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('product_id', productId)
                        .eq('seller_id', user.id)
                        .limit(1)
                        .maybeSingle();

                    if (error) throw error;
                    existingConv = data;
                } else {
                    // Buyer: find their specific conversation for this product
                    const { data, error } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('product_id', productId)
                        .eq('buyer_id', user.id)
                        .eq('seller_id', sellerId)
                        .limit(1)
                        .maybeSingle();

                    if (error) throw error;
                    existingConv = data;
                }

                if (existingConv) {
                    // Found existing conversation
                    setConversationId(existingConv.id);
                } else if (!isSeller) {
                    // No conversation exists - create one (only buyers can create)
                    // Use upsert with onConflict to handle race conditions
                    const { data: newConv, error: createError } = await supabase
                        .from('conversations')
                        .upsert(
                            {
                                product_id: productId,
                                buyer_id: user.id,
                                seller_id: sellerId,
                            },
                            { onConflict: 'product_id,buyer_id,seller_id' }
                        )
                        .select('id')
                        .maybeSingle();

                    if (createError) throw createError;

                    if (newConv) {
                        setConversationId(newConv.id);
                    } else {
                        throw new Error('Failed to create conversation');
                    }
                } else {
                    // Seller opened chat but no conversations exist yet
                    toast.info('No conversations yet for this product');
                }
            } catch (error: any) {
                console.error('Error finding/creating conversation:', error);
                toast.error('Failed to load chat: ' + (error.message || 'Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };

        findOrCreateConversation();
    }, [open, user, productId, sellerId]);

    // Load messages and subscribe to realtime updates
    useEffect(() => {
        if (!conversationId || !user) return;

        const loadMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('id, content, sender_id, created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading messages:', error);
                return;
            }

            setMessages(data || []);

            // Mark unread messages as read (messages not from me)
            const unreadIds = (data || [])
                .filter((msg: any) => msg.sender_id !== user.id)
                .map((msg: any) => msg.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds)
                    .eq('is_read', false);
            }
        };

        loadMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);

                    // If message is from other user, mark as read immediately
                    if (payload.new.sender_id !== user.id) {
                        await supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', payload.new.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, user]);

    // Focus input when drawer opens
    useEffect(() => {
        if (open && !isLoading) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId || !user) return;

        setIsSending(true);
        try {
            const { error } = await supabase.from('messages').insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: newMessage.trim(),
                is_read: false,
            });

            if (error) throw error;
            setNewMessage('');
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const getOtherPartyName = () => {
        if (user?.id === sellerId) {
            return 'Buyer';
        }
        return sellerName;
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0B0F1A] border-l dark:border-gray-800 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-[#0B0F1A]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                    {getOtherPartyName().charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{getOtherPartyName()}</h3>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    {/* Product Context Bar */}
                    <div className="bg-slate-50 dark:bg-gray-800/50 rounded-lg p-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chatting about:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {productTitle}
                                {productPrice && <span className="text-emerald-600 dark:text-emerald-400 ml-1">- ₹{productPrice.toLocaleString()}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Safety Tip */}
                {showSafetyTip && (
                    <div className="mx-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-start gap-2.5">
                            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
                                <span className="font-medium">Tip:</span> Keep the conversation here for safety. When you're ready to meet, you can exchange WhatsApp numbers.
                            </p>
                            <button
                                onClick={() => setShowSafetyTip(false)}
                                className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors flex-shrink-0"
                            >
                                <X className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0B0F1A]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageCircle className="h-12 w-12 text-slate-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                Send a message to start the conversation
                            </p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const isOwnMessage = message.sender_id === user?.id;
                            return (
                                <div
                                    key={message.id}
                                    className={cn(
                                        'flex',
                                        isOwnMessage ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                                            isOwnMessage
                                                ? 'bg-emerald-600 text-white rounded-br-md'
                                                : 'bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-slate-100 dark:border-gray-700'
                                        )}
                                    >
                                        <p className="text-sm leading-relaxed break-words">
                                            {message.content}
                                        </p>
                                        <p
                                            className={cn(
                                                'text-[10px] mt-1',
                                                isOwnMessage ? 'text-emerald-200' : 'text-gray-400 dark:text-gray-500'
                                            )}
                                        >
                                            {formatDistanceToNow(new Date(message.created_at), {
                                                addSuffix: true,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0B0F1A]"
                >
                    <div className="flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={isSending || isLoading || !conversationId}
                            className="flex-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <Button
                            type="submit"
                            disabled={!newMessage.trim() || isSending || isLoading || !conversationId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
