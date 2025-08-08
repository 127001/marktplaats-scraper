import 'server-only';
import axios from 'axios';
import { load } from 'cheerio';

// Define the structure of a listing
export interface Listing {
  id?: number;
  url: string;
  title: string;
  currentPrice: string;
  previousPrice: string | null;
  firstPrice: string;
  lastCheck: string;
  imageurl: string;
  publishingDate: string | null;
  isOffline: boolean;
}

// Helper function to parse the date string (e.g., "22 feb. '25, 20:19")
export const parsePublishingDate = (dateString: string | undefined): string | null => {
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

// Helper function to scrape data from a URL
export const scrapeData = async (url: string): Promise<Listing> => {
  const { data } = await axios.get(url);
  const $ = load(data);

  // Extract the title and price
  const title = $('h1.Listing-title').text().trim();
  const price = $('div.Listing-price').text().trim();

  // Extract the first image URL from div.carousel
  const imageUrl = $('img.HeroImage-image').first().attr('src') || '';

  // Extract the publishing date from span.Stats-summary
  const publishingDateString = $('span.Stats-summary').eq(2).text().trim();
  console.log('publishingDateString: ', publishingDateString);
  const publishingDate = parsePublishingDate(publishingDateString);
  console.log('publishingDate: ', publishingDate);

  // Check if the ad is offline (price and image are missing)
  const isOffline = !price && !imageUrl;

  // Get the current timestamp
  const lastCheck = new Date().toISOString();

  return {
    url,
    title,
    currentPrice: price,
    previousPrice: null,
    firstPrice: price,
    lastCheck,
    imageurl: imageUrl,
    publishingDate,
    isOffline,
  };
};
