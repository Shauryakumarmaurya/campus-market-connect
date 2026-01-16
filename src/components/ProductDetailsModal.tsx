import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, MessageCircle, X, ShoppingCart, Check, Loader2, Pencil, Heart, Flag } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatRupee } from '@/lib/formatRupee';

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
  const [isInCart, setIsInCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");

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

  const handleWhatsAppClick = () => {
    if (product.profiles?.phone_number) {
      const phoneNumber = product.profiles.phone_number.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(`Hi, I am interested in "${product.title}"`);
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }
  };

  const handleCartToggle = async () => {
    if (!user) {
      toast.error('Please sign in to save items');
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white shadow-md p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {product.image_url && (
            <div className="w-full relative">
              {/* Report Flag Button (Top-Left) */}
              <button
                onClick={() => {
                  if (!product || !user) return;
                  if (hasReported) {
                    toast.error('You have already reported this item.');
                    return;
                  }
                  setShowReportModal(true);
                }}
                disabled={isReporting || hasReported}
                className={cn(
                  "absolute top-4 left-4 z-40 bg-white p-2.5 rounded-full shadow-md hover:bg-gray-50 transition-colors",
                  hasReported ? "opacity-100 cursor-not-allowed" : "hover:text-red-600"
                )}
                title={hasReported ? "You have already reported this item" : "Report this item"}
              >
                <Flag className={cn("h-5 w-5", hasReported ? "text-orange-500 fill-orange-500" : "text-gray-400")} />
              </button>

              {/* Wishlist Heart Button (Top-Right Inner) */}
              <button
                onClick={handleWishlistToggle}
                className="absolute top-4 right-14 z-40 bg-white p-2.5 rounded-full shadow-md hover:bg-gray-50 transition-colors"
              >
                <Heart
                  className={cn(
                    'h-5 w-5 transition-colors duration-200',
                    isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-400'
                  )}
                />
              </button>
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-auto max-h-80 object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="text-xl font-bold text-foreground text-left">
                  {product.title}
                </DialogTitle>
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium text-primary-foreground shrink-0',
                  categoryColors[product.category] || 'bg-muted'
                )}>
                  {product.category}
                </span>
              </div>
            </DialogHeader>

            <p className="text-3xl font-bold text-primary mt-4">{formatRupee(product.price)}</p>

            {product.description && (
              <p className="text-muted-foreground mt-4 leading-relaxed">
                {product.description}
              </p>
            )}

            {product.profiles && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground">{product.profiles.full_name}</p>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{product.profiles.hostel_name}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {isOwnProduct ? (
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/profile/listings';
                  }}
                  className="w-full py-6 text-lg font-semibold"
                >
                  <Pencil className="h-5 w-5 mr-2" />
                  Manage Listing
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleWhatsAppClick}
                    className="flex-1 bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground py-6 text-lg font-semibold"
                    disabled={!product.profiles?.phone_number}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat on WhatsApp
                  </Button>

                  <Button
                    onClick={handleCartToggle}
                    variant={isInCart ? "default" : "outline"}
                    className={cn(
                      "flex-1 py-6 text-lg font-semibold",
                      isInCart && "bg-primary hover:bg-primary/90"
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
                    {isChecking ? 'Checking...' : isInCart ? 'Saved' : 'Add to Cart'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-slate-900">Why are you reporting this?</h3>
              <RadioGroup value={reportReason} onValueChange={setReportReason}>
                <div className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value="sold" id="sold" />
                  <Label htmlFor="sold">Item is already sold</Label>
                </div>
                <div className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value="wrong_contact" id="wrong_contact" />
                  <Label htmlFor="wrong_contact">Wrong WhatsApp Number / Seller unresponsive</Label>
                </div>
                <div className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam">Spam, Scam, or Inappropriate</Label>
                </div>
                <div className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>

            {reportReason === 'other' && (
              <Textarea
                placeholder="Please describe the issue (minimum 10 characters)..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="min-h-[100px]"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)} disabled={isReporting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reportReason || (reportReason === 'other' && otherReason.length < 10) || isReporting}
              onClick={async () => {
                if (!product || !user) return;
                setIsReporting(true);
                try {
                  // 1. Insert into reports table
                  const finalReason = reportReason === 'other' ? otherReason : reportReason;
                  const { error: reportError } = await supabase.from('reports').insert({
                    product_id: product.id,
                    reporter_id: user.id,
                    reason: finalReason
                  });

                  if (reportError) throw reportError;

                  // 2. Existing Logic: Update product count
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
                  toast.success('Report submitted. Thank you.');
                  setShowReportModal(false);
                } catch (error) {
                  console.error('Error submitting report:', error);
                  toast.error('Report failed - check connection');
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
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
