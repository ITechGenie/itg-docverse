import React, { useState } from 'react';
import { commands } from '@uiw/react-md-editor';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from './button';
import { apiClient } from '@/lib/api-client';
import { ImageGalleryModal } from './image-gallery-modal';

interface ImageUploadCommandProps {
  onImageInsert?: (markdown: string) => void;
}

export const createImageUploadCommand = (props?: ImageUploadCommandProps): commands.ICommand => {
  return commands.group([], {
    name: 'image-upload',
    groupName: 'image-upload',
    icon: (
      <ImageIcon size={12} />
    ),
    buttonProps: { 'aria-label': 'Upload or select image' },
    children: (handle) => {
      return <ImageUploadPopup handle={handle} {...props} />;
    },
    execute: (state: commands.TextState, api: commands.TextApi) => {
      // This will be called by the popup component
    },
  });
};

interface ImageUploadPopupProps {
  handle: {
    close: () => void;
    execute: () => void;
    getState?: () => commands.TextState;
  };
  onImageInsert?: (markdown: string) => void;
}

function ImageUploadPopup({ handle }: ImageUploadPopupProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');

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

      const response = await apiClient.uploadFile(formData);
      
      // Insert the image markdown
      const imageMarkdown = `![${response.title}](/api/files/${response.id})\n`;
      insertImageAndClose(imageMarkdown);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (imageUrl: string, title: string) => {
    const imageMarkdown = `![${title}](${imageUrl})\n`;
    insertImageAndClose(imageMarkdown);
  };

  const insertImageAndClose = (markdown: string) => {
    // Get current state and insert the markdown
    const state = handle.getState?.() || { selectedText: '', text: '', selection: { start: 0, end: 0 } };
    
    // Create a temporary API object to insert text
    const tempApi = {
      replaceSelection: (text: string) => {
        // We'll need to pass this back to the parent component
        console.log('Inserting markdown:', text);
        // For now, just close - the parent will handle insertion
      }
    };

    handle.close();
    
    // Emit the markdown to be inserted
    if (window.insertMarkdownCallback) {
      window.insertMarkdownCallback(markdown);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Insert Image
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handle.close}
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
          onClick={() => setActiveTab('upload')}
        >
          Upload New
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ml-4 ${
            activeTab === 'gallery'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('gallery')}
        >
          Select Existing
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload an image file
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                className="pointer-events-none"
              >
                {isUploading ? 'Uploading...' : 'Choose File'}
              </Button>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select from your uploaded images:
          </p>
          <ImageGalleryModal
            isOpen={true}
            onClose={() => {}}
            onImageSelect={handleImageSelect}
            embedded={true}
          />
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
