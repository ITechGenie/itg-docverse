import React from 'react';
import { Button } from '@/components/ui/button';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { ImageGalleryModal } from '@/components/ui/image-gallery-modal';
import { ImageIcon } from 'lucide-react';

interface MarkdownImageToolbarProps {
  onImageInsert: (url: string, alt?: string) => void;
}

export const MarkdownImageToolbar: React.FC<MarkdownImageToolbarProps> = ({
  onImageInsert
}) => {
  const handleImageInsert = (url: string, alt = '') => {
    const markdownImage = `![${alt}](${url})`;
    onImageInsert(markdownImage);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Gallery Modal for existing images */}
      <ImageGalleryModal onImageSelected={handleImageInsert}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          title="Browse Images"
        >
          <ImageIcon className="w-4 h-4" />
          Gallery
        </Button>
      </ImageGalleryModal>

      {/* Direct upload button */}
      <ImageUploadButton
        onImageUploaded={handleImageInsert}
        className="flex items-center gap-2"
      />
    </div>
  );
};

export default MarkdownImageToolbar;
