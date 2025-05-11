import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
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
        { message: 'You must be logged in to vote' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { voteType, previousVote, voteChange } = body // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { message: 'Invalid vote type' },
        { status: 400 }
      )
    }

    // Get the current comment
    const comment = await payload.findByID({
      collection: 'comments',
      id,
    })

    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      )
    }

    // Calculate new vote counts based on the vote change
    const newUpvotes = comment.commentUpvotes + (voteType === 'upvote' ? 1 : 0);
    const newDownvotes = comment.commentDownvotes + (voteType === 'downvote' ? 1 : 0);

    // Update the comment with the new vote count and user's vote
    const updatedComment = await payload.update({
      collection: 'comments',
      id,
      data: {
        commentUpvotes: newUpvotes,
        commentDownvotes: newDownvotes,
        userVote: voteType, // Store the user's vote
      },
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error voting on comment:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to vote on comment' },
      { status: 500 }
    )
  }
} 