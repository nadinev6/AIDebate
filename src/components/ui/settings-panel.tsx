import React, { useState } from 'react';
import { Card } from './card';
import { Button } from './button';
import {
  Settings,
  X,
  Save,
  RotateCcw,
  Upload,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
  status: 'processing' | 'ready' | 'error';
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, saveSettings, resetSettings, hasUnsavedChanges } =
    useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'voice' | 'knowledge'>(
    'general'
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        status: 'processing',
      };
      setDocuments((prev) => [...prev, newDoc]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:8000/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === newDoc.id ? { ...doc, status: 'ready' } : doc
            )
          );
        } else {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === newDoc.id ? { ...doc, status: 'error' } : doc
            )
          );
        }
      } catch (error) {
        console.error('Upload error:', error);
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === newDoc.id ? { ...doc, status: 'error' } : doc
          )
        );
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`http://localhost:8000/api/documents/${docId}`, {
        method: 'DELETE',
      });
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-w-3xl w-full bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            {hasUnsavedChanges && (
              <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-border">
          {(['general', 'ai', 'voice', 'knowledge'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-input/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) =>
                    updateSettings({ theme: e.target.value as 'light' | 'dark' })
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Auto-save Settings
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically save changes as you make them
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                  className="w-5 h-5 rounded bg-input border-border"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Enable Markdown Rendering
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Render markdown formatting in messages
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.markdownEnabled}
                  onChange={(e) => updateSettings({ markdownEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-input border-border"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Show Citations
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display source citations in responses
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showCitations}
                  onChange={(e) => updateSettings({ showCitations: e.target.checked })}
                  className="w-5 h-5 rounded bg-input border-border"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Show Live Transcription
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display real-time transcription during voice chat
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showTranscription}
                  onChange={(e) =>
                    updateSettings({ showTranscription: e.target.checked })
                  }
                  className="w-5 h-5 rounded bg-input border-border"
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  AI Provider
                </label>
                <select
                  value={settings.aiProvider}
                  onChange={(e) =>
                    updateSettings({
                      aiProvider: e.target.value as 'openai' | 'cerebras',
                    })
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
                >
                  <option value="openai">OpenAI</option>
                  <option value="cerebras">Cerebras</option>
                </select>
              </div>

              {settings.aiProvider === 'openai' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    OpenAI Model
                  </label>
                  <select
                    value={settings.openaiModel}
                    onChange={(e) => updateSettings({ openaiModel: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>
              )}

              {settings.aiProvider === 'cerebras' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cerebras Model
                  </label>
                  <select
                    value={settings.cerebrasModel}
                    onChange={(e) => updateSettings({ cerebrasModel: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
                  >
                    <option value="llama3.1-8b">Llama 3.1 8B</option>
                    <option value="llama3.1-70b">Llama 3.1 70B</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) =>
                    updateSettings({ temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Tokens: {settings.maxTokens}
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={settings.maxTokens}
                  onChange={(e) =>
                    updateSettings({ maxTokens: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Enable Redis Caching
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cache AI responses for faster retrieval
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.redisEnabled}
                  onChange={(e) => updateSettings({ redisEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-input border-border"
                />
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Voice Selection
                </label>
                <select
                  value={settings.voice}
                  onChange={(e) =>
                    updateSettings({
                      voice: e.target.value as typeof settings.voice,
                    })
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Select the voice for AI responses in voice chat mode
                </p>
              </div>

              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-400 mb-2">
                  Voice Descriptions
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    <strong>Alloy:</strong> Neutral, balanced voice
                  </li>
                  <li>
                    <strong>Echo:</strong> Warm, professional voice
                  </li>
                  <li>
                    <strong>Fable:</strong> Expressive, storytelling voice
                  </li>
                  <li>
                    <strong>Onyx:</strong> Deep, authoritative voice
                  </li>
                  <li>
                    <strong>Nova:</strong> Energetic, engaging voice
                  </li>
                  <li>
                    <strong>Shimmer:</strong> Bright, friendly voice
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload Documents
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, TXT, or MD (max 10MB)
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Uploaded Documents ({documents.length})
                </h4>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No documents uploaded yet
                    </p>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-input rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.size)} •{' '}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'processing' && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          )}
                          {doc.status === 'ready' && (
                            <span className="text-xs text-green-400">Ready</span>
                          )}
                          {doc.status === 'error' && (
                            <span className="text-xs text-red-400">Error</span>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            onClick={resetSettings}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="border-border">
              Close
            </Button>
            {!settings.autoSave && hasUnsavedChanges && (
              <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
