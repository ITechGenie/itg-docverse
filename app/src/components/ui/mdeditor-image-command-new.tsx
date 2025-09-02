import React, { useState, useRef } from 'react';
import { commands } from '@uiw/react-md-editor';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

// Global callbacks for MDEditor integration
declare global {
  interface Window {
    insertMarkdownCallback?: (markdown: string) => void;
    showImageUploadDialog?: () => void;
  }
}

export const createImageUploadCommand = (): commands.ICommand => {
  return {
    name: 'image-upload-new',
    keyCommand: 'image-upload-new',
    buttonProps: { 'aria-label': 'Upload or select image from gallery' },
    icon: (
      <Upload size={12} />
    ),
    execute: (_state, _api) => {
      // Trigger the image upload dialog
      console.log('Image upload command executed!');
      if (window.showImageUploadDialog) {
        window.showImageUploadDialog();
      } else {
        console.error('showImageUploadDialog not found on window');
      }
    },
  };
};

// Standalone Image Upload Dialog Component
interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageInsert?: (markdown: string) => void;
}

interface ImageFile {
  id: string;
  filename: string;
  title: string;
  url: string;
  content_type: string;
  file_size: number;
  visibility: string;
  tags: string[];
}

export function ImageUploadDialog({ open, onOpenChange, onImageInsert }: ImageUploadDialogProps) {
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
      
      // Use the URL provided by the backend API (now includes filename)
      const imageMarkdown = `![${response.data.title}](${response.data.url})`;
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
        setExistingImages(response.data.files || []);
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
    // Use the URL provided by the backend API
    const imageMarkdown = `![${image.title}](${image.url})`;
    insertImageAndClose(imageMarkdown);
  };

  const insertImageAndClose = (markdown: string) => {
    // Close the dialog first
    onOpenChange(false);
    
    // Then emit the markdown to be inserted
    setTimeout(() => {
      if (onImageInsert) {
        onImageInsert(markdown);
      } else if (window.insertMarkdownCallback) {
        window.insertMarkdownCallback(markdown);
      }
    }, 100);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        
        {/* Tab selector */}
        <div className="flex mb-4 border-b border-border">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange('upload')}
          >
            Upload New Image
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ml-6 transition-colors ${
              activeTab === 'gallery'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange('gallery')}
          >
            Select from Gallery
          </button>
        </div>

        {/* Content area */}
        <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-foreground mb-2">
                  Choose an image to upload
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Supports JPG, PNG, GIF, WebP, SVG, and BMP formats
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
                  variant="default"
                  size="lg"
                  disabled={isUploading}
                  onClick={handleBrowseClick}
                  className="px-8"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading your images...</span>
                </div>
              ) : existingImages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">No images found</p>
                  <p className="text-sm">Upload some images first to see them here</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click on any image to insert it into your post
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {existingImages.map((image) => (
                      <div
                        key={image.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary hover:bg-muted/50 cursor-pointer transition-all duration-200"
                        onClick={() => handleImageSelect(image)}
                      >
                        <div className="flex-shrink-0">
                          <img
                            src={image.url}
                            alt={image.title}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {image.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(image.file_size / 1024).toFixed(1)} KB • {image.content_type}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary">+</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Global callback for inserting markdown
declare global {
  interface Window {
    insertMarkdownCallback?: (markdown: string) => void;
  }
}
