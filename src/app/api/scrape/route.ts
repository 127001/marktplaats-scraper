import { NextResponse } from 'next/server';
import { pool, scrapeData, Listing } from '@/lib/utils';
import { checkAuth } from '../middleware';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const activeOnly = searchParams.get('active') === 'true';

  try {
    // Only require authentication when adding a new listing (url parameter is present)
    if (url) {
      // Check if user is authenticated before allowing to add a new listing
      const authError = await checkAuth();
      if (authError) return authError;
      
      const listing = await scrapeData(url);
      // debug scraped data
      console.log('Scraped data:', listing);

      const client = await pool.connect();
      
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
      client.release();
    }

    // Fetching listings is allowed for everyone (public access)
    const client = await pool.connect();
    let query = 'SELECT * FROM listings';
    if (activeOnly) {
      query += ' WHERE isOffline = false';
    }
    
    const listings = await client.query<Listing>(query);
    client.release();

    return NextResponse.json({ listings: listings.rows });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
