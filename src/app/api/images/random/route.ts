import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Store the list of shown image IDs in memory
let shownImageIds: string[] = [];
let allImages: any[] = [];

export async function GET() {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    // If we haven't loaded all images yet or if we've shown all images
    if (allImages.length === 0 || shownImageIds.length >= allImages.length) {
      // Reset the shown images list
      shownImageIds = [];
      
      // Get all images
      const { docs } = await payload.find({
        collection: 'images',
        limit: 1000, // Adjust this based on your needs
      })

      if (docs.length === 0) {
        return Response.json({ error: 'No images found' }, { status: 404 })
      }

      // Store all images
      allImages = docs;
    }

    // Filter out already shown images
    const availableImages = allImages.filter(img => !shownImageIds.includes(img.id));
    
    // Get a random image from available images
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const randomImage = availableImages[randomIndex];
    
    // Add the selected image ID to shown images
    shownImageIds.push(randomImage.id);

    return Response.json(randomImage)
  } catch (error) {
    console.error('Error fetching random image:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 