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
    tags?: string[];
    date?: string;
  }[];
}

interface UniqueImage {
  id: string;
  url: string;
  albumIds: string[];
  albumNames: string[];
}

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const albumId = searchParams.get('album');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/albums');
        const data = await response.json();
        setAlbums(data.docs);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create a map of unique images
  const uniqueImagesMap = albums.reduce((acc: Map<string, UniqueImage>, album) => {
    album.images.forEach(image => {
      if (!acc.has(image.url)) {
        acc.set(image.url, {
          id: image.id,
          url: image.url,
          albumIds: [album.id],
          albumNames: [album.name]
        });
      } else {
        const existingImage = acc.get(image.url)!;
        if (!existingImage.albumIds.includes(album.id)) {
          existingImage.albumIds.push(album.id);
          existingImage.albumNames.push(album.name);
        }
      }
    });
    return acc;
  }, new Map());

  const uniqueImages = Array.from(uniqueImagesMap.values());

  const filteredImages = uniqueImages.filter((image) => {
    const matchesSearch = image.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlbum = selectedAlbums.length === 0 || 
      image.albumIds.some((albumId: string) => selectedAlbums.includes(albumId));
    return matchesSearch && matchesAlbum;
  });

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="gallery-layout">
      <aside className="gallery-sidebar">
        <div className="sidebar-section">
          <h3>Search</h3>
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sidebar-input"
          />
        </div>

        <div className="sidebar-section">
          <h3>Albums</h3>
          <div className="album-filters">
            {albums.map((album) => (
              <label key={album.id} className="album-filter">
                <input
                  type="checkbox"
                  checked={selectedAlbums.includes(album.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAlbums([...selectedAlbums, album.id]);
                    } else {
                      setSelectedAlbums(selectedAlbums.filter(id => id !== album.id));
                    }
                  }}
                />
                {album.name}
                <span className="album-count">({album.images.length})</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <main className="gallery-main">
        <h1 className="gallery-heading">Gallery</h1>

        <div className="gallery-grid">
          {filteredImages.map((image) => (
            <Link
              key={image.id}
              href={`/tag/${image.id}`}
              className="gallery-card"
            >
              <img
                src={image.url}
                alt="Gallery image"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
} 