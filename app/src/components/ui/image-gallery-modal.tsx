import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { Search, Loader2, Upload, ImageIcon } from 'lucide-react';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

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

interface ImageGalleryModalProps {
  onImageSelected: (url: string, alt?: string) => void;
  children: React.ReactNode;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  onImageSelected,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');

  const itemsPerPage = 12;

  // Fetch user's images
  const fetchImages = async (page = 1, search = '', visibility = 'all') => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: itemsPerPage
      };
      
      if (search) params.search = search;
      if (visibility !== 'all') params.visibility = visibility;

      const response = await api.getMyImages(params);
      
      if (response.success && response.data) {
        setImages(response.data.files || []);
        setTotalImages(response.data.total || 0);
      } else {
        toast.error('Failed to load images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  // Load images when modal opens or search/filter changes
  useEffect(() => {
    if (isOpen) {
      fetchImages(currentPage, searchQuery, selectedVisibility);
    }
  }, [isOpen, currentPage, searchQuery, selectedVisibility]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        setCurrentPage(1);
        fetchImages(1, searchQuery, selectedVisibility);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleImageSelect = (image: ImageFile) => {
    // Use the URL provided by the backend API
    onImageSelected(image.url, image.title || image.filename);
    setIsOpen(false);
    toast.success('Image inserted!');
  };

  const handleImageUploaded = (url: string, alt?: string) => {
    // Refresh the gallery after upload
    fetchImages(currentPage, searchQuery, selectedVisibility);
    // Insert the newly uploaded image
    onImageSelected(url, alt);
    setIsOpen(false);
  };

  const totalPages = Math.ceil(totalImages / itemsPerPage);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'gallery' | 'upload')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              My Images
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="mt-4">
            {/* Search and Filter Controls */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Images</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Images Grid */}
            <div className="h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <p>No images found</p>
                  <p className="text-sm">Try uploading some images first</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {images.map((image) => (
                    <Card key={image.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-0" onClick={() => handleImageSelect(image)}>
                        <div className="aspect-square relative">
                          <img
                            src={image.url}
                            alt={image.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="opacity-0 hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageSelect(image);
                              }}
                            >
                              Insert
                            </Button>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs truncate font-medium">{image.title}</p>
                          <div className="flex gap-1 mt-1">
                            {image.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Upload New Image</h3>
                <p className="text-gray-500 mb-6">
                  Select an image file to upload and insert into your post
                </p>
              </div>
              
              <ImageUploadButton
                onImageUploaded={handleImageUploaded}
                className="px-8 py-3"
              />
              
              <div className="text-xs text-gray-500 mt-4 text-center">
                <p>Supported formats: JPG, PNG, GIF, WebP, SVG</p>
                <p>Maximum file size: 10MB</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGalleryModal;
