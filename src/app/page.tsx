'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Listing {
  id: string;
  url: string;
  title: string;
  currentprice: string;
  previousprice: string;
  firstprice: string;
  lastcheck: string;
  imageurl: string;
  publishingdate: string;
  isoffline: boolean;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOffline, setShowOffline] = useState(false); // New state for filtering

  // Fetch all listings when the component mounts or when showOffline changes
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const endpoint = showOffline ? '/api/scrape' : '/api/scrape?active=true';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setListings(data.listings);
      } catch (error) {
        console.error('Error fetching listings:', error);
      }
    };

    fetchListings();
  }, [showOffline]);

  const handleScrape = async () => {
    if (!url) {
      alert('Please enter a valid URL');
      return;
    }

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setListings(data.listings);
      setUrl('');
    } catch (error) {
      console.error('Error scraping data:', error);
      alert('An error occurred while scraping data.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      const response = await fetch(`/api/delete?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      setListings(prev => prev.filter(listing => listing.id !== id));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('An error occurred while deleting the listing.');
    }
  };

  const handleUpdateListings = async () => {
    setIsUpdating(true);
    try {
      await fetch('/api/update-listings');
      const response = await fetch(showOffline ? '/api/scrape' : '/api/scrape?active=true');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setListings(data.listings);
      
      // Show notification if any ads went offline
      const offlineCount = data.listings.filter((l: Listing) => l.isoffline).length;
      if (offlineCount > 0) {
        alert(`${offlineCount} ads have been marked as offline`);
      }
    } catch (error) {
      console.error('Error updating listings:', error);
      alert('An error occurred while updating listings.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className='w-full p-4'>
      <h1 className='text-center text-2xl font-bold mb-4'>Marktplaats Scraper</h1>
      
      <div className='flex flex-col md:flex-row gap-4 mb-4'>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Marktplaats URL"
          className='flex-1 border-2 border-gray-400 p-2 rounded-lg'
        />
        <div className='flex gap-2'>
          <button 
            onClick={handleScrape} 
            className='bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2'
          >
            Add Listing
          </button>
          <button 
            onClick={handleUpdateListings} 
            disabled={isUpdating}
            className='bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50'
          >
            {isUpdating ? 'Updating...' : 'Update All'}
          </button>
          <button
            onClick={() => setShowOffline(!showOffline)}
            className={`${showOffline ? 'bg-gray-500' : 'bg-gray-300'} text-white rounded-lg px-4 py-2`}
          >
            {showOffline ? 'Hide Offline' : 'Show Offline'}
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>No listings found</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='bg-gray-200'>
                <th className='p-2 text-left'>Image</th>
                <th className='p-2 text-left'>Title</th>
                <th className='p-2 text-left'>Published</th>
                <th className='p-2 text-left'>Current</th>
                <th className='p-2 text-left'>Previous</th>
                <th className='p-2 text-left'>First</th>
                <th className='p-2 text-left'>Last Check</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.id}
                  className={`border-b ${listing.isoffline ? 'bg-red-50' : listing.currentprice === 'Gereserveerd' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                >
                  <td className='p-2'>
                    <Image
                      width={75}
                      height={50}
                      src={listing.imageurl || 'https://placehold.co/600x400'}
                      alt={listing.title}
                      className='rounded-lg object-cover'
                      unoptimized
                    />
                  </td>
                  <td className='p-2'>
                    <a 
                      href={listing.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className='text-blue-600 hover:underline'
                    >
                      {listing.title}
                    </a>
                  </td>
                  <td className='p-2'>{listing.publishingdate ? formatDate(listing.publishingdate) : 'N/A'}</td>
                  <td className='p-2 font-medium'>{listing.currentprice}</td>
                  <td className='p-2'>{listing.previousprice}</td>
                  <td className='p-2'>{listing.firstprice}</td>
                  <td className='p-2'>{formatDate(listing.lastcheck)}</td>
                  <td className='p-2'>
                    {listing.isoffline ? (
                      <span className='text-red-600 font-medium'>Offline</span>
                    ) : listing.currentprice === 'Gereserveerd' ? (
                      <span className='text-yellow-600 font-medium'>Reserved</span>
                    ) : (
                      <span className='text-green-600 font-medium'>Active</span>
                    )}
                  </td>
                  <td className='p-2'>
                    <button 
                      onClick={() => handleDelete(listing.id)}
                      className='text-red-600 hover:text-red-800 font-bold hover:underline hover:text-2xl hover:cursor-pointer'
                      title="Delete listing"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
