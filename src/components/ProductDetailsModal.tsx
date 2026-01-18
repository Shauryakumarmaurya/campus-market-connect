import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, MessageCircle, X, ShoppingCart, Check, Loader2, Pencil, Heart, Flag, CheckCircle2, PhoneOff, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatRupee } from '@/lib/formatRupee';
import { ChatDrawer } from './ChatDrawer';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  seller_id: string;
  profiles?: {
    full_name: string;
    hostel_name: string;
    phone_number: string;
  };
}

interface ProductDetailsModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryColors: Record<string, string> = {
  'Books': 'bg-category-books',
  'Electronics': 'bg-category-electronics',
  'Lab Coat': 'bg-category-labcoat',
  'Cycle': 'bg-category-cycle',
};

export function ProductDetailsModal({ product, open, onOpenChange }: ProductDetailsModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  // Helper to get saved items from localStorage
  const getSavedItems = (): string[] => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('savedItems');
    return saved ? JSON.parse(saved) : [];
  };

  // Check if product is in wishlist when modal opens
  useEffect(() => {
    if (!product || !open) return;
    const savedItems = getSavedItems();
    setIsSaved(savedItems.includes(product.id));
  }, [product?.id, open]);

  // Check if user already reported this product
  useEffect(() => {
    const checkReportStatus = async () => {
      if (!product || !open || !user) {
        setHasReported(false);
        return;
      }

      const { data } = await supabase
        .from('products')
        .select('reported_by')
        .eq('id', product.id)
        .single();

      const reportedBy: string[] = data?.reported_by || [];
      setHasReported(reportedBy.includes(user.id));
    };

    checkReportStatus();
  }, [product?.id, user?.id, open]);

  const handleWishlistToggle = () => {
    if (!user) {
      toast.error("Please login to save items");
      onOpenChange(false);
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (!product) return;
    const savedItems = getSavedItems();

    if (isSaved) {
      const newItems = savedItems.filter((id) => id !== product.id);
      localStorage.setItem('savedItems', JSON.stringify(newItems));
      setIsSaved(false);
      console.log('Removed from wishlist:', product.id);
    } else {
      localStorage.setItem('savedItems', JSON.stringify([...savedItems, product.id]));
      setIsSaved(true);
      console.log('Added to wishlist:', product.id);
    }
  };

  // Check if product is in cart when modal opens
  useEffect(() => {
    const checkCartStatus = async () => {
      if (!product || !user || !open) return;

      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('saved_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .maybeSingle();

        if (!error) {
          setIsInCart(!!data);
        }
      } catch (error) {
        console.error('Error checking cart status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkCartStatus();
  }, [product?.id, user?.id, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsInCart(false);
      setIsLoading(false);
      setIsChecking(false);
      setShowReportModal(false);
      setReportReason("");
      setOtherReason("");
    }
  }, [open]);

  if (!product) return null;

  const handleChatClick = () => {
    if (!user) {
      toast.error("Please login with your Kerberos ID to contact sellers.");
      onOpenChange(false);
      navigate('/auth', { state: { from: window.location.pathname } });
      return;
    }
    // Close the modal first, then open chat
    onOpenChange(false);
    setChatDrawerOpen(true);
  };

  const handleCartToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save items');
      onOpenChange(false);
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsLoading(true);

    try {
      if (isInCart) {
        // Remove from cart
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;

        setIsInCart(false);
        toast.success('Removed from your cart');
      } else {
        // Add to cart
        const { error } = await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
          });

        if (error) throw error;

        setIsInCart(true);
        toast.success('Added to your cart');
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnProduct = user?.id === product.seller_id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-white dark:bg-[#0B0F1A] rounded-lg border-0">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/90 shadow-md p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>

          <div className="flex flex-col md:grid md:grid-cols-2 h-full max-h-[90vh]">

            {/* Left Column: Image Area */}
            <div className="relative w-full h-[40vh] md:h-full bg-slate-50 flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <span className="text-4xl">📦</span>
                  <span className="text-sm mt-2">No Image</span>
                </div>
              )}

              {/* Report Flag Button (Floating Top-Left) */}
              <div className="absolute top-4 left-4 z-40">
                <button
                  onClick={(e) => {
                    if (!user) {
                      e.stopPropagation();
                      e.preventDefault();
                      toast.error("Please login to report items");
                      onOpenChange(false);
                      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
                      return;
                    }
                    if (!product) return;
                    if (hasReported) {
                      toast.error('You have already reported this item.');
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  disabled={isReporting || hasReported}
                  className={cn(
                    "bg-white p-2.5 rounded-full shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center",
                    hasReported ? "opacity-100 cursor-not-allowed" : "hover:text-red-600"
                  )}
                  title={hasReported ? "You have already reported this item" : "Report this item"}
                >
                  <Flag className={cn("h-5 w-5", hasReported ? "text-orange-500 fill-orange-500" : "text-gray-400")} />
                </button>
              </div>

              {/* Wishlist Heart Button (Floating Top-Right, Next to Close) */}
              <div className="absolute top-4 right-16 z-40 md:right-4 md:mr-12">
                <button
                  onClick={handleWishlistToggle}
                  className="bg-white p-2.5 rounded-full shadow-md hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-colors duration-200',
                      isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-400'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Right Column: Details Area */}
            <div className="flex flex-col h-full bg-white overflow-y-auto">
              <div className="p-6 md:p-8 flex flex-col gap-6 h-full">

                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium text-white shrink-0 uppercase tracking-wide',
                      categoryColors[product.category] || 'bg-slate-500'
                    )}>
                      {product.category}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    {product.title}
                  </h2>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-green-600">{formatRupee(product.price)}</p>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed text-base">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Seller Info */}
                {product.profiles && (
                  <div className="flex items-center gap-4 py-4 border-t border-b border-slate-100">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-bold">
                      {product.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 text-lg">
                        {product.profiles.full_name || 'Unknown Seller'}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{product.profiles.hostel_name || 'Hostel Not Listed'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Spacer to push buttons to bottom on large screens */}
                <div className="flex-1 min-h-[20px]"></div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mt-auto">
                  {isOwnProduct ? (
                    <Button
                      onClick={() => {
                        onOpenChange(false);
                        window.location.href = '/profile/listings';
                      }}
                      className="w-full py-6 text-lg font-semibold bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      <Pencil className="h-5 w-5 mr-2" />
                      Manage Listing
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-3 w-full">
                      {/* Primary Action: Chat with Seller */}
                      <div className="relative">
                        {/* Pulsing glow effect behind button */}
                        <div className="absolute -inset-0.5 bg-emerald-500 rounded-lg blur opacity-30 animate-pulse"></div>

                        <Button
                          onClick={handleChatClick}
                          className="relative w-full bg-emerald-600 hover:bg-emerald-700 text-white py-8 text-lg font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                          <MessageCircle className="h-6 w-6 mr-3 stroke-[2.5]" />
                          <div className="flex flex-col items-start">
                            <span className="leading-none mb-1">Chat with Seller</span>
                            <span className="text-[10px] font-medium opacity-90 tracking-wide uppercase">Secure in-app messaging</span>
                          </div>
                        </Button>
                      </div>

                      {/* Secondary Action: Cart */}
                      <Button
                        onClick={handleCartToggle}
                        variant="outline"
                        className={cn(
                          "w-full py-6 text-base font-semibold border-2 transition-all",
                          isInCart
                            ? "bg-slate-900 text-white hover:bg-slate-800 border-transparent"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        disabled={isLoading || isChecking}
                      >
                        {isLoading || isChecking ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : isInCart ? (
                          <Check className="h-5 w-5 mr-2" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 mr-2" />
                        )}
                        {isChecking ? 'Checking...' : isInCart ? 'Saved to Cart' : 'Add to Cart'}
                      </Button>

                      {/* Quick Tip */}
                      <div className="flex items-start gap-2 mt-2 px-1">
                        <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <span className="font-medium text-slate-500">Tip:</span> Chat directly with the seller to negotiate and finalize the deal securely.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-lg bg-white p-0 gap-0 overflow-hidden border-0 rounded-2xl shadow-2xl">

          {/* Header Section */}
          <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Report this Item
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Help keep our campus community safe and reliable.
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary Context */}
            {product && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                <div className="h-10 w-10 bg-slate-100 rounded-md overflow-hidden shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Flag className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 line-clamp-1">{product.title}</p>
                  <p className="text-xs text-slate-500">Listed by {product.profiles?.full_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Options Section */}
          <div className="p-6 space-y-3">
            {[
              { id: 'sold', label: 'Item is already sold', icon: CheckCircle2, color: 'text-emerald-500' },
              { id: 'wrong_contact', label: 'Wrong Number / Seller Unresponsive', icon: PhoneOff, color: 'text-orange-500' },
              { id: 'spam', label: 'Spam, Scam, or Inappropriate', icon: AlertTriangle, color: 'text-red-500' },
              { id: 'other', label: 'Other Issue', icon: HelpCircle, color: 'text-slate-400' },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => setReportReason(option.id)}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-xl border border-slate-200 cursor-pointer transition-all duration-200 hover:border-red-200 hover:bg-slate-50",
                  reportReason === option.id && "border-red-500 bg-red-50 ring-1 ring-red-500"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full bg-white border border-slate-100 shadow-sm shrink-0",
                  reportReason === option.id && "border-red-200"
                )}>
                  <option.icon className={cn("h-5 w-5", option.color)} />
                </div>
                <div className="flex-1">
                  <span className={cn(
                    "font-medium text-slate-700",
                    reportReason === option.id && "text-red-900 font-semibold"
                  )}>
                    {option.label}
                  </span>
                </div>
                {reportReason === option.id && (
                  <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 mx-2 animate-pulse" />
                )}
              </div>
            ))}

            {/* Other Reason Textarea */}
            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              reportReason === 'other' ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <Textarea
                  placeholder="Please provide more details about the issue..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="min-h-[100px] bg-slate-50 border-slate-200 focus:border-red-500 focus:ring-red-500 resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-2 flex items-center justify-end gap-3 bg-white">
            <button
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              disabled={isReporting}
            >
              Cancel
            </button>
            <Button
              className={cn(
                "px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all",
                isReporting && "opacity-80"
              )}
              disabled={!reportReason || (reportReason === 'other' && otherReason.length < 10) || isReporting}
              onClick={async () => {
                if (!product || !user) return;
                setIsReporting(true);
                try {
                  const finalReason = reportReason === 'other' ? otherReason : reportReason;
                  const { error: reportError } = await supabase.from('reports').insert({
                    product_id: product.id,
                    reporter_id: user.id,
                    reason: finalReason
                  });

                  if (reportError) throw reportError;

                  const { data: currentProduct } = await supabase
                    .from('products')
                    .select('report_count, reported_by')
                    .eq('id', product.id)
                    .single();

                  const currentCount = currentProduct?.report_count || 0;
                  const reportedBy: string[] = currentProduct?.reported_by || [];

                  if (reportedBy.includes(user.id)) {
                    toast.error('You have already reported this item.');
                    setHasReported(true);
                    setShowReportModal(false);
                    return;
                  }

                  await supabase
                    .from('products')
                    .update({
                      report_count: currentCount + 1,
                      reported_by: [...reportedBy, user.id]
                    })
                    .eq('id', product.id);

                  setHasReported(true);
                  toast.success('Report submitted. Thank you for keeping us safe.');
                  setShowReportModal(false);
                } catch (error) {
                  console.error('Error submitting report:', error);
                  toast.error('Report failed - please try again.');
                } finally {
                  setIsReporting(false);
                }
              }}
            >
              {isReporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="mr-2 h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Drawer */}
      {product && (
        <ChatDrawer
          open={chatDrawerOpen}
          onOpenChange={setChatDrawerOpen}
          productId={product.id}
          productTitle={product.title}
          productPrice={product.price}
          sellerId={product.seller_id}
          sellerName={product.profiles?.full_name || 'Seller'}
        />
      )}
    </>
  );
}
