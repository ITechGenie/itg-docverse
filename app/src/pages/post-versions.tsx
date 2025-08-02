import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Eye, 
  Edit3, 
  ArrowLeft,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostVersion {
  id: string;
  revision: number;
  status: 'draft' | 'published';
  title: string;
  author: {
    displayName: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  stats: {
    views: number;
    totalReactions: number;
    totalComments: number;
  };
  isLatest: boolean;
}

// Mock data for post versions
const getMockVersions = (postId: string): PostVersion[] => [
  {
    id: `${postId}-v3`,
    revision: 3,
    status: 'published',
    title: 'Complete Documentation - Project doc-1 (Latest)',
    author: {
      displayName: 'John Doe',
      username: 'johndoe'
    },
    createdAt: '2024-12-15T10:30:00Z',
    updatedAt: '2024-12-15T10:35:00Z',
    stats: {
      views: 156,
      totalReactions: 23,
      totalComments: 8
    },
    isLatest: true
  },
  {
    id: `${postId}-v2`,
    revision: 2,
    status: 'published',
    title: 'Complete Documentation - Project doc-1',
    author: {
      displayName: 'John Doe',
      username: 'johndoe'
    },
    createdAt: '2024-12-10T14:20:00Z',
    updatedAt: '2024-12-10T14:25:00Z',
    stats: {
      views: 89,
      totalReactions: 15,
      totalComments: 5
    },
    isLatest: false
  },
  {
    id: `${postId}-v1`,
    revision: 1,
    status: 'published',
    title: 'Complete Documentation - Project doc-1',
    author: {
      displayName: 'John Doe',
      username: 'johndoe'
    },
    createdAt: '2024-12-05T09:15:00Z',
    updatedAt: '2024-12-05T09:20:00Z',
    stats: {
      views: 45,
      totalReactions: 8,
      totalComments: 2
    },
    isLatest: false
  },
  {
    id: `${postId}-v0`,
    revision: 0,
    status: 'draft',
    title: 'Complete Documentation - Project doc-1 (Initial Draft)',
    author: {
      displayName: 'John Doe',
      username: 'johndoe'
    },
    createdAt: '2024-12-01T16:45:00Z',
    updatedAt: '2024-12-01T16:50:00Z',
    stats: {
      views: 12,
      totalReactions: 0,
      totalComments: 0
    },
    isLatest: false
  }
];

export default function PostVersions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchVersions = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setVersions(getMockVersions(id));
      setLoading(false);
    };

    fetchVersions();
  }, [id]);

  const handleViewVersion = (version: PostVersion) => {
    const basePath = location.pathname.includes('/code-summaries/documents') 
      ? `/code-summaries/documents/${id}`
      : `/post/${id}`;
    
    if (version.isLatest) {
      navigate(`${basePath}`);
    } else {
      navigate(`${basePath}/${version.revision}`);
    }
  };

  const handleEditVersion = (version: PostVersion) => {
    const basePath = location.pathname.includes('/code-summaries/documents')
      ? `/code-summaries/documents/${id}`
      : `/post/${id}`;
    
    if (version.isLatest) {
      navigate(`${basePath}/edit`);
    } else {
      navigate(`${basePath}/${version.revision}/edit`);
    }
  };

  const goBack = () => {
    const basePath = location.pathname.includes('/code-summaries/documents')
      ? `/code-summaries/documents/${id}`
      : `/post/${id}`;
    navigate(basePath);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] rounded-xl bg-muted/50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] rounded-xl bg-muted/50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Post</span>
                </Button>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Version History</h1>
              <p className="text-muted-foreground">
                View and manage different versions of this post. Latest version is marked with a badge.
              </p>
            </div>
          </div>

          {/* Versions Table */}
          <div>
            {versions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No versions found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Version</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[300px]">Title</TableHead>
                          <TableHead className="w-[150px]">Author</TableHead>
                          <TableHead className="w-[150px]">Last Updated</TableHead>
                          <TableHead className="w-[120px]">Stats</TableHead>
                          <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versions.map((version) => (
                          <TableRow key={version.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span>v{version.revision}</span>
                                {version.isLatest && (
                                  <Badge variant="default" className="text-xs">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={version.status === 'published' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {version.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="truncate max-w-[300px]" title={version.title}>
                                {version.title}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{version.author.displayName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                <div>{version.stats.views} views</div>
                                <div>{version.stats.totalReactions} reactions</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewVersion(version)}
                                  title="View this version"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditVersion(version)}
                                  title="Edit this version"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {versions.map((version) => (
                    <Card key={version.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <CardTitle className="text-lg">v{version.revision}</CardTitle>
                              {version.isLatest && (
                                <Badge variant="default" className="text-xs">
                                  Latest
                                </Badge>
                              )}
                              <Badge 
                                variant={version.status === 'published' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {version.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{version.title}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{version.author.displayName}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVersion(version)}
                              title="View this version"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVersion(version)}
                              title="Edit this version"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{version.stats.views} views</span>
                          <span>{version.stats.totalReactions} reactions</span>
                          <span>{version.stats.totalComments} comments</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
