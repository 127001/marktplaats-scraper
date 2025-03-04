'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [url, setUrl] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

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
    publishingdate: string; // Add publishingdate to the interface
    isoffline: boolean; // Add isoffline to the interface
  }



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

  // Function to delete an entry
  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this listing?');
    if (!confirmDelete) return;

    try {
      const response: Response = await fetch(`/api/delete?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Remove the deleted listing from the state
      setListings((prevListings) => prevListings.filter((listing) => listing.id !== id));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('An error occurred while deleting the listing.');
    }
  };

  // Function to update the listings 
  const handleUpdateListings = async () => {
    setIsUpdating(true);

    try {
      // Call the update-listings API
      const response = await fetch('/api/update-listings');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Fetch the updated listings
      const scrapeResponse = await fetch('/api/scrape?url='); // Fetch all listings
      if (!scrapeResponse.ok) {
        throw new Error(`HTTP error! Status: ${scrapeResponse.status}`);
      }
      const data = await scrapeResponse.json();
      setListings(data.listings);
    } catch (error) {
      console.error('Error updating listings:', error);
      alert('An error occurred while updating listings.');
    } finally {
      setIsUpdating(false);
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
    <div className='w-full'>
      <h1 className='text-center text-2xl'>Marktplaats Scraper</h1>
      <div className='grid grid-cols-6 gap-4 mb-2 p-2'>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Marktplaats URL"
          className='col-span-4'
        />
        <button onClick={handleScrape} className='bg-green-400 rounded-lg p-2'>Check prices</button>

        <button onClick={handleUpdateListings} disabled={isUpdating} className='bg-blue-400 rounded-lg p-2'>
          {isUpdating ? 'Updating...' : 'Update Listings'}
        </button>
      </div>

      <table className='w-full'>
        <thead>
          <tr className='text-left bg-gray-400'>
            <th></th>
            <th>Title</th>
            <th>Publishing Date</th>
            <th>Current Price</th>
            <th>Previous Price</th>
            <th>First Price</th>
            <th>Last Check</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr
              key={listing.id}
              className={`border-b even:bg-gray-100 odd:bg-alternate ${
                listing.currentprice === 'Gereserveerd' ? 'bg-yellow-100' : ''
              } ${listing.isoffline ? 'bg-red-100' : ''}`}
            >
              <td>
                <Image
                  width={75}
                  height={50}
                  src={listing.imageurl || 'https://placehold.co/600x400'} // Use the scraped image URL or a placeholder
                  alt={listing.title}
                  className='rounded-lg p-1'
                  unoptimized
                />
              </td>
              <td>
                <a href={listing.url} target="_blank" rel="noopener noreferrer">
                  {listing.title}
                </a>
              </td>
              <td>{listing.publishingdate ? new Date(listing.publishingdate).toLocaleString() : 'N/A'}</td>
              <td>{listing.currentprice}</td>
              <td>{listing.previousprice}</td>
              <td>{listing.firstprice}</td>
              <td>{formatDate(listing.lastcheck)}</td>
              <td>
                <button className='text-red-600 hover:underline hover:cursor-pointer' onClick={() => handleDelete(listing.id)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


