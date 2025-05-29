'use client';

import React, { useEffect, useState } from 'react';
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

interface Image {
  id: string;
  url: string;
}

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const _albumId = searchParams.get('album');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);
  const [showAllImages, setShowAllImages] = useState(true);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalImages, setTotalImages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [albumsResponse, imagesResponse] = await Promise.all([
          fetch('/api/albums'),
          fetch(`/api/images?page=${currentPage}&limit=${itemsPerPage}`)
        ]);
        const albumsData = await albumsResponse.json();
        const imagesData = await imagesResponse.json();
        setAlbums(albumsData.docs);
        setAllImages(imagesData.docs);
        setTotalImages(imagesData.totalDocs);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, itemsPerPage]);

  // Create a map of unique images from albums
  const uniqueImagesMap = albums.reduce((acc: Map<string, UniqueImage>, album: Album) => {
    album.images.forEach((image: { id: string; url: string }) => {
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

  const uniqueImages = Array.from(uniqueImagesMap.values()) as UniqueImage[];

  const filteredImages = allImages.filter((image: Image) => {
    const matchesSearch = image.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlbum = selectedAlbums.length === 0 || 
      uniqueImages.find(uniqueImage => uniqueImage.id === image.id)?.albumIds.some(
        (albumId: string) => selectedAlbums.includes(albumId)
      );
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="sidebar-input"
          />
        </div>

        <div className="sidebar-section">
          <h3>Filter by Album</h3>
          <div className="album-filters">
            {albums.map((album: Album) => (
              <label key={album.id} className="album-filter">
                <input
                  type="checkbox"
                  checked={selectedAlbums.includes(album.id)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked) {
                      setSelectedAlbums([...selectedAlbums, album.id]);
                    } else {
                      setSelectedAlbums(selectedAlbums.filter((id: string) => id !== album.id));
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
          {filteredImages.map((image: Image) => (
            <Link
              key={image.id}
              href={`/tag/${image.id}`}
              className="gallery-card"
            >
              <Image
                src={image.url}
                alt="Gallery image"
                width={300}
                height={300}
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            </Link>
          ))}
        </div>

        {/* Add pagination controls */}
        <div className="pagination-controls">
          <div className="pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalImages)} of {totalImages} images
          </div>
          <div className="pagination-buttons">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {currentPage} of {Math.ceil(totalImages / itemsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalImages / itemsPerPage)))}
              disabled={currentPage >= Math.ceil(totalImages / itemsPerPage)}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 