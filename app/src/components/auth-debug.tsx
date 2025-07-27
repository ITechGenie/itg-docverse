import React from 'react';
import { useAuth } from '@/contexts/auth-context';

export function AuthDebug() {
  const { user, token, isAuthenticated, isLoading } = useAuth();

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Auth Debug Info:</h4>
      <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
      <div>Has Token: {token ? 'Yes' : 'No'}</div>
      <div>Token (first 20 chars): {token ? token.substring(0, 20) + '...' : 'None'}</div>
      <div>User: {user ? user.username : 'None'}</div>
      <div>LocalStorage Token: {localStorage.getItem('itg_docverse_token') ? 'Exists' : 'Missing'}</div>
      <div>LocalStorage User: {localStorage.getItem('itg_docverse_user') ? 'Exists' : 'Missing'}</div>
    </div>
  );
}
