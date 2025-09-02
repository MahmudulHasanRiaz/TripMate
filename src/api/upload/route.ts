import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getSupabaseClient_server } from "@/lib/supabase";

// This function generates a URL-friendly slug from a filename
const createSlug = (fileName: string): string => {
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
    const cleanedName = nameWithoutExtension
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with a single one
  
    // Add a unique identifier to prevent collisions
    const uniqueId = Date.now().toString(36).slice(-4);
    
    return extension ? `${cleanedName}-${uniqueId}.${extension}` : `${cleanedName}-${uniqueId}`;
};

// This handles the main POST request to get a pre-signed URL and create a media record
export async function POST(request: Request) {
  const { filename, contentType, size, altText, dataAiHint } = await request.json();

  if (!filename || !contentType || !size) {
    return NextResponse.json({ error: "Filename, contentType, and size are required." }, { status: 400 });
  }

  // --- R2 Client Initialization ---
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    console.error("R2 environment variables are not fully set.");
    return NextResponse.json({ error: "Server configuration error: R2 environment variables are missing." }, { status: 500 });
  }

  try {
    const supabase = getSupabaseClient_server();
    
    const slug = createSlug(filename);
    const finalUrl = `${publicUrl}/${slug}`;

    // 1. Create a new media record in Supabase first to get an ID
    const { data: newMedia, error: insertError } = await supabase
      .from('media')
      .insert({
        name: filename,
        type: contentType.split('/')[0] || 'file',
        url: finalUrl, // Store the final public URL
        size: size,
        alt_text: altText || '',
        data_ai_hint: dataAiHint || '',
        // uploaded_at and modified_at have default values in the DB
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }
    
    const fileId = newMedia.id;
    const objectKey = `${fileId}/${slug}`; // Use a more structured key if desired, e.g., using the ID

    // 2. Generate the pre-signed URL for the specific object key
    const R2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: slug, // Use the simple slug as the key for direct public access
      ContentType: contentType,
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
    
    // Return the URLs and the unique ID for the client to use
    return NextResponse.json({ uploadUrl, finalUrl, fileId });

  } catch (error) {
    console.error("Error creating signed URL or saving metadata:", error);
    return NextResponse.json({ error: "Could not create upload URL or save metadata. Check server logs." }, { status: 500 });
  }
}

// This handles the CORS pre-flight OPTIONS request
export async function OPTIONS(request: Request) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new NextResponse(null, { status: 204, headers });
}
