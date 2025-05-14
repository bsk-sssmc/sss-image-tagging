'use client';

import FileUpload from '../components/FileUpload';

const UploadsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Upload Images</h1>
      <FileUpload />
    </div>
  );
};

export default UploadsPage; 