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