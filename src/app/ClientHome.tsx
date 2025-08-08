'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

export interface ClientListing {
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

export default function ClientHome({ initialListings }: { initialListings: ClientListing[] }) {
  const [url, setUrl] = useState('');
  const [listings, setListings] = useState<ClientListing[]>(initialListings);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortColumn, setSortColumn] = useState<'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice'>('publishingdate');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [updateStats, setUpdateStats] = useState<UpdateStats | null>(null);
  const [showStats, setShowStats] = useState(false);

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

    // Only fetch when toggling filter; initial SSR data used on first paint
    if (initialListings.length === 0 || showOffline) {
      fetchListings();
    }
  }, [showOffline, initialListings.length]);

  const sortedVisibleListings = useMemo(() => {
    const visible = listings.filter((l) => showOffline || !l.isoffline);
    return [...visible].sort((a, b) => {
      if (sortColumn === 'publishingdate') {
        const dateA = a.publishingdate ? new Date(a.publishingdate).getTime() : 0;
        const dateB = b.publishingdate ? new Date(b.publishingdate).getTime() : 0;
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortColumn === 'title') {
        return sortDirection === 'desc'
          ? b.title.toLowerCase().localeCompare(a.title.toLowerCase())
          : a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else {
        const columnA = a[sortColumn] as string;
        const columnB = b[sortColumn] as string;
        if (columnA === 'Gereserveerd' && columnB !== 'Gereserveerd') return 1;
        if (columnA !== 'Gereserveerd' && columnB === 'Gereserveerd') return -1;
        if (columnA === 'Gereserveerd' && columnB === 'Gereserveerd') return 0;
        const numA = parseFloat(columnA?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        const numB = parseFloat(columnB?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        return sortDirection === 'desc' ? numB - numA : numA - numB;
      }
    });
  }, [listings, showOffline, sortColumn, sortDirection]);

  const handleSort = (column: 'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice') => {
    if (sortColumn === column) setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIndicator = (column: 'publishingdate' | 'title' | 'currentprice' | 'previousprice' | 'firstprice') => {
    if (sortColumn === column) return sortDirection === 'desc' ? '↓' : '↑';
    return '';
  };

  const handleScrape = async () => {
    if (!url) {
      alert('Please enter a valid URL');
      return;
    }
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
      setListings((prev) => prev.filter((listing) => listing.id !== id));
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
      const updateResponse = await fetch('/api/update-listings');
      if (!updateResponse.ok) throw new Error(`HTTP error! Status: ${updateResponse.status}`);
      const updateData = await updateResponse.json();
      setListings(updateData.listings);
      setUpdateStats(updateData.stats);
      setShowStats(true);
      let message = `Update complete: ${updateData.stats.updated} listings updated`;
      if (updateData.stats.wentOffline > 0) message += `, ${updateData.stats.wentOffline} went offline`;
      if (updateData.stats.errors > 0) message += `, ${updateData.stats.errors} errors occurred`;
      setNotification({ message, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
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
    <div className="w-full p-4">
      <h1 className="text-center text-2xl font-bold mb-4">Marktplaats Scraper</h1>

      {notification && (
        <div className={`border-l-4 p-4 mb-4 rounded-md shadow-md ${
          notification.type === 'success' ? 'bg-green-100 border-green-400 text-green-800' :
          notification.type === 'error' ? 'bg-red-100 border-red-400 text-red-800' :
          'bg-blue-100 border-blue-400 text-blue-800'
        }`} role="alert">
          <div className="flex justify-between items-center">
            <p className="font-medium">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-gray-700" aria-label="Close notification">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {updateStats && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setShowStats(!showStats)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
            {showStats ? 'Hide Statistics' : 'Show Statistics'}
            <svg className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {updateStats && showStats && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4 relative">
          <button onClick={() => setShowStats(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" aria-label="Close statistics panel">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold mb-2">Update Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Total Processed</p>
              <p className="text-xl font-bold">{updateStats.totalProcessed}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Updated</p>
              <p className="text-xl font-bold text-green-600">{updateStats.updated}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Went Offline</p>
              <p className="text-xl font-bold text-yellow-600">{updateStats.wentOffline}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-sm text-gray-500">Errors</p>
              <p className="text-xl font-bold text-red-600">{updateStats.errors}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter Marktplaats URL" className="flex-1 border-2 border-gray-400 p-2 rounded-lg" />
        <div className="flex gap-2">
          <button onClick={handleScrape} className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2">Add Listing</button>
          <button onClick={handleUpdateListings} disabled={isUpdating} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{isUpdating ? 'Updating...' : 'Update All'}</button>
          <button onClick={() => setShowOffline(!showOffline)} className={`${showOffline ? 'bg-gray-500' : 'bg-gray-300'} text-white rounded-lg px-4 py-2`}>{showOffline ? 'Hide Offline' : 'Show Offline'}</button>
        </div>
      </div>

      {sortedVisibleListings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No listings found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 text-left">Image</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-300" onClick={() => handleSort('title')}>Title {getSortIndicator('title')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-300" onClick={() => handleSort('publishingdate')}>Published {getSortIndicator('publishingdate')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-300" onClick={() => handleSort('currentprice')}>Current {getSortIndicator('currentprice')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-300" onClick={() => handleSort('previousprice')}>Previous {getSortIndicator('previousprice')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-300" onClick={() => handleSort('firstprice')}>First {getSortIndicator('firstprice')}</th>
                <th className="p-2 text-left">Last Check</th>
                {showOffline && <th className="p-2 text-left">Status</th>}
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedVisibleListings.map((listing) => (
                <tr key={listing.id} className={`border-b ${listing.isoffline ? 'bg-red-50' : listing.currentprice === 'Gereserveerd' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <td className="p-2">
                    <Image width={75} height={50} src={listing.imageurl || 'https://placehold.co/600x400'} alt={listing.title} className="rounded-lg object-cover" unoptimized />
                  </td>
                  <td className="p-2">
                    <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{listing.title}</a>
                  </td>
                  <td className="p-2">{listing.publishingdate ? formatDate(listing.publishingdate) : 'N/A'}</td>
                  <td className="p-2 font-medium">{listing.currentprice}</td>
                  <td className="p-2">{listing.previousprice}</td>
                  <td className="p-2">{listing.firstprice}</td>
                  <td className="p-2">{formatDate(listing.lastcheck)}</td>
                  {showOffline && (
                    <td className="p-2">
                      {listing.isoffline ? (
                        <span className="text-red-600 font-medium">Offline</span>
                      ) : listing.currentprice === 'Gereserveerd' ? (
                        <span className="text-yellow-600 font-medium">Reserved</span>
                      ) : (
                        <span className="text-green-600 font-medium">Active</span>
                      )}
                    </td>
                  )}
                  <td className="p-2">
                    <button onClick={() => handleDelete(listing.id)} className="text-red-600 hover:text-red-800 font-bold hover:underline hover:text-2xl hover:cursor-pointer" title="Delete listing">×</button>
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