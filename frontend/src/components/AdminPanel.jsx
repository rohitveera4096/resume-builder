import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle } from 'lucide-react';
import './AdminPanel.css';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState(null); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/admin/update-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, apiKey })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'API Key updated successfully!');
        setPassword('');
        setApiKey('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to update API Key');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Is the backend running?');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <Shield className="admin-icon" />
          <h2>Admin Settings</h2>
          <p>Update the API Key used by the backend</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>
            <div className="input-wrapper">
              <Key className="input-icon" size={18} />
              <input
                type="password"
                id="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey">New API Key</label>
            <div className="input-wrapper">
              <Shield className="input-icon" size={18} />
              <input
                type="password"
                id="apiKey"
                placeholder="Enter new API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
          </div>

          {status === 'success' && (
            <div className="alert success">
              <CheckCircle size={18} />
              <span>{message}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="alert error">
              <AlertCircle size={18} />
              <span>{message}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Updating...' : 'Update API Key'}
          </button>
        </form>
      </div>
    </div>
  );
}
