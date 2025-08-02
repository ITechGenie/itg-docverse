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
import { Eye, RotateCcw, ExternalLink, MoreHorizontal, Code, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GitLabRepo {
  id: string;
  projectId: string;
  name: string;
  gitUrl: string;
  isIndexed: boolean;
  lastIndexed?: string;
  description?: string;
}

// Mock data for GitLab repositories
const mockGitLabRepos: Record<string, GitLabRepo[]> = {
  'payment-gateway': [
    {
      id: 'repo-1',
      projectId: 'payment-gateway-api',
      name: 'Payment Gateway API',
      gitUrl: 'https://gitlab.com/company/payment-gateway-api.git',
      isIndexed: true,
      lastIndexed: '2024-12-15T10:30:00Z',
      description: 'Core payment processing API service'
    },
    {
      id: 'repo-2',
      projectId: 'payment-gateway-ui',
      name: 'Payment Gateway UI',
      gitUrl: 'https://gitlab.com/company/payment-gateway-ui.git',
      isIndexed: false,
      description: 'React-based UI for payment management'
    }
  ],
  'user-management': [
    {
      id: 'repo-3',
      projectId: 'user-auth-service',
      name: 'User Authentication Service',
      gitUrl: 'https://gitlab.com/company/user-auth-service.git',
      isIndexed: true,
      lastIndexed: '2024-12-14T15:20:00Z',
      description: 'OAuth2 and JWT authentication service'
    },
    {
      id: 'repo-4',
      projectId: 'user-profile-api',
      name: 'User Profile API',
      gitUrl: 'https://gitlab.com/company/user-profile-api.git',
      isIndexed: true,
      lastIndexed: '2024-12-13T09:45:00Z',
      description: 'User profile management and settings API'
    }
  ],
  'notification-service': [
    {
      id: 'repo-5',
      projectId: 'notification-engine',
      name: 'Notification Engine',
      gitUrl: 'https://gitlab.com/company/notification-engine.git',
      isIndexed: false,
      description: 'Multi-channel notification delivery system'
    }
  ]
};

// Get all repos for default view
const getAllRepos = (): GitLabRepo[] => {
  const allRepos: GitLabRepo[] = [];
  Object.values(mockGitLabRepos).forEach(repos => {
    allRepos.push(...repos);
  });
  return allRepos;
};

export default function GitRepos() {
  const { systemId } = useParams<{ systemId: string }>();
  const navigate = useNavigate();
  const [repos, setRepos] = useState<GitLabRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchRepos = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      
      if (systemId) {
        // Filter repos by system ID when coming from explorer
        const systemRepos = mockGitLabRepos[systemId] || [];
        setRepos(systemRepos);
      } else {
        // Show all repos when opening page directly
        setRepos(getAllRepos());
      }
      setLoading(false);
    };

    fetchRepos();
  }, [systemId]);

  const handleViewRepo = (repoId: string) => {
    navigate(`#/repo/${repoId}`);
  };

  const handleCodeReview = (repoId: string) => {
    navigate(`#/repo/${repoId}/code-review`);
  };

  const handleCodeAnalysis = (repoId: string) => {
    navigate(`#/repo/${repoId}/code-analysis`);
  };

  const handleReindex = async (repoId: string) => {
    // Simulate reindexing
    const updatedRepos = repos.map(repo => 
      repo.id === repoId 
        ? { ...repo, isIndexed: true, lastIndexed: new Date().toISOString() }
        : repo
    );
    setRepos(updatedRepos);
  };

  const openGitLabRepo = (gitUrl: string) => {
    window.open(gitUrl, '_blank');
  };

  const handleViewLLM = (repoId: string) => {
    navigate(`#/repo/${repoId}/llm`);
  };

  const handleViewLLMFull = (repoId: string) => {
    navigate(`#/repo/${repoId}/llm-full`);
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Git Repositories</h1>
            <p className="text-muted-foreground">
              GitLab repositories associated with projects. Indexed repositories are searchable and have up-to-date documentation.
            </p>
          </div>

          {/* Repository Table */}
          <div>
            {repos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No repositories found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Project ID</TableHead>
                          <TableHead className="min-w-[200px]">Repository Name</TableHead>
                          <TableHead className="min-w-[300px]">Git URL</TableHead>
                          <TableHead className="w-[130px]">Last Indexed</TableHead>
                          <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {repos.map((repo) => (
                          <TableRow key={repo.id}>
                            <TableCell className="font-medium">{repo.projectId}</TableCell>
                            <TableCell className="min-w-[200px]">
                              <div>
                                <div className="font-medium truncate">{repo.name}</div>
                                {repo.description && (
                                  <div className="text-sm text-muted-foreground truncate">{repo.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[300px]">
                              <Button
                                variant="link"
                                className="h-auto p-0 text-xs justify-start max-w-full"
                                onClick={() => openGitLabRepo(repo.gitUrl)}
                              >
                                <span className="truncate max-w-[250px]">{repo.gitUrl}</span>
                                <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              {repo.isIndexed && repo.lastIndexed ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(repo.lastIndexed).toLocaleDateString()}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Not Indexed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewRepo(repo.id)}
                                  title="View repository details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCodeReview(repo.id)}
                                  title="Code review"
                                >
                                  <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCodeAnalysis(repo.id)}
                                  title="Code analysis"
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReindex(repo.id)}
                                  title={repo.isIndexed ? "Reindex repository" : "Index repository"}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="More options"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewLLM(repo.id)}>
                                      View LLM.txt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                      View LLM-Full.txt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                      View system flow
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                      View block diagram
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                  {repos.map((repo) => (
                    <Card key={repo.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{repo.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Project ID: {repo.projectId}
                            </p>
                            {repo.description && (
                              <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewRepo(repo.id)}
                              title="View repository details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCodeReview(repo.id)}
                              title="Code review"
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCodeAnalysis(repo.id)}
                              title="Code analysis"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReindex(repo.id)}
                              title={repo.isIndexed ? "Reindex repository" : "Index repository"}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="More options"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewLLM(repo.id)}>
                                  View LLM.txt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                  View LLM-Full.txt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                  View system flow
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewLLMFull(repo.id)}>
                                  View block diagram
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Git URL:</p>
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs justify-start max-w-full"
                              onClick={() => openGitLabRepo(repo.gitUrl)}
                            >
                              <span className="truncate max-w-[250px]">{repo.gitUrl}</span>
                              <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                            </Button>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Status:</p>
                            {repo.isIndexed && repo.lastIndexed ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  Indexed on {new Date(repo.lastIndexed).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Not Indexed
                              </Badge>
                            )}
                          </div>
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
