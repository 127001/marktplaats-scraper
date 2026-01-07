# Marktplaats Scraper

This is a Next.js application that allows users to scrape and track advertisements from [Marktplaats.nl](https://www.marktplaats.nl). The app fetches details like the title, price, image, and publishing date of ads, stores them in a PostgreSQL database, and provides a user interface to view and manage the listings.

## Features

- **Google Authentication**: Secure access with Google OAuth and email allowlist
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
   NEXTAUTH_SECRET="your-secret-here"
   AUTH_TRUST_HOST=true
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   AUTHORIZED_EMAILS="jarno.de.wit@gmail.com"
   ```

### Installation

1. **Clone the repository**:

  ```bash
  git clone https://github.com/your-username/marktplaats-scraper.git
  cd marktplaats-scraper
  ```
2. **Install dependencies**:

  ```bash
  pnpm install
  ```
3. **Set up the database schema**: The app uses JWT sessions (no database tables required for authentication). However, if you want to store user data in the database, you can optionally run:

   ```bash
   # Connect to your PostgreSQL database and run:
   psql $DATABASE_URL -f docs/database-schema.sql
   ```

   Note: This is optional as the app currently uses JWT sessions stored in cookies. See [docs/database-schema.sql](docs/database-schema.sql) for the schema.

4. **Run the development server**:

  ```bash
  pnpm run dev
  ```

### Database Schema

The app uses the following database schema:

**Listings table:**
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

**Note**: The app uses JWT sessions (stored in cookies) for compatibility with Edge runtime middleware. The database schema file includes tables for database sessions, but they are not required for the current JWT-based implementation.

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

## Authentication

The app uses Google OAuth for authentication. Only email addresses listed in the `AUTHORIZED_EMAILS` environment variable can access the application.

### Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env` file

### Adding Authorized Users

Add email addresses to the `AUTHORIZED_EMAILS` environment variable (comma-separated):

```env
AUTHORIZED_EMAILS="user1@example.com,user2@example.com"
```

## Deployment

The app is deployed on [Vercel](https://vercel.com). To deploy your own version:

### Prerequisites

1. **GitHub Repository**: Push your code to a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you haven't already

### Step-by-Step Deployment

1. **Connect Repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Configure Environment Variables**:
   In Vercel Project Settings → Environment Variables, add:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Same secret as local (or generate new: `openssl rand -base64 32`)
   - `AUTH_TRUST_HOST` - Set to `true` (required for Vercel)
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
   - `AUTHORIZED_EMAILS` - Comma-separated emails (e.g., `user1@example.com,user2@example.com`)

3. **Update Google OAuth Settings**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to your OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
   - If using a custom domain, also add: `https://your-custom-domain.com/api/auth/callback/google`

4. **Deploy**:
   - Click "Deploy" in Vercel
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Post-Deployment

- **Test Authentication**: Visit your site and test Google sign-in
- **Verify Cron Job**: Check Vercel logs to ensure the daily update job runs (configured in `vercel.json`)
- **Monitor**: Check Vercel dashboard for any errors or issues

### Custom Domain (Optional)

1. In Vercel Project Settings → Domains
2. Add your custom domain
3. Update Google OAuth redirect URI to include your custom domain
4. Update DNS records as instructed by Vercel