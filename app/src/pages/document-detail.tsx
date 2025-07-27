import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import type { Post } from '@/types';
import PostDetail from '@/pages/post-detail';

export default function DocumentDetail() {
  const { docId, docType, version } = useParams<{ docId: string; docType?: string; version?: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) return;
      
      try {
        setLoading(true);
        
        console.log(`Fetching document with ID: ${docId}`);
        console.log(`Document Type: ${docType}, Version: ${version}`);
        
        // For documents, we always fetch by docId regardless of docType
        // docType is just for display context (llm-short, llm-full, etc.)
        const response = version ? await api.getPostVersion(docId, parseInt(version)) : await api.getPost(docId);
        
        console.log('Document API Response:', response);
        
        if (response.success && response.data) {
          setPost(response.data);
          console.log(`Loaded document: ${response.data.title} (Type: ${docType})`);
        } else {
          console.error('Failed to load document:', response.error);
        }
      } catch (error) {
        console.error('Failed to fetch document:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docId, version, docType]);

  // Document-specific handlers
  const handleEdit = () => {
    if (!post) return;
    
    if (version && version !== '0') {
      navigate(`/code-summaries/documents/${docId}/${version}/edit`);
    } else {
      navigate(`/code-summaries/documents/${docId}/edit`);
    }
  };

  const handleViewVersions = () => {
    if (!post) return;
    navigate(`/code-summaries/documents/${docId}/versions`);
  };

  // Pass document context to PostDetail
  return (
    <PostDetail
      post={post}
      loading={loading}
      isDocument={true}
      documentType={docType}
      onEdit={handleEdit}
      onViewVersions={handleViewVersions}
    />
  );
}
