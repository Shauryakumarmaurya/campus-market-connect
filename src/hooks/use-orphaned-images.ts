import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useOrphanedImages() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['orphaned-images-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: existingProducts } = await supabase
        .from('products')
        .select('image_url')
        .eq('seller_id', user.id);

      const usedImageUrls = new Set(
        (existingProducts || [])
          .map((p) => p.image_url)
          .filter((url): url is string => !!url)
      );

      const { data: files, error } = await supabase
        .storage
        .from('marketplace')
        .list('', {
          limit: 1000,
          offset: 0,
          search: user.id,
        });

      if (error || !files) return 0;

      let orphanCount = 0;
      for (const file of files) {
        if (!file.name.startsWith(user.id)) continue;
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/marketplace/${file.name}`;
        if (!usedImageUrls.has(imageUrl)) {
          orphanCount++;
        }
      }

      return orphanCount;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    orphanCount: query.data || 0,
    isLoading: query.isLoading,
  };
}
