import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const payload = await getPayload({
      config: configPromise,
    })

    const image = await payload.findByID({
      collection: 'images',
      id: params.id,
    })

    if (!image) {
      return Response.json({ error: 'Image not found' }, { status: 404 })
    }

    return Response.json(image)
  } catch (error) {
    console.error('Error fetching image:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 