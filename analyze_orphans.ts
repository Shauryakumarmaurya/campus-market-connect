import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ooqdipxxtiqmkwbpgmtn.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_BCCpAAQ3AjLLXWM16LZmxQ_icQPJZtz";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyze() {
  console.log("=== Analyzing Orphaned Storage Files ===\n");
  
  const { data: files, error } = await supabase
    .storage
    .from('marketplace')
    .list('', { limit: 1000, offset: 0 });

  if (error) {
    console.error("Failed to list files:", error);
    return;
  }

  console.log(`Total files found in marketplace bucket: ${files?.length || 0}\n`);

  if (!files || files.length === 0) {
    console.log("No files in storage.");
    return;
  }

  const sellersMap = new Map<string, { count: number; files: string[] }>();
  let unparseable = 0;

  for (const file of files) {
    const match = file.name.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)\.(.+)$/);
    if (match) {
      const sellerId = match[1];
      if (!sellersMap.has(sellerId)) {
        sellersMap.set(sellerId, { count: 0, files: [] });
      }
      const entry = sellersMap.get(sellerId)!;
      entry.count++;
      entry.files.push(file.name);
    } else {
      unparseable++;
    }
  }

  console.log(`Unique sellers with orphaned images: ${sellersMap.size}`);
  console.log(`Unparseable filenames: ${unparseable}\n`);

  const sellerIds = Array.from(sellersMap.keys());
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, hostel_name, phone_number')
    .in('id', sellerIds);

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError);
    return;
  }

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  console.log("=== Top 10 Sellers with Most Orphaned Listings ===\n");
  const sortedSellers = Array.from(sellersMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  for (const [sellerId, info] of sortedSellers) {
    const profile = profilesMap.get(sellerId);
    console.log(`- ${profile?.full_name || 'Unknown'} (${profile?.hostel_name || 'No hostel'})`);
    console.log(`  Seller ID: ${sellerId}`);
    console.log(`  Orphaned listings: ${info.count}\n`);
  }

  console.log(`=== Summary ===`);
  console.log(`Total orphaned images: ${files.length}`);
  console.log(`Unique affected sellers: ${sellersMap.size}`);
  console.log(`Sellers with profiles in DB: ${profiles?.length || 0}`);
  console.log(`Sellers without profiles (deleted accounts): ${sellersMap.size - (profiles?.length || 0)}`);
}

analyze();
