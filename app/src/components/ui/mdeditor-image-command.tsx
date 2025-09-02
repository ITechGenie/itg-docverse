import React, { useState, useRef } from 'react';
import { commands } from '@uiw/react-md-editor';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface ImageUploadCommandProps {
  onImageInsert?: (markdown: string) => void;
}

export const createImageUploadCommand = (props?: ImageUploadCommandProps): commands.ICommand => {
  return commands.group([], {
    name: 'image-upload',
    groupName: 'image-upload',
    icon: (
      <Upload size={12} />
    ),
    buttonProps: { 'aria-label': 'Upload or select image from gallery' },
    children: (handle) => {
      return <ImageUploadPopup handle={handle} {...props} />;
    },
    execute: () => {
      // This will be called by the popup component
    },
  });
};

interface ImageUploadPopupProps {
  handle: {
    close: () => void;
    execute: () => void;
    getState?: () => any;
  };
  onImageInsert?: (markdown: string) => void;
}

interface ImageFile {
  id: string;
  filename: string;
  original_filename: string;
  title: string;
  url: string;
  content_type: string;
  file_size: number;
  visibility: string;
  tags: string[];
}

function ImageUploadPopup({ handle }: ImageUploadPopupProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');
  const [existingImages, setExistingImages] = useState<ImageFile[]>([]);
  const [hasLoadedImages, setHasLoadedImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('visibility', 'public');
      formData.append('tags', JSON.stringify(['uploaded-from-editor']));

      const response = await api.uploadImage(formData);
      
      if (!response.success || !response.data) {
        throw new Error('Upload failed');
      }
      
      // Insert the image markdown
      const imageMarkdown = `![${response.data.title}](${response.data.url})\n`;
      insertImageAndClose(imageMarkdown);
      toast.success('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const loadExistingImages = async () => {
    if (hasLoadedImages) return;
    
    setIsLoadingImages(true);
    try {
      const response = await api.getMyImages({ limit: 20 });
      if (response.success && response.data) {
        setExistingImages(
          (response.data.files || []).map((file: any) => ({
            ...file,
            original_filename: file.original_filename ?? file.filename,
          }))
        );
        setHasLoadedImages(true);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error('Failed to load existing images');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleTabChange = (tab: 'upload' | 'gallery') => {
    setActiveTab(tab);
    if (tab === 'gallery' && !hasLoadedImages) {
      loadExistingImages();
    }
  };

  const handleImageSelect = (image: ImageFile) => {
    const imageMarkdown = `![${image.title}](${image.url})\n`;
    insertImageAndClose(imageMarkdown);
  };

  const insertImageAndClose = (markdown: string) => {
    // Emit the markdown to be inserted
    if (window.insertMarkdownCallback) {
      window.insertMarkdownCallback(markdown);
    }
    // Close the popup
    handle.close();
  };

  const handleClose = () => {
    // Simply close without any API calls
    handle.close();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[400px] max-w-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Insert Image
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0"
        >
          <X size={12} />
        </Button>
      </div>

      {/* Tab selector */}
      <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'upload'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleTabChange('upload')}
        >
          Upload New
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ml-4 ${
            activeTab === 'gallery'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleTabChange('gallery')}
        >
          Select Existing
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click to select an image file to upload
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={handleBrowseClick}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Choose File'
              )}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-4">
          {isLoadingImages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2 text-sm text-gray-600">Loading images...</span>
            </div>
          ) : existingImages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No images uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {existingImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer border rounded-lg overflow-hidden hover:border-blue-500"
                  onClick={() => handleImageSelect(image)}
                >
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 text-center px-1">
                      {image.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Global callback for inserting markdown
declare global {
  interface Window {
    insertMarkdownCallback?: (markdown: string) => void;
  }
}
