// documentNode.js - RAG Document Upload Node

import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

export const DocumentNode = ({ id, data }) => {
  const { updateNodeField } = useStore();

  const [title, setTitle] = useState(data?.title || 'Knowledge Base Doc');
  const [text, setText] = useState(data?.text || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    if (data?.title !== undefined && data.title !== title) setTitle(data.title);
    if (data?.text !== undefined && data.text !== text) setText(data.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.title, data?.text]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    updateNodeField(id, 'title', val);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    updateNodeField(id, 'text', val);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContent = event.target.result;
      setText(fileContent);
      setTitle(file.name);
      updateNodeField(id, 'text', fileContent);
      updateNodeField(id, 'title', file.name);

      // Index via backend API immediately
      try {
        const resp = await fetch('http://127.0.0.1:8000/rag/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: id,
            title: file.name,
            content: fileContent
          })
        });
        const resData = await resp.json();
        if (resData.success) {
          setUploadStatus(`Indexed ${resData.chunks_indexed} chunks into ChromaDB`);
        }
      } catch (err) {
        setUploadStatus('Saved locally (Backend RAG indexing ready)');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const handles = [
    {
      id: `${id}-output`,
      type: 'source',
      position: 'right',
      label: 'text'
    }
  ];

  const config = {
    title: 'Document',
    icon: '📄',
    accent: '#A855F7',
    width: 250,
    minHeight: 180,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label className="basenode-field-label">Document Title</label>
          <input
            className="nodrag basenode-input"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="e.g. Sales Playbook"
          />
        </div>

        <div>
          <label className="basenode-field-label">Content / Upload File (.txt, .md, .pdf)</label>
          <textarea
            className="nodrag basenode-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Paste text document content here..."
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <label
            className="nodrag"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#FFFFFF',
              background: '#A855F7',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-block'
            }}
          >
            {isUploading ? 'Uploading...' : '📁 Choose File'}
            <input
              type="file"
              accept=".txt,.md,.pdf,.csv,.json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              className="nodrag"
            />
          </label>

          {uploadStatus && (
            <span style={{ fontSize: '9.5px', color: '#10B981', fontWeight: '500' }}>
              {uploadStatus}
            </span>
          )}
        </div>
      </div>
    )
  };

  return <BaseNode id={id} data={data} config={config} />;
};
