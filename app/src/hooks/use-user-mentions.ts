import { useState, useRef } from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
}

export function useUserMentions() {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detectMention = (value: string, cursorPos: number, textarea: HTMLTextAreaElement) => {
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    debugger;

    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Only show suggestions if no space/newline after @
    if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
      const rect = textarea.getBoundingClientRect();
      const lines = textBeforeCursor.split('\n');
      const lineHeight = 24;
      
      setMentionSearch(textAfterAt);
      setMentionStartPos(lastAtIndex);
      setMentionPosition({
        top: rect.top + window.scrollY + (lines.length * lineHeight),
        left: rect.left + 20,
      });
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: User, currentValue: string, useMarkdown: boolean = true) => {
    const before = currentValue.substring(0, mentionStartPos);
    const after = currentValue.substring(mentionStartPos + mentionSearch.length + 1);
    const mentionText = useMarkdown 
      ? `[@${user.displayName}](/content/profile/${user.username}) `
      : `@${user.username} `;
    const newValue = `${before}${mentionText}${after}`;
    const newCursorPosition = before.length + mentionText.length;
    
    setCursorPosition(newCursorPosition);
    return { value: newValue, cursorPosition: newCursorPosition };
  };

  return {
    textareaRef,
    showSuggestions,
    mentionSearch,
    mentionPosition,
    cursorPosition,
    detectMention,
    insertMention,
    setShowSuggestions,
    setCursorPosition,
  };
}

/**
 * Extracts mentioned usernames from markdown content.
 * Looks for the pattern [@displayName](/content/profile/username) and returns unique usernames.
 * Automatically ignores email addresses and other @ patterns.
 * 
 * @param markdown - The markdown content to parse
 * @returns Array of unique usernames that were mentioned
 */
export const extractMentionedUserIds = (markdown: string): string[] => {
  const mentionRegex = /\[@[^\]]+\]\(\/content\/profile\/([a-zA-Z0-9._-]+)\)/g;
  const matches = [...markdown.matchAll(mentionRegex)];
  const usernames = matches.map(match => match[1]);
  return [...new Set(usernames)]; // Remove duplicates
};

/**
 * Extracts mentioned usernames from plain text (non-markdown) content.
 * Looks for @username pattern and returns unique usernames.
 * Ignores email addresses by checking for domain-like patterns.
 * 
 * @param text - The plain text content to parse
 * @returns Array of unique usernames that were mentioned
 */
export const extractPlainTextMentions = (text: string): string[] => {
  // Match @username pattern (alphanumeric, dots, underscores, hyphens)
  // Must be preceded by whitespace or start of string
  // Must not be followed by a dot and more characters (to avoid emails)
  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9._-]+)(?!\.[a-zA-Z])/g;
  const matches = [...text.matchAll(mentionRegex)];
  const usernames = matches.map(match => match[1]);
  return [...new Set(usernames)]; // Remove duplicates
};