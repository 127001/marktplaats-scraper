import { NextResponse } from 'next/server';
import { pool, scrapeData } from '@/lib/utils';
import { requireAuthOrCron } from '@/lib/auth';

export async function GET() {
  const authResult = await requireAuthOrCron();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const client = await pool.connect();
    let updatedCount = 0;
    let offlineCount = 0;
    let errorCount = 0;

    // Fetch only active listings from the database
    const listings = await client.query('SELECT * FROM listings WHERE isOffline = false');
    console.log(`Processing ${listings.rows.length} active listings`);

    for (const listing of listings.rows) {
      try {
        const scrapedData = await scrapeData(listing.url);

        // If the ad is offline, update the status
        if (scrapedData.isOffline) {
          await client.query(
            `UPDATE listings SET isOffline = $1, lastCheck = $2 WHERE id = $3`,
            [true, scrapedData.lastCheck, listing.id]
          );
          offlineCount++;
          continue; // Skip further checks for offline ads
        }

        // Check if price has changed to determine if we need to move current price to previous price
        const priceChanged = scrapedData.currentPrice !== listing.currentprice;
        const previousPrice = priceChanged ? listing.currentprice : listing.previousprice;

        // Ensure firstPrice is always set - use existing firstPrice if it exists, otherwise use current price
        const existingFirstPrice = listing.firstprice as string | null | undefined;
        const firstPrice = existingFirstPrice && existingFirstPrice.trim() !== '' 
          ? existingFirstPrice 
          : scrapedData.currentPrice;

        // Always update all fields for active listings to ensure missing data is populated
        // This ensures title, imageurl, publishingDate, etc. are updated even if price hasn't changed
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
          WHERE id = $9
        `,
          [
            scrapedData.title,
            scrapedData.currentPrice,
            previousPrice, // Only update previousPrice if price changed, otherwise keep existing value
            firstPrice, // Use existing firstPrice if available, otherwise set to current price
            scrapedData.lastCheck,
            scrapedData.imageurl,
            scrapedData.publishingDate,
            false, // Explicitly set to false for active ads
            listing.id,
          ]
        );
        
        // Only count as "updated" if price changed, but all fields are still updated
        if (priceChanged) {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating listing ${listing.id}:`, error);
        // If scraping fails, mark as potentially offline
        await client.query(
          `UPDATE listings SET lastCheck = NOW(), isOffline = true WHERE id = $1`,
          [listing.id]
        );
        errorCount++;
      }
    }

    // Fetch all active listings after the update
    const updatedListings = await client.query('SELECT * FROM listings WHERE isOffline = false');
    client.release();

    console.log(`Update complete: ${updatedCount} listings updated, ${offlineCount} went offline, ${errorCount} errors`);

    return NextResponse.json({ 
      listings: updatedListings.rows,
      stats: {
        totalProcessed: listings.rows.length,
        updated: updatedCount,
        wentOffline: offlineCount,
        errors: errorCount
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

