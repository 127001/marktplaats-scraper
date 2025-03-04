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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  try {
    const client = await pool.connect();

    if (url) {
      // Scrape data for the provided URL
      const { data } = await axios.get(url);
      const $ = load(data);

      // Extract the title and price
      const title = $('h1.Listing-title').text().trim();
      const price = $('div.Listing-price').text().trim();

      // Extract the first image URL from div.carousel
      const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

      // Extract the publishing date from span.Stats-summary
      const publishingDateString = $('span.Stats-summary').text().trim();
      const publishingDate = parsePublishingDate(publishingDateString);

      // Check if the ad is offline (price and image are missing)
      const isOffline = !price && !imageUrl;

      // Get the current timestamp
      const lastCheck = new Date().toISOString();

      // Check if the URL already exists in the database
      const existingListing = await client.query(
        'SELECT * FROM listings WHERE url = $1',
        [url]
      );

      if (existingListing.rows.length > 0) {
        // Update the existing record only if the price has changed and the ad is not offline
        if (price !== existingListing.rows[0].currentprice && !existingListing.rows[0].isoffline) {
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
              title,
              price,
              existingListing.rows[0].currentprice, // Move current price to previous price
              lastCheck,
              imageUrl,
              publishingDate,
              isOffline,
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
          [url, title, price, price, lastCheck, imageUrl, publishingDate, isOffline]
        );
      }
    }

    // Fetch all listings to return
    const listings = await client.query('SELECT * FROM listings');
    client.release();

    return NextResponse.json({ listings: listings.rows });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
