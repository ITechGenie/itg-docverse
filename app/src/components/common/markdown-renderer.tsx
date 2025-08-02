import { useTheme } from '@/components/theme-provider';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

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
