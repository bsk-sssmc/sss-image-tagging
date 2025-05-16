'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Album {
  id: string;
  name: string;
  images: {
    id: string;
    url: string;
  }[];
}

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const albumId = searchParams.get('album');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (albumId) {
          // Fetch single album
          const response = await fetch(`/api/albums/${albumId}`);
          const data = await response.json();
          setCurrentAlbum(data);
        } else {
          // Fetch all albums
          const response = await fetch('/api/albums');
          const data = await response.json();
          setAlbums(data.docs);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [albumId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="gallery-container">
      <h1 className="gallery-heading">
        {albumId ? currentAlbum?.name : 'Gallery'}
      </h1>

      {albumId ? (
        // Display images in the selected album
        <div className="gallery-grid">
          {currentAlbum?.images.map((image) => (
            <Link
              key={image.id}
              href={`/tag/${image.id}`}
              className="gallery-card"
            >
              <img
                src={image.url}
                alt="Album image"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      ) : (
        // Display album cards
        <div className="gallery-grid">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/gallery?album=${album.id}`}
              className="gallery-card"
            >
              {album.images[0] && (
                <img
                  src={album.images[0].url}
                  alt={album.name}
                  loading="lazy"
                />
              )}
              <div className="gallery-card-overlay">
                <h2 className="gallery-card-title">{album.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 