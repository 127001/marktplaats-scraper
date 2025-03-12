import { NextResponse } from 'next/server';
import { pool, scrapeData } from '@/lib/utils';

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all listings from the database
    const listings = await client.query('SELECT * FROM listings');

    for (const listing of listings.rows) {
      try {
        const scrapedData = await scrapeData(listing.url);

        // Compare the scraped price with the current price in the database
        if (scrapedData.currentPrice !== listing.currentprice) {
          // If the price has changed, update the price fields and lastCheck
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
            WHERE id = $8
          `,
            [
              scrapedData.title,
              scrapedData.currentPrice,
              listing.currentprice, // Move current price to previous price
              scrapedData.lastCheck,
              scrapedData.imageurl,
              scrapedData.publishingDate,
              scrapedData.isOffline,
              listing.id,
            ]
          );
        } else {
          // If the price hasn't changed, only update the lastCheck timestamp
          await client.query(
            `
            UPDATE listings
            SET 
              lastCheck = $1
            WHERE id = $2
          `,
            [scrapedData.lastCheck, listing.id]
          );
        }
      } catch (error) {
        console.error(`Error updating listing ${listing.id}:`, error);
      }
    }

    // Fetch all listings to return
    const updatedListings = await client.query('SELECT * FROM listings');
    client.release();

    return NextResponse.json({ listings: updatedListings.rows });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
