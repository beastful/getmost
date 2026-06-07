'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// Generate a random color for the current user
const getRandomColor = () => {
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function CollaborativeEditor() {
  const [status, setStatus] = useState('disconnected');
  const [docContent, setDocContent] = useState('');
  const [users, setUsers] = useState([]);
  const [currentUserColor, setCurrentUserColor] = useState('#000000');
  
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  useEffect(() => {
    // 1. Setup Yjs
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('codemirror');
    
    // 2. Setup User Info
    const userColor = getRandomColor();
    setCurrentUserColor(userColor);
    
    // 3. Setup Provider (Do NOT pass 'awareness' config here, let it create itself)
    const provider = new HocuspocusProvider({
      url: 'wss://ws.getmost.app',
      name: 'demo-document',
      document: ydoc,
    });
    
    providerRef.current = provider;

    // 4. Set Local State (Who am I?)
    // Access the internal awareness instance directly from the provider
    provider.awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 1000),
      color: userColor,
    });

    // 5. Listen to Status
    provider.on('status', (event) => {
      setStatus(event.status);
      if (event.status === 'connected') {
        console.log('🚀 Connected to Hocuspocus');
      }
    });

    // 6. Listen to Document Changes
    ytext.observe((event) => {
      const content = ytext.toString();
      setDocContent(content);
    });

    // 7. Listen to Awareness (Active Users)
    const updateUsers = () => {
      // Get all states from the awareness map
      const states = Array.from(provider.awareness.getStates().values());
      setUsers(states);
    };
    
    // Initial load
    updateUsers();
    
    // Subscribe to changes
    provider.awareness.on('change', updateUsers);

    // Cleanup on unmount
    return () => {
      provider.awareness.off('change', updateUsers); // Remove listener
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setDocContent(newValue);
    
    const ydoc = ydocRef.current;
    if (ydoc) {
      const ytext = ydoc.getText('codemirror');
      ydoc.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, newValue);
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Hocuspocus Collaborative Demo wss://ws.getmost.app</h1>
        
        {/* Status Badge */}
        <div style={{
            padding: '5px 10px', 
            borderRadius: '5px', 
            fontWeight: 'bold',
            backgroundColor: status === 'connected' ? '#dcfce7' : '#fee2e2',
            color: status === 'connected' ? '#166534' : '#991b1b'
        }}>
          {status.toUpperCase()}
        </div>
      </div>

      {/* Active Users List */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <strong>Active Users ({users.length}):</strong>
        <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
          {users.length === 0 && <span style={{ color: '#666' }}>No one is here...</span>}
          {users.map((state, index) => (
            <span key={index} style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: `1px solid ${state?.user?.color || '#ccc'}`,
                fontSize: '0.85rem'
            }}>
                <span style={{
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: state?.user?.color || '#ccc',
                    marginRight: '6px'
                }}></span>
                {state?.user?.name || 'Anonymous'}
            </span>
          ))}
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={docContent}
        onChange={handleChange}
        placeholder="Start typing to see real-time sync..."
        style={{ 
          width: '100%', 
          height: '300px', 
          padding: '15px',
          fontSize: '16px',
          lineHeight: '1.5',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'monospace'
        }}
      />
      
      <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.875rem' }}>
        Open this page in a second browser tab to see the "Active Users" count increase to 2.
      </p>
    </div>
  );
}
