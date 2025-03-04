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

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Fetch the HTML content of the page
    const { data } = await axios.get(url);

    // Load the HTML into Cheerio
    const $ = load(data);

    // Extract the title and price
    const title = $('h1.Listing-title').text().trim();
    const price = $('div.Listing-price').text().trim();

    // Get the current timestamp
    const lastCheck = new Date().toISOString();

    // Check if the URL already exists in the database
    const client = await pool.connect();
    const existingListing = await client.query(
      'SELECT * FROM listings WHERE url = $1',
      [url]
    );

    if (existingListing.rows.length > 0) {
      // Update the existing record
      await client.query(
        `
        UPDATE listings
        SET title = $1, currentPrice = $2, previousPrice = $3, lastCheck = $4
        WHERE url = $5
      `,
        [title, price, existingListing.rows[0].currentprice, lastCheck, url]
      );
    } else {
      // Insert a new record
      await client.query(
        `
        INSERT INTO listings (url, title, currentPrice, firstPrice, lastCheck)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [url, title, price, price, lastCheck]
      );
    }

    // Fetch all listings to return
    const listings = await client.query('SELECT * FROM listings');

    // Release the client back to the pool
    client.release();

    // Send the data back to the frontend
    return NextResponse.json({ listings: listings.rows });
  } catch (error) {
    console.error('Error scraping data:', error);
    return NextResponse.json({ error: 'Failed to scrape data' }, { status: 500 });
  }
}
