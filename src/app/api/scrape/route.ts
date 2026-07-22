import { NextResponse } from 'next/server';
import { pool, scrapeData, Listing, InvalidScrapeUrlError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  try {
    const client = await pool.connect();

    if (url) {
      const listing = await scrapeData(url);
      // debug scraped data
      console.log('Scraped data:', listing);

      // Check if the URL already exists in the database
      const existingListing = await client.query<Listing>(
        'SELECT * FROM listings WHERE url = $1',
        [url]
      );

      if (existingListing.rows.length > 0) {
        // Update the existing record if the ad is not offline
        // Always update all fields to ensure missing data is populated
        // PostgreSQL returns lowercase column names, so we access them with bracket notation
        const existing = existingListing.rows[0] as unknown as Record<string, unknown>;
        if (!(existing.isoffline as boolean)) {
          // Check if price has changed to determine if we need to move current price to previous price
          const priceChanged = listing.currentPrice !== (existing.currentprice as string);
          const previousPrice = priceChanged ? (existing.currentprice as string) : (existing.previousprice as string | null);
          
          // Ensure firstPrice is always set - use existing firstPrice if it exists, otherwise use current price
          const existingFirstPrice = existing.firstprice as string | null | undefined;
          const firstPrice = existingFirstPrice && existingFirstPrice.trim() !== '' 
            ? existingFirstPrice 
            : listing.currentPrice;
          
          await client.query(
            `
            UPDATE listings
            SET 
              title = $1, 
              currentPrice = $2, 
              previousPrice = $3, 
              firstPrice = $4,
              lastCheck = $5, 
              imageurl = $6,
              publishingDate = $7,
              isOffline = $8
            WHERE url = $9
          `,
            [
              listing.title,
              listing.currentPrice,
              previousPrice, // Only update previousPrice if price changed, otherwise keep existing value
              firstPrice, // Use existing firstPrice if available, otherwise set to current price
              listing.lastCheck,
              listing.imageurl,
              listing.publishingDate,
              listing.isOffline,
              url,
            ]
          );
        }
      } else {
        // Insert a new record
        await client.query(
          `
          INSERT INTO listings (url, title, currentPrice, firstPrice, lastCheck, imageurl, publishingDate, isOffline)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            listing.url,
            listing.title,
            listing.currentPrice,
            listing.firstPrice,
            listing.lastCheck,
            listing.imageurl,
            listing.publishingDate,
            listing.isOffline,
          ]
        );
      }
    }

    // Fetch all listings to return
    const listings = await client.query<Listing>('SELECT * FROM listings');
    client.release();

    return NextResponse.json({ listings: listings.rows });
  } catch (error) {
    if (error instanceof InvalidScrapeUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
