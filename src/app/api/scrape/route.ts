import { NextResponse } from 'next/server';
import { pool, scrapeData, Listing } from '@/lib/utils';

export async function GET(request: Request) {
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
        // Update the existing record only if the price has changed and the ad is not offline
        if (listing.currentPrice !== existingListing.rows[0].currentPrice && !existingListing.rows[0].isOffline) {
          await client.query(
            `
            UPDATE listings
            SET 
              title = $1, 
              currentPrice = $2, 
              previousPrice = $3, 
              lastCheck = $4, 
              imageurl = $5,
              publishingDate = $6,
              isOffline = $7
            WHERE url = $8
          `,
            [
              listing.title,
              listing.currentPrice,
              existingListing.rows[0].currentPrice, // Move current price to previous price
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
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
