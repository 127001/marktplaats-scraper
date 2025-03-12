import { NextResponse } from 'next/server';
import axios from 'axios';
import { load } from 'cheerio';
import { Pool } from 'pg';

// Define the structure of a listing
interface Listing {
  id: number;
  url: string;
  title: string;
  currentPrice: string; // camelCase
  previousPrice: string | null; // camelCase
  firstPrice: string; // camelCase
  lastCheck: string; // camelCase
  imageUrl: string; // camelCase
  publishingDate: string | null; // camelCase
  isOffline: boolean; // camelCase
  highestBid: string | null; // camelCase (added based on your column names)
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to parse the date string (e.g., "22 feb. '25, 20:19")
const parsePublishingDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null;

  // Replace abbreviated month names with full names
  const monthMap: { [key: string]: string } = {
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

    // Fetch all listings from the database with column aliasing
    const listings = await client.query<Listing>(`
      SELECT 
        id,
        url,
        title,
        currentprice AS "currentPrice",
        previousprice AS "previousPrice",
        firstprice AS "firstPrice",
        lastcheck AS "lastCheck",
        imageurl AS "imageUrl",
        publishingdate AS "publishingDate",
        isoffline AS "isOffline",
        highestbid AS "highestBid"
      FROM listings
    `);

    // Log the fetched listings for debugging
    console.log('Fetched listings:', listings.rows);

    for (const listing of listings.rows) {
      try {
        // Skip updating offline ads
        if (listing.isOffline) {
          console.log(`Skipping offline listing ${listing.id}`);
          continue;
        }

        // Fetch the HTML content of the page
        const { data } = await axios.get(listing.url);

        // Load the HTML into Cheerio
        const $ = load(data);

        // Extract the title and price
        const title = $('h1.Listing-title').text().trim();
        const price = $('div.Listing-price').text().trim();

        // Extract the first image URL from div.carousel
        const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

        // Extract the publishing date from the third span.Stats-summary element
        const publishingDateString = $('span.Stats-summary').eq(2).text().trim() || undefined;
        const publishingDate = parsePublishingDate(publishingDateString);

        // Check if the ad is offline (price and image are missing)
        const isOffline = !price && !imageUrl;

        // Get the current timestamp
        const lastCheck = new Date().toISOString();

        // Log the current and scraped prices for debugging
        console.log(`Listing ${listing.id}: Current Price = ${listing.currentPrice}, Scraped Price = ${price}`);

        // Compare the scraped price with the current price in the database
        if (price !== listing.currentPrice) {
          // If the price has changed, update the price fields and lastCheck
          console.log(`Price changed for listing ${listing.id}. Updating previousPrice to ${listing.currentPrice} and currentPrice to ${price}`);

          await client.query(
            `
            UPDATE listings
            SET 
              title = $1, 
              currentprice = $2, 
              previousprice = $3, 
              lastcheck = $4, 
              image = $5,
              publishingdate = $6,
              isoffline = $7
            WHERE id = $8
          `,
            [
              title,
              price,
              listing.currentPrice, // Move current price to previous price
              lastCheck,
              imageUrl,
              publishingDate,
              isOffline,
              listing.id,
            ]
          );
        } else {
          // If the price hasn't changed, only update the lastCheck timestamp and publishingDate
          console.log(`Price unchanged for listing ${listing.id}. Only updating lastCheck and publishingDate.`);

          await client.query(
            `
            UPDATE listings
            SET 
              lastcheck = $1,
              publishingdate = $2,
              isoffline = $3
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
    const updatedListings = await client.query<Listing>('SELECT * FROM listings');
    client.release();

    return NextResponse.json({ listings: updatedListings.rows });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
