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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  try {
    const client = await pool.connect();

    if (url) {
      // Scrape data and update the database
      const { data } = await axios.get(url);
      const $ = load(data);

      // Extract the title and price
      const title = $('h1.Listing-title').text().trim();
      const price = $('div.Listing-price').text().trim();

      // Extract the first image URL from div.carousel
      const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

      // Get the current timestamp
      const lastCheck = new Date().toISOString();

      // Check if the URL already exists in the database
      const existingListing = await client.query(
        'SELECT * FROM listings WHERE url = $1',
        [url]
      );

      if (existingListing.rows.length > 0) {
        // Update the existing record
        await client.query(
          `
          UPDATE listings
          SET title = $1, currentPrice = $2, previousPrice = $3, lastCheck = $4, imageurl = $5
          WHERE url = $6
        `,
          [title, price, existingListing.rows[0].currentprice, lastCheck, imageUrl, url]
        );
      } else {
        // Insert a new record
        await client.query(
          `
          INSERT INTO listings (url, title, currentPrice, firstPrice, lastCheck, imageurl)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [url, title, price, price, lastCheck, imageUrl]
        );
      }
    }

    // Fetch all listings
    const listings = await client.query('SELECT * FROM listings');
    client.release();

    return NextResponse.json({ listings: listings.rows });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
