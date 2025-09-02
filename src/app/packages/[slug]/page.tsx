
import { notFound } from "next/navigation";
import { Package } from "@/lib/data";
import { getSupabaseClient_server } from "@/lib/supabase";
import PackageDetailClient from "./PackageDetailClient";
import Head from 'next/head';

async function getPackage(slug: string): Promise<Package | null> {
    const supabase = getSupabaseClient_server();
    const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();
    
    if (error) {
        console.error(`Error fetching package with slug "${slug}":`, error.message);
        return null;
    }
    
    return data as Package | null;
}

export default async function PackageDetailPage({ params }: { params: { slug: string } }) {
  const pkg = await getPackage(params.slug);
  
  if (!pkg) {
    notFound();
  }
  
  const pageTitle = pkg.title;
  const pageDescription = pkg.description.substring(0, 160);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <PackageDetailClient pkg={pkg} />
    </>
  );
}
