'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

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

interface UpdateStats {
  totalProcessed: number;
  updated: number;
  wentOffline: number;
  errors: number;
}

// Notification component
const Notification = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  const bgColor = type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
  const borderColor = type === 'success' ? 'border-green-400' : type === 'error' ? 'border-red-400' : 'border-blue-400';

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-4 mb-4 rounded-md shadow-md`} role="alert">
      <div className="flex justify-between items-center">
        <p className={`${textColor} font-medium`}>{message}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Stats panel component
const StatsPanel = ({ stats, onClose }: { stats: UpdateStats; onClose: () => void }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 relative">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        aria-label="Close statistics panel"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-lg font-semibold mb-2">Update Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Total Processed</p>
          <p className="text-xl font-bold">{stats.totalProcessed}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Updated</p>
          <p className="text-xl font-bold text-green-600">{stats.updated}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Went Offline</p>
          <p className="text-xl font-bold text-yellow-600">{stats.wentOffline}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Errors</p>
          <p className="text-xl font-bold text-red-600">{stats.errors}</p>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const { data: session } = useSession();
  const [url, setUrl] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOffline, setShowOffline] = useState(false); // Default is now to hide offline ads
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default sorting is newest first
  const [sortColumn, setSortColumn] = useState<'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice'>('publishingdate');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [updateStats, setUpdateStats] = useState<UpdateStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Function to sort listings based on selected column and direction
  const sortListings = (listingsToSort: Listing[]) => {
    return [...listingsToSort].sort((a, b) => {
      if (sortColumn === 'publishingdate') {
        if (!a.publishingdate) return 1;
        if (!b.publishingdate) return -1;
        
        const dateA = new Date(a.publishingdate).getTime();
        const dateB = new Date(b.publishingdate).getTime();
        
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      } 
      else if (sortColumn === 'title') {
        // Case-insensitive alphabetical sorting for titles
        return sortDirection === 'desc' 
          ? b.title.toLowerCase().localeCompare(a.title.toLowerCase())
          : a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      }
      else {
        // For price columns
        const columnA = a[sortColumn];
        const columnB = b[sortColumn];
        
        // Handle special text values like 'Gereserveerd'
        if (columnA === 'Gereserveerd' && columnB !== 'Gereserveerd') return 1;
        if (columnA !== 'Gereserveerd' && columnB === 'Gereserveerd') return -1;
        if (columnA === 'Gereserveerd' && columnB === 'Gereserveerd') return 0;
        
        // Extract numeric values from price strings
        const numA = parseFloat(columnA?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        const numB = parseFloat(columnB?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        
        return sortDirection === 'desc' ? numB - numA : numA - numB;
      }
    });
  };

  // Function to handle column sorting
  const handleSort = (column: 'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice') => {
    if (sortColumn === column) {
      // If same column clicked, toggle direction
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // If new column clicked, set it as sort column and default to desc
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort indicator for a given column
  const getSortIndicator = (column: 'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice') => {
    if (sortColumn === column) {
      return sortDirection === 'desc' ? '↓' : '↑';
    }
    return '';
  };

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

    // check if url contains ? and if so only use the part before the ?
    const urlWithoutParams = url.split('?')[0];

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(urlWithoutParams)}`);
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
    setUpdateStats(null);
    setShowStats(false);
    try {
      // Call the update-listings API and get the response with statistics
      const updateResponse = await fetch('/api/update-listings');
      if (!updateResponse.ok) throw new Error(`HTTP error! Status: ${updateResponse.status}`);
      const updateData = await updateResponse.json();
      
      // Update the listings with the data from the update-listings response
      setListings(updateData.listings);
      
      // Set the update statistics and show the stats panel
      setUpdateStats(updateData.stats);
      setShowStats(true);
      
      // Show a success notification
      let message = `Update complete: ${updateData.stats.updated} listings updated`;
      if (updateData.stats.wentOffline > 0) {
        message += `, ${updateData.stats.wentOffline} went offline`;
      }
      if (updateData.stats.errors > 0) {
        message += `, ${updateData.stats.errors} errors occurred`;
      }
      
      setNotification({ message, type: 'success' });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (error) {
      console.error('Error updating listings:', error);
      setNotification({ message: 'An error occurred while updating listings.', type: 'error' });
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
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-2xl font-bold'>Marktplaats Scraper</h1>
        <div className='flex items-center gap-4'>
          {session?.user && (
            <div className='flex items-center gap-2'>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className='rounded-full'
                />
              )}
              <span className='text-sm text-gray-600'>
                {session.user.name || session.user.email}
              </span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className='bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm'
          >
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Notification */}
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      {/* Stats Panel Toggle Button */}
      {updateStats && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowStats(!showStats)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg px-4 py-2 flex items-center gap-2"
          >
            {showStats ? 'Hide Statistics' : 'Show Statistics'}
            <svg 
              className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Stats Panel */}
      {updateStats && showStats && (
        <StatsPanel 
          stats={updateStats} 
          onClose={() => setShowStats(false)} 
        />
      )}
      
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
                <th 
                  className='p-2 text-left cursor-pointer hover:bg-gray-300'
                  onClick={() => handleSort('title')}
                >
                  Title {getSortIndicator('title')}
                </th>
                <th 
                  className='p-2 text-left cursor-pointer hover:bg-gray-300'
                  onClick={() => handleSort('publishingdate')}
                >
                  Published {getSortIndicator('publishingdate')}
                </th>
                <th 
                  className='p-2 text-left cursor-pointer hover:bg-gray-300'
                  onClick={() => handleSort('currentprice')}
                >
                  Current {getSortIndicator('currentprice')}
                </th>
                <th 
                  className='p-2 text-left cursor-pointer hover:bg-gray-300'
                  onClick={() => handleSort('previousprice')}
                >
                  Previous {getSortIndicator('previousprice')}
                </th>
                <th 
                  className='p-2 text-left cursor-pointer hover:bg-gray-300'
                  onClick={() => handleSort('firstprice')}
                >
                  First {getSortIndicator('firstprice')}
                </th>
                <th className='p-2 text-left'>Last Check</th>
                {showOffline && <th className='p-2 text-left'>Status</th>}
                <th className='p-2 text-left'>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortListings(listings)
                .filter(listing => showOffline || !listing.isoffline)
                .map((listing) => (
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
                    {showOffline && (
                      <td className='p-2'>
                        {listing.isoffline ? (
                          <span className='text-red-600 font-medium'>Offline</span>
                        ) : listing.currentprice === 'Gereserveerd' ? (
                          <span className='text-yellow-600 font-medium'>Reserved</span>
                        ) : (
                          <span className='text-green-600 font-medium'>Active</span>
                        )}
                      </td>
                    )}
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
