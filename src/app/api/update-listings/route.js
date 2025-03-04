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

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all listings from the database
    const listings = await client.query('SELECT * FROM listings');

    for (const listing of listings.rows) {
      try {
        // Fetch the HTML content of the page
        const { data } = await axios.get(listing.url);

        // Load the HTML into Cheerio
        const $ = load(data);

        // Extract the title and price
        const title = $('h1.Listing-title').text().trim();
        const price = $('div.Listing-price').text().trim();

        // Extract the first image URL from div.carousel
        const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

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
              imageurl = $5
            WHERE id = $6
          `,
            [
              title,
              price,
              listing.currentprice, // Move current price to previous price
              lastCheck,
              imageUrl,
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
            [lastCheck, listing.id]
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
