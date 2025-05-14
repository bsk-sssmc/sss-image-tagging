'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiX, FiUpload, FiFile, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface ExtendedFile extends File {
  path?: string;
  relativePath?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  originalSize: number;
  uploadStatus?: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  thumbnail?: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
};

const FileUpload = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileName = (file: File): string => {
    if (!file) return 'Untitled File';
    
    if (file.name) {
      const name = file.name.trim();
      if (name) return name;
    }
    
    if ('path' in file && typeof file.path === 'string') {
      const pathParts = file.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName) return fileName;
    }
    
    if ('relativePath' in file && typeof file.relativePath === 'string') {
      const pathParts = file.relativePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      if (fileName) return fileName;
    }
    
    return 'Untitled File';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
      return '0 Bytes';
    }
    
    const size = Number(bytes);
    if (size === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    
    return `${parseFloat((size / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    const filesWithPreview = selectedFiles.map(file => {
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
        originalSize: file.size,
        uploadStatus: 'uploading'
      });
      return fileWithPreview;
    });

    setFiles(prev => [...prev, ...filesWithPreview]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const handleUpload = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsUploading(true);
    const newUploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      const tempId = Math.random().toString(36).substring(7);
      newUploadedFiles.push({
        id: tempId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: '',
        status: 'uploading'
      });

      try {
        const response = await fetch('/api/user-uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        const index = newUploadedFiles.findIndex(f => f.id === tempId);
        if (index !== -1) {
          newUploadedFiles[index] = {
            ...data,
            status: 'success',
            thumbnail: data.url
          };
        }
      } catch (error) {
        const index = newUploadedFiles.findIndex(f => f.id === tempId);
        if (index !== -1) {
          newUploadedFiles[index].status = 'error';
          newUploadedFiles[index].error = 'Upload failed';
        }
      }
    }

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    setFiles([]);
    setIsUploading(false);

    // Clean up object URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: ExtendedFile[]) => {
      const newFiles = acceptedFiles.map(file => {
        const fileName = getFileName(file);
        return Object.assign(file, {
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substring(7),
          originalSize: file.size,
          uploadStatus: 'uploading'
        });
      });
      
      setFiles(prev => [...prev, ...newFiles]);
    },
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  if (!user) {
    return (
      <div className="file-upload-container">
        <div className="auth-error">
          Please log in to upload files.
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
      >
        <input {...getInputProps()} />
        <FiUpload className="upload-icon" />
        <p className="dropzone-text">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag and drop files here, or click to select files'}
        </p>
        <p className="dropzone-subtext">
          Supported formats: PNG, JPG, WebP, TIFF, BMP, GIF (Max 10MB)
        </p>
      </div>

      {files.length > 0 && (
        <div className="files-list">
          <h3 className="files-list-title">Selected Files</h3>
          <div className="files-grid">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  {file.type.startsWith('image/') && file.preview && (
                    <div className="file-thumbnail">
                      <img src={file.preview} alt={file.name} />
                    </div>
                  )}
                  <div className="file-details">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{formatFileSize(file.originalSize)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="remove-file-button"
                >
                  <FiX className="remove-icon" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`upload-button ${isUploading ? 'uploading' : ''}`}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="files-list">
          <h3 className="files-list-title">Uploaded Files</h3>
          <div className="files-grid">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  {file.thumbnail && (
                    <div className="file-thumbnail">
                      <img src={file.thumbnail} alt={file.fileName} />
                    </div>
                  )}
                  <div className="file-details">
                    <p className="file-name">{file.fileName}</p>
                    <p className="file-size">{formatFileSize(file.fileSize)}</p>
                    <p className={`file-status ${file.status}`}>
                      {file.status === 'success' ? 'Uploaded successfully' : 
                       file.status === 'error' ? file.error : 'Uploading...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeUploadedFile(file.id)}
                  className="remove-file-button"
                >
                  <FiX className="remove-icon" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 