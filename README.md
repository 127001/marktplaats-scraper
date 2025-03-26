# Marktplaats Scraper

This is a Next.js application that allows users to scrape and track advertisements from [Marktplaats.nl](https://www.marktplaats.nl). The app fetches details like the title, price, image, and publishing date of ads, stores them in a PostgreSQL database, and provides a user interface to view and manage the listings.

## Features

- **Scrape Ads**: Enter a Marktplaats URL to scrape and store ad details.
- **Update Listings**: Automatically update all listings twice a day using a cron job.
- **Delete Listings**: Remove unwanted listings from the database.
- **Highlight Reserved Ads**: Ads marked as "Gereserveerd" are highlighted in the table.
- **Offline Detection**: Ads that go offline are marked and no longer updated.
- **Publishing Date**: Track the publishing date of each ad.
- **Track Price Changes**: Monitor price changes for each ad.
- **Sort Listings**: Sort ads by title, published date, or price.
- **Filter Listings**: Show or hide offline ads.
- **Google Authentication**: Restrict admin actions to specific users.

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
3. **Google Cloud Account**: Create a Google Cloud account (if not already created).

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
3. **Set up environment variables**:

  Copy the example environment file and update it with your values:
  ```bash
  cp env.example .env
  ```
  
  Then edit the `.env` file with your actual values:
  ```env
  # Database connection
  DATABASE_URL="your-postgres-connection-string"
  
  # Google OAuth
  GOOGLE_CLIENT_ID=your-google-client-id
  GOOGLE_CLIENT_SECRET=your-google-client-secret
  ALLOWED_EMAIL=your-email@gmail.com
  
  # NextAuth 
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=your-nextauth-secret-key
  ```

  You can generate a secure NEXTAUTH_SECRET by running: `openssl rand -base64 32`

### Google Authentication Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials** and select **OAuth Client ID**
5. Select **Web Application** as the application type
6. Set the following:
   - Name: `Marktplaats Scraper` (or any name you prefer)
   - Authorized JavaScript origins: `http://localhost:3000` (and your production URL if applicable)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (and your production redirect URL)
7. Click **Create** to generate your Client ID and Client Secret
8. Copy these values to your `.env` file

## Running the Application

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

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

## Authentication Features

This application implements Google SSO authentication with two user types:

1. **Public users**: Can view listings and filter/sort them
2. **Authenticated users**: Can perform admin actions such as:
   - Adding new listings
   - Updating existing listings
   - Deleting listings

By default, anyone with a Google account can authenticate. To restrict access to specific users:

Set the `ALLOWED_EMAIL` environment variable in your `.env` file:
```
ALLOWED_EMAIL=your-email@gmail.com
```

This will restrict authentication to only allow the specified email address. If this variable is not set, the application will allow any Google account to sign in.

Alternatively, you can modify the authentication logic directly:
1. Open `src/app/api/auth/[...nextauth]/route.ts`
2. Customize the `signIn` callback to implement your own access rules.

## Deployment

The app is deployed on [Vercel](https://vercel.com). To deploy your own version:

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add the required environment variables in the Vercel dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `NEXTAUTH_SECRET`: A random string used to encrypt cookies
   - `NEXTAUTH_URL`: Your production URL (e.g., https://your-app.vercel.app)
   - `ALLOWED_EMAIL`: Email address allowed to access admin features (optional)
4. Deploy the app.

## License

This project is licensed under the MIT License.