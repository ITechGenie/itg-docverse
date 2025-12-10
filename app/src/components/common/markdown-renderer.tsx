import { useTheme } from '@/components/theme-provider';
import { useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  const { theme } = useTheme();
  
  // Determine the color mode for the markdown preview
  const getColorMode = (): 'dark' | 'light' => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    // For system theme, check the actual applied theme
    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? 'dark' : 'light';
  };

  // Initialize and render Mermaid diagrams
  useEffect(() => {
    const colorMode = getColorMode();
    
    mermaid.initialize({
      startOnLoad: true,
      theme: colorMode === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });

    // Find and render all mermaid code blocks
    const renderMermaid = async () => {
      const mermaidBlocks = document.querySelectorAll('.language-mermaid');
      
      if (mermaidBlocks.length === 0) return;
      
      mermaidBlocks.forEach((block, index) => {
        const code = block.textContent || '';
        const id = `mermaid-${Date.now()}-${index}`;
        
        // Create a container for the diagram
        const container = document.createElement('div');
        container.className = 'mermaid-diagram';
        container.id = id;
        container.textContent = code;
        
        // Replace only the code block element, not its parent
        block.replaceWith(container);
      });
      
      // Trigger Mermaid rendering
      try {
        await mermaid.run({
          querySelector: '.mermaid-diagram',
        });
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(renderMermaid, 100);
  }, [content, theme]);

  return (
    <div className={`prose prose-lg max-w-none dark:prose-invert ${className}`} data-color-mode={getColorMode()}>
      <MDEditor.Markdown 
        source={content}
        style={{ 
          backgroundColor: 'transparent',
          color: 'inherit'
        }}
      />
    </div>
  );
};
