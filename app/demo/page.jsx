"use client"

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

function CollaborativeEditor() {
  const textareaRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const providerRef = useRef(null);
  const yTextRef = useRef(null);

  useEffect(() => {
    // 1. Create Yjs doc and shared text
    const ydoc = new Y.Doc();
    const yText = ydoc.getText('editor');
    yTextRef.current = yText;

    // 2. Connect to the WebSocket server
    const provider = new WebsocketProvider(
      'ws://176.109.108.83:1234',   // server URL
      'my-document',                // document name (appended as path)
      ydoc,
      { connect: true }
    );
    providerRef.current = provider;

    // 3. Set initial connection status (fix for missing 'status' event on fast connect)
    const setInitialStatus = () => {
      if (provider.ws?.readyState === WebSocket.OPEN) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    };
    setInitialStatus();

    // 4. Monitor connection status for future changes
    provider.on('status', event => {
      console.log('WebSocket status:', event.status);
      setConnected(event.status === 'connected');
    });

    // 5. Sync remote changes -> textarea
    const updateTextarea = () => {
      if (!textareaRef.current) return;
      const remoteValue = yText.toString();
      const currentValue = textareaRef.current.value;
      if (currentValue !== remoteValue) {
        textareaRef.current.value = remoteValue;
      }
    };
    yText.observe(updateTextarea);
    updateTextarea();

    // 6. Sync local changes -> Yjs
    const handleLocalChange = (e) => {
      const newValue = e.target.value;
      const oldValue = yText.toString();
      if (newValue === oldValue) return;
      // Replace the whole text (simple and reliable)
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, newValue);
      });
    };
    const textarea = textareaRef.current;
    textarea.addEventListener('input', handleLocalChange);

    // 7. Cleanup
    return () => {
      yText.unobserve(updateTextarea);
      textarea.removeEventListener('input', handleLocalChange);
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Collaborative Text Editor (y-websocket)</h2>
      <div style={{ marginBottom: '10px' }}>
        Status:{' '}
        <span style={{ color: connected ? 'green' : 'red', fontWeight: 'bold' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        style={{
          width: '100%',
          height: '300px',
          padding: '12px',
          fontSize: '16px',
          fontFamily: 'monospace',
          border: '1px solid #ccc',
          borderRadius: '4px',
          resize: 'vertical',
        }}
        placeholder="Start typing collaboratively..."
      />
      <p style={{ fontSize: '14px', color: '#555', marginTop: '8px' }}>
        ✨ Open multiple tabs – sync is instant and reliable.
      </p>
    </div>
  );
}

export default CollaborativeEditor;
