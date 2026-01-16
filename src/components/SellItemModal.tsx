import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ProductToEdit {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
}

interface SellItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: ProductToEdit | null;
}

const categories = ['Books', 'Electronics', 'Lab Coat', 'Cycle', 'Other'];

export function SellItemModal({ open, onOpenChange, productToEdit }: SellItemModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
  });

  const isEditMode = !!productToEdit;

  // Pre-fill form when editing
  useEffect(() => {
    if (productToEdit && open) {
      setFormData({
        title: productToEdit.title,
        description: productToEdit.description || '',
        price: productToEdit.price.toString(),
        category: productToEdit.category,
      });
      setImagePreview(productToEdit.image_url);
      setImageFile(null);
    } else if (!open) {
      // Reset form when modal closes
      setFormData({ title: '', description: '', price: '', category: '' });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [productToEdit, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let imageUrl = isEditMode ? productToEdit.image_url : null;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('marketplace')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('marketplace')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const productData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: imageUrl,
      };

      if (isEditMode) {
        // UPDATE existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);

        if (error) throw error;
        toast.success('Listing updated successfully!');
      } else {
        // INSERT new product
        const { error } = await supabase.from('products').insert({
          ...productData,
          seller_id: user.id,
          status: 'available',
        });

        if (error) throw error;
        toast.success('Item listed successfully!');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings-preview'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? 'Edit Listing' : 'Sell an Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="image" className="block mb-2">Photo</Label>
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImagePlus className="h-8 w-8 mb-2" />
                  <span className="text-sm">Click to upload</span>
                </div>
              )}
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What are you selling?"
              required
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your item..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading || !formData.title || !formData.price || !formData.category}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Listing...'}
              </>
            ) : (
              isEditMode ? 'Update Listing' : 'List Item'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
