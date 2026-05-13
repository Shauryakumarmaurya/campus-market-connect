import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// NOTE: You MUST provide the SERVICE_ROLE_KEY to bypass Row Level Security for updating all users' products and deleting their files.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CLOUDINARY_CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.");
  console.error("You can find SERVICE_ROLE_KEY in Supabase Dashboard -> Project Settings -> API -> service_role secret.");
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error("ERROR: Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadToCloudinary(imageBuffer: Buffer, originalName: string): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const blob = new Blob([imageBuffer]);
  
  const formData = new FormData();
  formData.append('file', blob, originalName);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET as string);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

async function runMigration() {
  console.log("Fetching products with Supabase images...");
  
  // Find all products that have an image hosted on any Supabase project
  const { data: products, error } = await supabase
    .from('products')
    .select('id, image_url')
    .like('image_url', `%supabase.co%`);

  if (error) {
    console.error("Failed to fetch products:", error);
    return;
  }

  if (!products || products.length === 0) {
    console.log("No products found with Supabase images! You are all set.");
    return;
  }

  console.log(`Found ${products.length} products to migrate. Starting migration...`);

  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    try {
      console.log(`\nMigrating product ${product.id}...`);
      
      const oldUrl = product.image_url;
      // Extract the file path. URL format: .../storage/v1/object/public/marketplace/filename.jpg
      const urlParts = oldUrl.split('/storage/v1/object/public/marketplace/');
      if (urlParts.length < 2) {
        console.log(`Skipping: Could not parse file path from ${oldUrl}`);
        continue;
      }
      
      const filePath = urlParts[1];
      console.log(`  File path: ${filePath}`);

      // 1. Download the image directly from the public URL
      const response = await fetch(oldUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image from ${oldUrl}: ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());

      // 2. Upload to Cloudinary
      console.log(`  Uploading to Cloudinary...`);
      const newUrl = await uploadToCloudinary(buffer, filePath);
      console.log(`  New URL: ${newUrl}`);

      // 3. Update the product record in database
      console.log(`  Updating database record...`);
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: newUrl })
        .eq('id', product.id);

      if (updateError) {
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      // 4. Delete the file from Supabase storage if it belongs to the current project
      console.log(`  Deleting original file from Supabase...`);
      const supabaseUrlMatch = oldUrl.match(/https:\/\/[^\.]+\.supabase\.co/);
      if (supabaseUrlMatch && supabaseUrlMatch[0] === SUPABASE_URL) {
        const { error: deleteError } = await supabase
          .storage
          .from('marketplace')
          .remove([filePath]);

        if (deleteError) {
          console.warn(`  Warning: Failed to delete from Supabase storage: ${deleteError.message}`);
        } else {
          console.log(`  Successfully deleted from Supabase!`);
        }
      } else {
        console.log(`  Skipping deletion because image is in a different Supabase project.`);
      }

      successCount++;
    } catch (err: any) {
      console.error(`  Error migrating product ${product.id}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nMigration complete! Successfully migrated ${successCount} images. Failed: ${failCount}.`);
}

runMigration();