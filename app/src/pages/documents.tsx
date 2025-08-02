import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  FileSearch, 
  Network, 
  GitBranch, 
  Workflow, 
  Users,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Document {
  id: string;
  projectId: string;
  branchName: string;
  indexedDate: string;
  hasLLMShort: boolean;
  hasLLMFull: boolean;
  hasSystemDiagram: boolean;
  hasApiFlow: boolean;
  hasBatchJobs: boolean;
  hasUserJourneys: boolean;
}

// Mock data for documents
const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    projectId: 'payment-gateway-api',
    branchName: 'main',
    indexedDate: '2024-12-15T10:30:00Z',
    hasLLMShort: true,
    hasLLMFull: true,
    hasSystemDiagram: true,
    hasApiFlow: true,
    hasBatchJobs: false,
    hasUserJourneys: true,
  },
  {
    id: 'doc-2',
    projectId: 'payment-gateway-ui',
    branchName: 'develop',
    indexedDate: '2024-12-14T15:20:00Z',
    hasLLMShort: true,
    hasLLMFull: false,
    hasSystemDiagram: false,
    hasApiFlow: false,
    hasBatchJobs: false,
    hasUserJourneys: true,
  },
  {
    id: 'doc-3',
    projectId: 'user-auth-service',
    branchName: 'main',
    indexedDate: '2024-12-13T09:45:00Z',
    hasLLMShort: true,
    hasLLMFull: true,
    hasSystemDiagram: true,
    hasApiFlow: true,
    hasBatchJobs: true,
    hasUserJourneys: false,
  },
  {
    id: 'doc-4',
    projectId: 'user-profile-api',
    branchName: 'feature/v2',
    indexedDate: '2024-12-12T14:15:00Z',
    hasLLMShort: true,
    hasLLMFull: true,
    hasSystemDiagram: false,
    hasApiFlow: true,
    hasBatchJobs: true,
    hasUserJourneys: true,
  },
  {
    id: 'doc-5',
    projectId: 'notification-engine',
    branchName: 'main',
    indexedDate: '2024-12-11T11:30:00Z',
    hasLLMShort: true,
    hasLLMFull: false,
    hasSystemDiagram: true,
    hasApiFlow: false,
    hasBatchJobs: true,
    hasUserJourneys: false,
  },
];

type DocumentType = 'llm-short' | 'llm-full' | 'system-diagram' | 'api-flow' | 'batch-jobs' | 'user-journeys';

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  useEffect(() => {
    // Simulate API call
    const fetchDocuments = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      setDocuments(mockDocuments);
      setLoading(false);
    };

    fetchDocuments();
  }, []);

  const handleDocumentAction = (docId: string, docType: DocumentType) => {
    // Navigate to document detail page with cleaner URL structure
    navigate(`/code-summaries/documents/${docId}/${docType}`);
  };

  const handleSelectDoc = (docId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs(prev => [...prev, docId]);
    } else {
      setSelectedDocs(prev => prev.filter(id => id !== docId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocs(documents.map(doc => doc.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const getActionButton = (doc: Document, type: DocumentType, icon: React.ReactNode, title: string, available: boolean) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDocumentAction(doc.id, type)}
        title={title}
        disabled={!available}
        className={!available ? "opacity-50 cursor-not-allowed" : ""}
      >
        {icon}
      </Button>
    );
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
            <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
            <p className="text-muted-foreground">
              Generated documentation for all projects. Click on action icons to view or edit documentation.
            </p>
          </div>

          {/* Documents Table */}
          <div>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No documents found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedDocs.length === documents.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead className="min-w-[200px]">Project ID</TableHead>
                          <TableHead className="w-[120px]">Branch</TableHead>
                          <TableHead className="w-[130px]">Indexed Date</TableHead>
                          <TableHead className="min-w-[300px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedDocs.includes(doc.id)}
                                onCheckedChange={(checked) => handleSelectDoc(doc.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{doc.id}</TableCell>
                            <TableCell className="font-medium">{doc.projectId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {doc.branchName}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(doc.indexedDate).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                {getActionButton(
                                  doc,
                                  'llm-short',
                                  <FileText className="h-4 w-4" />,
                                  'Short Summary (LLM.txt)',
                                  doc.hasLLMShort
                                )}
                                {getActionButton(
                                  doc,
                                  'llm-full',
                                  <FileSearch className="h-4 w-4" />,
                                  'Long Summary (LLM-Full.txt)',
                                  doc.hasLLMFull
                                )}
                                {getActionButton(
                                  doc,
                                  'system-diagram',
                                  <Network className="h-4 w-4" />,
                                  'System/Block Diagram',
                                  doc.hasSystemDiagram
                                )}
                                {getActionButton(
                                  doc,
                                  'api-flow',
                                  <GitBranch className="h-4 w-4" />,
                                  'API Flow Diagram',
                                  doc.hasApiFlow
                                )}
                                {getActionButton(
                                  doc,
                                  'batch-jobs',
                                  <Workflow className="h-4 w-4" />,
                                  'Batch Jobs',
                                  doc.hasBatchJobs
                                )}
                                {getActionButton(
                                  doc,
                                  'user-journeys',
                                  <Users className="h-4 w-4" />,
                                  'User Journeys',
                                  doc.hasUserJourneys
                                )}
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
                                    <DropdownMenuItem>
                                      Export All
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      Re-index
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">
                                      Delete
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
                <div className="lg:hidden space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={(checked) => handleSelectDoc(doc.id, checked as boolean)}
                            />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg">{doc.projectId}</CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <p className="text-sm text-muted-foreground">ID: {doc.id}</p>
                                <Badge variant="outline" className="text-xs">
                                  {doc.branchName}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Indexed: {new Date(doc.indexedDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-2">
                          {getActionButton(
                            doc,
                            'llm-short',
                            <FileText className="h-4 w-4" />,
                            'Short Summary',
                            doc.hasLLMShort
                          )}
                          {getActionButton(
                            doc,
                            'llm-full',
                            <FileSearch className="h-4 w-4" />,
                            'Long Summary',
                            doc.hasLLMFull
                          )}
                          {getActionButton(
                            doc,
                            'system-diagram',
                            <Network className="h-4 w-4" />,
                            'System Diagram',
                            doc.hasSystemDiagram
                          )}
                          {getActionButton(
                            doc,
                            'api-flow',
                            <GitBranch className="h-4 w-4" />,
                            'API Flow',
                            doc.hasApiFlow
                          )}
                          {getActionButton(
                            doc,
                            'batch-jobs',
                            <Workflow className="h-4 w-4" />,
                            'Batch Jobs',
                            doc.hasBatchJobs
                          )}
                          {getActionButton(
                            doc,
                            'user-journeys',
                            <Users className="h-4 w-4" />,
                            'User Journeys',
                            doc.hasUserJourneys
                          )}
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
