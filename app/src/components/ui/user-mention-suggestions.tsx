import { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api-client';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface Props {
  searchTerm: string;
  position: { top: number; left: number };
  onSelect: (user: User) => void;
  onClose: () => void;
}

export function UserMentionSuggestions({ searchTerm, position, onSelect, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch users
  useEffect(() => {
    if (!searchTerm) return;
    
    const fetchUsers = async () => {
      const response = await api.searchUsers(searchTerm);
      if (response.success) {
        setUsers(response.data?.slice(0, 5) || []);
      }
    };
    
    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!users.length) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + users.length) % users.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(users[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [users, selectedIndex, onSelect, onClose]);

  if (!users.length) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-popover border rounded-md shadow-lg w-64 max-h-48 overflow-auto"
      style={{ top: position.top, left: position.left }}
    >
      <ul className="py-1">
        {users.map((user, i) => (
          <li
            key={user.id}
            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
              i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelect(user)}
          >
            <img
              src={user.avatarUrl || '/default-avatar.png'}
              alt={user.displayName}
              className="w-6 h-6 rounded-full"
            />
            <div>
              <div className="text-sm font-medium">{user.displayName}</div>
              <div className="text-xs text-muted-foreground">@{user.username}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}