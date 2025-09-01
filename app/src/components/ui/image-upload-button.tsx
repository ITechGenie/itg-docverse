import React, { useRef, useState } from 'react';
import { Upload, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface ImageUploadButtonProps {
  onImageUploaded: (url: string, alt?: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImageUploaded,
  disabled = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('visibility', 'public'); // Make images public so they can be embedded
      formData.append('tags', JSON.stringify(['markdown-editor']));

      const response = await api.uploadImage(formData);
      
      if (response.success && response.data) {
        const imageUrl = api.getImageUrl(response.data.id);
        onImageUploaded(imageUrl, response.data.original_filename);
        toast.success('Image uploaded successfully!');
      } else {
        toast.error(response.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleFileSelect}
        disabled={disabled || isUploading}
        className={`flex items-center gap-2 ${className}`}
        title="Upload Image"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Image className="w-4 h-4" />
        )}
        {isUploading ? 'Uploading...' : 'Upload Image'}
      </Button>
    </>
  );
};

export default ImageUploadButton;
