import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    // Get the current user from the request context
    const users = await payload.find({
      collection: 'users',
      where: {
        id: {
          exists: true
        }
      },
      depth: 0,
      limit: 1,
    })

    const currentUser = users.docs[0]
    console.log('Currently authenticated user:', currentUser)

    if (!currentUser) {
      return NextResponse.json(
        { message: 'You must be logged in to post a comment' },
        { status: 401 }
      )
    }

    const body = await req.json()
    console.log('Received request body:', body)
    
    // Validate required fields
    if (!body.commentText || !body.image) {
      console.log('Missing required fields:', { commentText: !!body.commentText, image: !!body.image })
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate image ID format
    try {
      console.log('Validating image ID:', body.image)
      if (!/^[0-9a-fA-F]{24}$/.test(body.image)) {
        throw new Error('Invalid image ID format')
      }
    } catch (error) {
      console.error('Invalid image ID format:', error)
      return NextResponse.json(
        { message: 'Invalid image ID format' },
        { status: 400 }
      )
    }

    // Create the comment using Payload's Local API
    console.log('Creating comment with data:', {
      commentText: body.commentText,
      image: body.image,
      parentComment: body.parentComment,
      depth: body.depth || 0,
    })

    // Validate parent comment if provided
    if (body.parentComment?.value) {
      try {
        const parentComment = await payload.findByID({
          collection: 'comments',
          id: body.parentComment.value,
        });
        
        if (!parentComment) {
          console.error('Parent comment not found:', body.parentComment.value);
          return NextResponse.json(
            { message: 'Parent comment not found' },
            { status: 400 }
          );
        }
        
        console.log('Found parent comment:', parentComment);
      } catch (error) {
        console.error('Error validating parent comment:', error);
        return NextResponse.json(
          { message: 'Invalid parent comment' },
          { status: 400 }
        );
      }
    }

    const comment = await payload.create({
      collection: 'comments',
      data: {
        commentText: body.commentText,
        image: body.image,
        commentBy: currentUser.id, // Use the current user's ID
        parentComment: body.parentComment || null,
        depth: body.depth || 0,
        commentUpvotes: 0,
        commentDownvotes: 0,
      },
    })

    console.log('Created comment:', comment)
    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('where[image][equals]')
    const depth = searchParams.get('depth')
    const sort = searchParams.get('sort')

    if (!imageId) {
      return NextResponse.json(
        { message: 'Image ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching comments for image:', imageId);

    const comments = await payload.find({
      collection: 'comments',
      where: {
        image: {
          equals: imageId,
        },
      },
      depth: depth ? parseInt(depth) : 2, // Ensure we get at least the parent comment
      sort: sort || '-createdAt',
      populate: {
        parentComment: true,
        commentBy: true
      }
    })

    console.log('Fetched comments:', comments);

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    // Log request URL and details
    console.log('PATCH request URL:', req.url);
    
    // Get the content type from headers
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let body;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data
      const formData = await req.formData();
      const jsonData = formData.get('_payload');
      if (typeof jsonData === 'string') {
        try {
          body = JSON.parse(jsonData);
        } catch (parseError) {
          console.error('Error parsing form data JSON:', parseError);
          return NextResponse.json(
            { message: 'Invalid JSON in form data' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { message: 'No JSON data found in form data' },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON data
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      try {
        body = JSON.parse(bodyText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return NextResponse.json(
          { message: `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` },
          { status: 400 }
        );
      }
    }
    
    console.log('Parsed body:', body);

    // Extract where conditions from URL if not in body
    const url = new URL(req.url);
    let where;
    
    // Check for where conditions in URL parameters
    const whereParams: Record<string, any> = {};
    
    // Log all URL parameters for debugging
    console.log('All URL parameters:');
    for (const [key, value] of url.searchParams.entries()) {
      console.log(`${key}: ${value}`);
    }

    // Special handling for the specific format we're receiving
    const whereAnd = url.searchParams.get('where[and][1][id][not_equals]');
    if (whereAnd) {
      where = {
        and: [
          {
            id: {
              not_equals: whereAnd
            }
          }
        ]
      };
    } else {
      // Fallback to parsing other where parameters
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith('where')) {
          // Remove 'where' prefix and parse the remaining path
          const path = key.replace('where', '').replace(/^\[|\]$/g, '');
          const parts = path.split('][').map(part => part.replace(/[\[\]]/g, ''));
          
          // Build the where object
          let current: Record<string, any> = whereParams;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          current[parts[parts.length - 1]] = value;
        }
      }
      
      if (Object.keys(whereParams).length > 0) {
        where = whereParams;
      }
    }

    // If we still don't have where conditions, try to get them from body
    if (!where || Object.keys(where).length === 0) {
      where = body.where;
    }

    // If body is just a direct update object, wrap it in data
    const data = body.data || body;

    console.log('Final where conditions:', where);
    console.log('Final update data:', data);

    if (!where || Object.keys(where).length === 0) {
      console.error('Missing where conditions');
      return NextResponse.json(
        { message: 'Missing where conditions. Please provide where conditions either in the URL or in the request body.' },
        { status: 400 }
      );
    }

    if (!data || Object.keys(data).length === 0) {
      console.error('Missing data to update');
      return NextResponse.json(
        { message: 'Missing data to update. Please provide the fields you want to update.' },
        { status: 400 }
      );
    }

    console.log('Updating comments with where:', where, 'and data:', data);

    // Update all matching comments
    const result = await payload.update({
      collection: 'comments',
      where,
      data,
    })

    console.log('Update result:', result);
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating comments:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update comments' },
      { status: 500 }
    )
  }
} 