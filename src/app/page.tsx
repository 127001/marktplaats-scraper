'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [url, setUrl] = useState('');

  // Define the Listing interface
  interface Listing {
    id: string;
    url: string;
    title: string;
    currentprice: string;
    previousprice: string;
    firstprice: string;
    lastcheck: string;
    imageurl: string; // Add imageurl to the interface
  }

  const [listings, setListings] = useState<Listing[]>([]);

  // Fetch all listings when the component mounts
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('/api/scrape');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setListings(data.listings);
      } catch (error) {
        console.error('Error fetching listings:', error);
      }
    };

    fetchListings();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleScrape = async () => {
    if (!url) {
      alert('Please enter a valid URL');
      return;
    }

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setListings(data.listings);

      // Clear the input field
      setUrl('');
    } catch (error) {
      console.error('Error scraping data:', error);
      alert('An error occurred while scraping data.');
    }
  };

  // Function to format the date
  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}, ${hours}:${minutes}`;
  };

  return (
    <div>
      <h1>Marktplaats Scraper</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter Marktplaats URL"
      />
      <button onClick={handleScrape}>Scrape Data</button>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Title</th>
            <th>Current Price</th>
            <th>Previous Price</th>
            <th>First Price</th>
            <th>Last Check</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id}>
              <td>
                <Image
                  width={75}
                  height={75}
                  src={listing.imageurl || 'https://placehold.co/600x400'} // Use the scraped image URL or a placeholder
                  alt={listing.title}
                  unoptimized
                />
              </td>
              <td>
                <a href={listing.url} target="_blank" rel="noopener noreferrer">
                  {listing.title}
                </a>
              </td>
              <td>{listing.currentprice}</td>
              <td>{listing.previousprice}</td>
              <td>{listing.firstprice}</td>
              <td>{formatDate(listing.lastcheck)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
