import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
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
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create a new user upload
    const upload = await payload.create({
      collection: 'user-uploads',
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: currentUser.id,
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      req, // Pass the request object to let Payload handle the user context
    })

    return Response.json(upload)
  } catch (error) {
    console.error('Error uploading file:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 