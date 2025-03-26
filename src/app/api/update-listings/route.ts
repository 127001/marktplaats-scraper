import { NextResponse } from 'next/server';
import { pool, scrapeData } from '@/lib/utils';
import { checkAuth } from '../middleware';

export async function GET() {
  // Check if user is authenticated
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const client = await pool.connect();

    // Fetch all listings from the database
    const listings = await client.query('SELECT * FROM listings WHERE isOffline = false'); // Only check active listings

    for (const listing of listings.rows) {
      try {
        const scrapedData = await scrapeData(listing.url);

        // If the ad is offline, update the status
        if (scrapedData.isOffline) {
          await client.query(
            `UPDATE listings SET isOffline = $1, lastCheck = $2 WHERE id = $3`,
            [true, scrapedData.lastCheck, listing.id]
          );
          continue; // Skip further checks for offline ads
        }

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
              false, // Explicitly set to false for active ads
              listing.id,
            ]
          );
        } else {
          // If the price hasn't changed, only update the lastCheck timestamp
          await client.query(
            `UPDATE listings SET lastCheck = $1, isOffline = $2 WHERE id = $3`,
            [scrapedData.lastCheck, false, listing.id] // Explicitly set to false for active ads
          );
        }
      } catch (error) {
        console.error(`Error updating listing ${listing.id}:`, error);
        // If scraping fails, mark as potentially offline
        await client.query(
          `UPDATE listings SET lastCheck = NOW(), isOffline = true WHERE id = $1`,
          [listing.id]
        );
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
