import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, ArchiveRestore, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const categories = ['Books', 'Electronics', 'Lab Coat', 'Cycle', 'Other'];

interface OrphanedImage {
  fileName: string;
  imageUrl: string;
  uploadedAt: number;
}

interface ListingDraft {
  title: string;
  description: string;
  price: string;
  category: string;
}

export default function RestoreListings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, ListingDraft>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [discarding, setDiscarding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orphaned-images', user?.id],
    queryFn: async () => {
      if (!user) return { orphans: [] as OrphanedImage[] };

      const { data: existingProducts } = await supabase
        .from('products')
        .select('image_url')
        .eq('seller_id', user.id);

      const usedImageUrls = new Set(
        (existingProducts || [])
          .map((p) => p.image_url)
          .filter((url): url is string => !!url)
      );

      const { data: files, error: storageError } = await supabase
        .storage
        .from('marketplace')
        .list('', {
          limit: 1000,
          offset: 0,
          search: user.id,
        });

      if (storageError) {
        throw storageError;
      }

      const orphans: OrphanedImage[] = [];
      for (const file of files || []) {
        if (!file.name.startsWith(user.id)) continue;

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/marketplace/${file.name}`;
        if (usedImageUrls.has(imageUrl)) continue;

        const tsMatch = file.name.match(/-(\d+)\.[^.]+$/);
        const uploadedAt = tsMatch ? parseInt(tsMatch[1], 10) : 0;

        orphans.push({ fileName: file.name, imageUrl, uploadedAt });
      }

      orphans.sort((a, b) => b.uploadedAt - a.uploadedAt);
      return { orphans };
    },
    enabled: !!user,
  });

  const updateDraft = (fileName: string, updates: Partial<ListingDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [fileName]: {
        title: '',
        description: '',
        price: '',
        category: '',
        ...prev[fileName],
        ...updates,
      },
    }));
  };

  const handleSubmit = async (image: OrphanedImage) => {
    if (!user) return;
    const draft = drafts[image.fileName];
    if (!draft || !draft.title || !draft.price || !draft.category) {
      toast.error('Please fill title, price, and category');
      return;
    }

    setSubmitting((prev) => ({ ...prev, [image.fileName]: true }));
    try {
      const { error: insertError } = await supabase.from('products').insert({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        price: parseFloat(draft.price),
        category: draft.category,
        image_url: image.imageUrl,
        seller_id: user.id,
        status: 'available',
      });

      if (insertError) throw insertError;

      toast.success('Listing restored successfully!');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[image.fileName];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['orphaned-images'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore listing');
    } finally {
      setSubmitting((prev) => ({ ...prev, [image.fileName]: false }));
    }
  };

  const handleDiscard = async (image: OrphanedImage) => {
    setDiscarding((prev) => ({ ...prev, [image.fileName]: true }));
    try {
      const { error: deleteError } = await supabase
        .storage
        .from('marketplace')
        .remove([image.fileName]);

      if (deleteError) throw deleteError;

      toast.success('Image discarded');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[image.fileName];
        return next;
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to discard image');
    } finally {
      setDiscarding((prev) => ({ ...prev, [image.fileName]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) return null;

  const orphans = data?.orphans || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ArchiveRestore className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Restore Your Listings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
            Due to a recent technical issue, some of your old listings were lost from our database.
            Your photos are still safe! Quickly fill in the title, price, and category for each
            photo below to bring your listings back to life.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white dark:bg-[#161B22] rounded-2xl border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              Failed to load your photos
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6 max-w-md mx-auto">
              {(error as Error).message ||
                'We could not access your storage right now. Please try again in a moment.'}
            </p>
            <Button onClick={() => refetch()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Try Again
            </Button>
          </div>
        ) : orphans.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#161B22] rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-900/30">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              You're all caught up!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">
              We could not find any orphaned photos in your account.
            </p>
            <Button
              onClick={() => navigate('/profile/listings')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Package className="h-4 w-4 mr-2" />
              View My Listings
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {orphans.length} photo{orphans.length === 1 ? '' : 's'} ready to restore
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Try to use the same prices and titles as your original listings so buyers know
                  what to expect!
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              {orphans.map((image) => {
                const draft = drafts[image.fileName] || {
                  title: '',
                  description: '',
                  price: '',
                  category: '',
                };
                const isSubmitting = submitting[image.fileName];
                const isDiscarding = discarding[image.fileName];

                return (
                  <div
                    key={image.fileName}
                    className="bg-white dark:bg-[#161B22] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
                  >
                    <div className="grid md:grid-cols-[280px_1fr] gap-0">
                      <div className="relative bg-slate-100 dark:bg-[#0d1117] flex items-center justify-center p-4">
                        <img
                          src={image.imageUrl}
                          alt="Listing photo"
                          className="max-h-[280px] w-auto object-contain rounded-lg"
                        />
                      </div>

                      <div className="p-5 flex flex-col gap-3">
                        <div>
                          <Label htmlFor={`title-${image.fileName}`} className="text-xs">
                            Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={`title-${image.fileName}`}
                            value={draft.title}
                            onChange={(e) =>
                              updateDraft(image.fileName, { title: e.target.value })
                            }
                            placeholder="What were you selling?"
                            maxLength={100}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`price-${image.fileName}`} className="text-xs">
                              Price (₹) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`price-${image.fileName}`}
                              type="number"
                              min="0"
                              step="1"
                              value={draft.price}
                              onChange={(e) =>
                                updateDraft(image.fileName, { price: e.target.value })
                              }
                              placeholder="0"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`category-${image.fileName}`} className="text-xs">
                              Category <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={draft.category}
                              onValueChange={(value) =>
                                updateDraft(image.fileName, { category: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
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

                        <div>
                          <Label htmlFor={`desc-${image.fileName}`} className="text-xs">
                            Description (optional)
                          </Label>
                          <Textarea
                            id={`desc-${image.fileName}`}
                            value={draft.description}
                            onChange={(e) =>
                              updateDraft(image.fileName, { description: e.target.value })
                            }
                            placeholder="Tell buyers about your item..."
                            rows={2}
                            maxLength={500}
                            className="mt-1 resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isDiscarding || isSubmitting}
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                              >
                                {isDiscarding ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 mr-1.5" />
                                )}
                                Discard photo
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Discard this photo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently deletes the image from storage. You will not be
                                  able to recover it. Continue only if you do not plan to re-list
                                  this item.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDiscard(image)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Yes, discard
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            onClick={() => handleSubmit(image)}
                            disabled={
                              isSubmitting ||
                              isDiscarding ||
                              !draft.title ||
                              !draft.price ||
                              !draft.category
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Restore Listing
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
