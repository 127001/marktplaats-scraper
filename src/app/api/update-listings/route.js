import { NextResponse } from 'next/server';
import axios from 'axios';
import { load } from 'cheerio';
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to parse the date string (e.g., "22 feb. '25, 20:19")
const parsePublishingDate = (dateString) => {
  if (!dateString) return null;

  // Replace abbreviated month names with full names
  const monthMap = {
    jan: 'January',
    feb: 'February',
    mrt: 'March',
    apr: 'April',
    mei: 'May',
    jun: 'June',
    jul: 'July',
    aug: 'August',
    sep: 'September',
    okt: 'October',
    nov: 'November',
    dec: 'December',
  };

  // Extract the month abbreviation and replace it with the full name
  const monthAbbr = dateString.match(/[a-zA-Z]{3}/)?.[0]?.toLowerCase();
  if (monthAbbr && monthMap[monthAbbr]) {
    dateString = dateString.replace(monthAbbr, monthMap[monthAbbr]);
  }

  // Parse the date string into a Date object
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all listings from the database
    const listings = await client.query('SELECT * FROM listings');

    for (const listing of listings.rows) {
      try {
        // Skip updating offline ads
        if (listing.isoffline) continue;

        // Fetch the HTML content of the page
        const { data } = await axios.get(listing.url);

        // Load the HTML into Cheerio
        const $ = load(data);

        // Extract the title and price
        const title = $('h1.Listing-title').text().trim();
        const price = $('div.Listing-price').text().trim();

        // Extract the first image URL from div.carousel
        const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

        // Extract the publishing date from span.Stats-summary
        const publishingDateString = $('span.Stats-summary').text().trim();
        const publishingDate = parsePublishingDate(publishingDateString);
        console.log('dates ', publishingDateString, publishingDate);

        // Check if the ad is offline (price and image are missing)
        const isOffline = !price && !imageUrl;

        // Get the current timestamp
        const lastCheck = new Date().toISOString();

        // Compare the scraped price with the current price in the database
        if (price !== listing.currentprice) {
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
              title,
              price,
              listing.currentprice, // Move current price to previous price
              lastCheck,
              imageUrl,
              publishingDate,
              isOffline,
              listing.id,
            ]
          );
        } else {
          // If the price hasn't changed, only update the lastCheck timestamp and publishingDate
          await client.query(
            `
            UPDATE listings
            SET 
              lastCheck = $1,
              publishingDate = $2,
              isOffline = $3
            WHERE id = $4
          `,
            [lastCheck, publishingDate, isOffline, listing.id]
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
