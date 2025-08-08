import { pool } from '@/lib/db';
import ClientHome, { ClientListing } from './ClientHome';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ListingsRow {
  id: number | string;
  url: string;
  title: string;
  currentprice?: string;
  currentPrice?: string;
  previousprice?: string | null;
  previousPrice?: string | null;
  firstprice?: string;
  firstPrice?: string;
  lastcheck?: string;
  lastCheck?: string;
  imageurl: string;
  publishingdate?: string | null;
  publishingDate?: string | null;
  isoffline?: boolean;
  isOffline?: boolean;
}

async function getInitialListings(): Promise<ClientListing[]> {
  try {
    const client = await pool.connect();
    // Default to active listings for faster first paint
    const { rows } = await client.query<ListingsRow>('SELECT * FROM listings WHERE isOffline = false');
    client.release();

    // Map DB rows (likely lowercased keys) to the client listing shape
    return rows.map((r) => ({
      id: String(r.id),
      url: r.url,
      title: r.title,
      currentprice: r.currentprice ?? r.currentPrice ?? '',
      previousprice: r.previousprice ?? r.previousPrice ?? '',
      firstprice: r.firstprice ?? r.firstPrice ?? '',
      lastcheck: r.lastcheck ?? r.lastCheck ?? '',
      imageurl: r.imageurl,
      publishingdate: r.publishingdate ?? r.publishingDate ?? '',
      isoffline: (r.isoffline ?? r.isOffline) ?? false,
    }));
  } catch (e) {
    console.error('Error fetching initial listings for SSR', e);
    return [];
  }
}

export default async function Page() {
  const initialListings = await getInitialListings();
  return <ClientHome initialListings={initialListings} />;
}
