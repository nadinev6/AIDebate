import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Card } from './card';

export interface CitationData {
  id: string;
  source: string;
  page?: number;
  excerpt: string;
  document?: string;
  url?: string;
}

interface CitationProps {
  citation: CitationData;
  index: number;
}

export function Citation({ citation, index }: CitationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="inline-flex items-start ml-1 group">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-md transition-colors"
        title={`Citation ${index + 1}: ${citation.source}`}
      >
        <BookOpen className="w-3 h-3" />
        <span>[{index + 1}]</span>
        {citation.page && <span className="text-blue-300">p.{citation.page}</span>}
      </button>

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-2xl w-full bg-gray-900 border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  Citation {index + 1}
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-400">Source:</span>
                <p className="text-white mt-1">{citation.source}</p>
              </div>

              {citation.document && (
                <div>
                  <span className="text-sm font-medium text-gray-400">Document:</span>
                  <p className="text-white mt-1">{citation.document}</p>
                </div>
              )}

              {citation.page && (
                <div>
                  <span className="text-sm font-medium text-gray-400">Page:</span>
                  <p className="text-white mt-1">{citation.page}</p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-400">Excerpt:</span>
                <blockquote className="border-l-4 border-blue-500 pl-4 italic mt-2 text-gray-300">
                  {citation.excerpt}
                </blockquote>
              </div>

              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Source
                </a>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

interface CitationListProps {
  citations: CitationData[];
}

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-medium text-gray-400 mb-2">References:</h4>
      <div className="space-y-2">
        {citations.map((citation, index) => (
          <div key={citation.id} className="text-xs text-gray-400">
            <span className="text-blue-400">[{index + 1}]</span>{' '}
            <span className="text-gray-300">{citation.source}</span>
            {citation.page && <span className="ml-1">(p. {citation.page})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
