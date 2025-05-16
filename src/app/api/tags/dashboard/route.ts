import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'desc';
    const userFilter = searchParams.get('user') || '';

    // Build the query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort: `createdAt:${sort}`,
      'populate[location]': 'true',
      'populate[occasion]': 'true',
      'populate[personTags.personId]': 'true',
      'populate[createdBy]': 'true',
    });

    if (userFilter) {
      queryParams.append('where[createdBy.displayName][$regex]', userFilter);
      queryParams.append('where[createdBy.displayName][$options]', 'i');
    }

    // Get the base URL from the request
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Fetch tags using the same endpoint as homepage
    const response = await fetch(`${baseUrl}/api/image-tags?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }

    const data = await response.json();

    return NextResponse.json({
      tags: data.docs,
      total: data.totalDocs,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
} 