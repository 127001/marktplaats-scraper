import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkAuth } from '../middleware';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function DELETE(request: Request) {
  // Check if user is authenticated
  const authError = await checkAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    await client.query('DELETE FROM listings WHERE id = $1', [id]);
    client.release();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
