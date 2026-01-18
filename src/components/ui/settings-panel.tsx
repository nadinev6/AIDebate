import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'voice' | 'knowledge'>(
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

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'model', label: 'Model' },
    { id: 'voice', label: 'Voice' },
    { id: 'knowledge', label: 'Knowledge' }
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="max-w-3xl w-full backdrop-blur-2xl bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/[0.05] dark:border-white/[0.05] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-black/[0.05] dark:border-white/[0.05]">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-black/70 dark:text-white/70" />
              <h2 className="text-2xl font-bold text-black/90 dark:text-white/90">Settings</h2>
              {hasUnsavedChanges && (
                <motion.span
                  className="text-xs bg-yellow-500/20 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  Unsaved changes
                </motion.span>
              )}
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>

          <div className="flex border-b border-black/[0.05] dark:border-white/[0.05]">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex-1 py-3 px-4 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/90 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) =>
                      updateSettings({ theme: e.target.value as 'light' | 'dark' })
                    }
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-black/90 dark:text-white/90 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none transition-colors"
                  >
                    <option value="dark" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Dark</option>
                    <option value="light" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Light</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90">
                      Auto-save Settings
                    </label>
                    <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                      Automatically save changes as you make them
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                    className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
                  />
                </div>



                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90">
                      Show Citations
                    </label>
                    <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                      Display source citations in responses
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showCitations}
                    onChange={(e) => updateSettings({ showCitations: e.target.checked })}
                    className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90">
                      Show Live Transcription
                    </label>
                    <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                      Display real-time transcription during voice chat
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showTranscription}
                    onChange={(e) =>
                      updateSettings({ showTranscription: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'model' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                    Model Provider
                  </label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) =>
                      updateSettings({
                        aiProvider: e.target.value as 'openai' | 'cerebras',
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-black/90 dark:text-white/90 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none transition-colors"
                  >
                    <option value="openai" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">OpenAI</option>
                    <option value="cerebras" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Cerebras</option>
                  </select>
                </div>

                {settings.aiProvider === 'openai' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                      OpenAI Model
                    </label>
                    <select
                      value={settings.openaiModel}
                      onChange={(e) => updateSettings({ openaiModel: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-black/90 dark:text-white/90 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none transition-colors"
                    >
                      <option value="gpt-3.5-turbo" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">GPT-3.5 Turbo</option>
                      <option value="gpt-4" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">GPT-4</option>
                      <option value="gpt-4-turbo" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">GPT-4 Turbo</option>
                    </select>
                  </motion.div>
                )}

                {settings.aiProvider === 'cerebras' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                      Cerebras Model
                    </label>
                    <select
                      value={settings.cerebrasModel}
                      onChange={(e) => updateSettings({ cerebrasModel: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-black/90 dark:text-white/90 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none transition-colors"
                    >
                      <option value="llama3.1-8b" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Llama 3.1 8B</option>
                      <option value="llama3.1-70b" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Llama 3.1 70B</option>
                    </select>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
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
                    className="w-full h-2 bg-black/[0.1] dark:bg-white/[0.1] rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${(settings.temperature / 2) * 100}%, rgb(0 0 0 / 0.1) ${(settings.temperature / 2) * 100}%, rgb(0 0 0 / 0.1) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-black/60 dark:text-white/60 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
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
                    className="w-full h-2 bg-black/[0.1] dark:bg-white/[0.1] rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${((settings.maxTokens - 100) / 1900) * 100}%, rgb(0 0 0 / 0.1) ${((settings.maxTokens - 100) / 1900) * 100}%, rgb(0 0 0 / 0.1) 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <label className="block text-sm font-medium text-black/90 dark:text-white/90">
                      Enable Redis Caching
                    </label>
                    <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                      Cache AI responses for faster retrieval
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.redisEnabled}
                    onChange={(e) => updateSettings({ redisEnabled: e.target.checked })}
                    className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'voice' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                    Voice Selection
                  </label>
                  <select
                    value={settings.voice}
                    onChange={(e) =>
                      updateSettings({
                        voice: e.target.value as typeof settings.voice,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-black/90 dark:text-white/90 focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none transition-colors"
                  >
                    <option value="alloy" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Alloy</option>
                    <option value="echo" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Echo</option>
                    <option value="fable" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Fable</option>
                    <option value="onyx" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Onyx</option>
                    <option value="nova" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Nova</option>
                    <option value="shimmer" className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white">Shimmer</option>
                  </select>
                  <p className="text-xs text-black/60 dark:text-white/60 mt-2">
                    Select the voice for AI responses in voice chat mode
                  </p>
                </div>

                <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] rounded-lg">
                  <h4 className="text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                    Voice Descriptions
                  </h4>
                  <ul className="text-xs text-black/60 dark:text-white/60 space-y-1">
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Alloy:</strong> Neutral, balanced voice
                    </li>
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Echo:</strong> Warm, professional voice
                    </li>
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Fable:</strong> Expressive, storytelling voice
                    </li>
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Onyx:</strong> Deep, authoritative voice
                    </li>
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Nova:</strong> Energetic, engaging voice
                    </li>
                    <li>
                      <strong className="text-black/80 dark:text-white/80">Shimmer:</strong> Bright, friendly voice
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'knowledge' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <label className="block text-sm font-medium text-black/90 dark:text-white/90 mb-2">
                    Upload Documents
                  </label>
                  <div className="border-2 border-dashed border-black/[0.05] dark:border-white/[0.05] rounded-lg p-8 text-center hover:border-violet-500 dark:hover:border-violet-400 transition-colors">
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
                      <Upload className="w-10 h-10 text-black/60 dark:text-white/60 mb-2" />
                      <p className="text-sm text-black/70 dark:text-white/70">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                        PDF, TXT, or MD (max 10MB)
                      </p>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-black/90 dark:text-white/90 mb-3">
                    Uploaded Documents ({documents.length})
                  </h4>
                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-sm text-black/60 dark:text-white/60 text-center py-4">
                        No documents uploaded yet
                      </p>
                    ) : (
                      documents.map((doc) => (
                        <motion.div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-black/90 dark:text-white/90 truncate">{doc.name}</p>
                              <p className="text-xs text-black/60 dark:text-white/60">
                                {formatFileSize(doc.size)} •{' '}
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.status === 'processing' && (
                              <Loader2 className="w-4 h-4 text-violet-500 dark:text-violet-400 animate-spin" />
                            )}
                            {doc.status === 'ready' && (
                              <span className="text-xs text-green-600 dark:text-green-400">Ready</span>
                            )}
                            {doc.status === 'error' && (
                              <span className="text-xs text-red-600 dark:text-red-400">Error</span>
                            )}
                            <motion.button
                              onClick={() => handleDeleteDocument(doc.id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="p-1.5 rounded hover:bg-red-500/10 text-black/60 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          <div className="flex items-center justify-between p-6 border-t border-black/[0.05] dark:border-white/[0.05]">
            <motion.button
              onClick={resetSettings}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-black/[0.1] dark:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.05] text-black/70 dark:text-white/70 hover:bg-black/[0.15] dark:hover:bg-white/[0.15] hover:text-black/90 dark:hover:text-white/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </motion.button>
            <div className="flex gap-3">
              <motion.button
                onClick={() => {
                  saveSettings();
                  onClose();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-black/[0.1] dark:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.05] text-black/70 dark:text-white/70 hover:bg-black/[0.15] dark:hover:bg-white/[0.15] hover:text-black/90 dark:hover:text-white/90 transition-colors"
              >
                Save
              </motion.button>
              {!settings.autoSave && hasUnsavedChanges && (
                <motion.button
                  onClick={saveSettings}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
