import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]/route";

// Middleware to check if user is authenticated
export async function checkAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized access. Authentication required." }, 
      { status: 401 }
    );
  }

  return null; // No error, continue with the request
} 