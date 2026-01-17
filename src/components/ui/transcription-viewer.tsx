import React, { useState, useRef, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { Mic, Download, Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';

export interface TranscriptionSegment {
  id: string;
  timestamp: number;
  speaker: 'user' | 'ai';
  text: string;
  confidence?: number;
}

interface TranscriptionViewerProps {
  segments: TranscriptionSegment[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function TranscriptionViewer({
  segments,
  isCollapsed = false,
  onToggle,
}: TranscriptionViewerProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const exportTranscription = () => {
    const text = segments
      .map((seg) => {
        const time = formatTimestamp(seg.timestamp);
        const speaker = seg.speaker === 'user' ? 'User' : 'AI';
        return `[${time}] ${speaker}: ${seg.text}`;
      })
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <Mic className="w-4 h-4 mr-2" />
          Show Transcription ({segments.length})
          <ChevronUp className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-96 bg-gray-900 border-gray-700 shadow-2xl flex flex-col z-40">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Live Transcription</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
          >
            {autoScroll ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={exportTranscription}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Export transcription"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Collapse"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {segments.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transcription yet</p>
            <p className="text-xs mt-1">Start speaking to see live transcription</p>
          </div>
        ) : (
          segments.map((segment) => (
            <div
              key={segment.id}
              className={`p-3 rounded-lg ${
                segment.speaker === 'user'
                  ? 'bg-blue-900/30 border-l-4 border-blue-500'
                  : 'bg-purple-900/30 border-l-4 border-purple-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium ${
                    segment.speaker === 'user' ? 'text-blue-400' : 'text-purple-400'
                  }`}
                >
                  {segment.speaker === 'user' ? 'You' : 'AI'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(segment.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-300">{segment.text}</p>
              {segment.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        segment.confidence > 0.8
                          ? 'bg-green-500'
                          : segment.confidence > 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${segment.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(segment.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
