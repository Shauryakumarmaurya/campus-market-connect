import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!product) return null;

  const handleWhatsAppClick = () => {
    if (product.profiles?.phone_number) {
      const phoneNumber = product.profiles.phone_number.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(`Hi, I am interested in "${product.title}"`);
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {product.image_url && (
          <div className="w-full">
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

          <p className="text-3xl font-bold text-primary mt-4">₹{product.price}</p>

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

          <Button
            onClick={handleWhatsAppClick}
            className="w-full mt-6 bg-whatsapp hover:bg-whatsapp/90 text-whatsapp-foreground py-6 text-lg font-semibold"
            disabled={!product.profiles?.phone_number}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
