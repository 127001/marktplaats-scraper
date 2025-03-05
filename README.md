# Marktplaats Scraper

This is a Next.js application that allows users to scrape and track advertisements from [Marktplaats.nl](https://www.marktplaats.nl). The app fetches details like the title, price, image, and publishing date of ads, stores them in a PostgreSQL database, and provides a user interface to view and manage the listings.

## Features

- **Scrape Ads**: Enter a Marktplaats URL to scrape and store ad details.
- **Update Listings**: Automatically update all listings twice a day using a cron job.
- **Delete Listings**: Remove unwanted listings from the database.
- **Highlight Reserved Ads**: Ads marked as "Gereserveerd" are highlighted in the table.
- **Offline Detection**: Ads that go offline are marked and no longer updated.
- **Publishing Date**: Track the publishing date of each ad.

## Technologies Used

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (hosted on Neon)
- **Web Scraping**: Axios, Cheerio
- **Cron Jobs**: Vercel Cron Jobs
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

1. **Node.js**: Ensure you have Node.js installed. Download it from [here](https://nodejs.org/).
2. **PostgreSQL Database**: Set up a PostgreSQL database (e.g., using [Neon](https://neon.tech/)).
3. **Environment Variables**: Create a `.env` file in the root directory with the following variables:

   ```env
   DATABASE_URL="your-postgres-connection-string"
    ```

### Installation

1. **Clone the repository**:

  ```bash
  git clone https://github.com/your-username/marktplaats-scraper.git
  cd marktplaats-scraper
  ```
2. ** Install dependencies**:

  ```bash
  npm install
  ```
3. **Run the development server**:

  ```bash
  npm run dev
  ```

### Database Schema

The app uses the following database schema:

```sql
CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  currentPrice TEXT NOT NULL,
  previousPrice TEXT DEFAULT 'N/A',
  firstPrice TEXT NOT NULL,
  lastCheck TIMESTAMP NOT NULL,
  imageurl TEXT,
  publishingDate TIMESTAMP,
  isOffline BOOLEAN DEFAULT FALSE
);
```

### Cron Job

The app uses Vercel Cron Jobs to update all listings once a day (limited to free usage). The cron job is configured in the ```vercel.json``` file. It runs at 12:00 every day and updates all listings in the database.

## Usage

### Scrape a New Ad

1. Enter the Marktplaats URL in the input field.
2. Click **Scrape Data**.
3. The ad details will be added to the table.

### Update Listings

1. Click **Update Listings** to manually update all ads.
2. The app will scrape the latest data and update the table.

### Delete a Listing

1. Click the **X** button next to a listing.
2. Confirm the deletion in the dialog.
3. The listing will be removed from the table and the database.

### View Listings

The table displays the following details for each ad:

- Title: The title of the ad.
- Current Price: The current price of the item.
- Previous Price: The previous price (if the price has changed).
- First Price: The initial price when the ad was first scraped.
- Last Check: The last time the ad was updated.
- Publishing Date: The date the ad was published.
- Action: Delete the listing.

## Deployment

The app is deployed on [Vercel](https://vercel.com). To deploy your own version:

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add the ```DATABASE_URL``` environment variable in the Vercel dashboard.
4. Deploy the app.

## License

This project is licensed under the MIT License. See the LICENSE file for details.