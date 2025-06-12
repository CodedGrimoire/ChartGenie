'use client';

import { useState, useEffect, useRef } from 'react';
import MermaidRenderer from './components/MermaidRenderer';
import LaTeXRenderer from './components/LaTeXRenderer';
import PlantUMLRenderer from './components/PlantUMLRenderer';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [diagram, setDiagram] = useState(null);
  const [outputFormat, setOutputFormat] = useState('mermaid');
  const [supportedFormats, setSupportedFormats] = useState({});
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sessionId, setSessionId] = useState(null);
  
  // Ref for the messages container
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check backend status and get supported formats on mount
  useEffect(() => {
    checkBackendStatus();
    fetchSupportedFormats();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const res = await fetch('http://localhost:3003/api/ping');
      const data = await res.json();
      setBackendStatus('connected');
      console.log('✅ Backend connected:', data);
    } catch (err) {
      setBackendStatus('disconnected');
      console.error('❌ Backend connection failed:', err);
    }
  };

  const fetchSupportedFormats = async () => {
    try {
      const res = await fetch('http://localhost:3003/api/formats');
      const data = await res.json();
      setSupportedFormats(data);
    } catch (err) {
      console.error('❌ Failed to fetch formats:', err);
      // Fallback to default formats
      setSupportedFormats({
        formats: {
          MERMAID: 'mermaid',
          LATEX_TIKZ: 'tikz',
          LATEX_PGF: 'pgf',
          PLANTUML: 'plantuml'
        }
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, format: outputFormat };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Add loading message
    const loadingMessage = {
      role: 'system',
      content: `🔄 Generating ${outputFormat} diagram...`,
      loading: true
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const res = await fetch('http://localhost:3003/api/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          format: outputFormat,
          sessionId: sessionId,
          currentDiagram: diagram?.code || null
        }),
      });

      const data = await res.json();

      // Update session ID if this is the first request
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      // Remove loading message and add success message
      setMessages((prev) => prev.filter(msg => !msg.loading));
      
      const systemMessage = {
        role: 'system',
        content: `✅ ${data.format} diagram generated! (Source: ${data.source})`,
        metadata: {
          source: data.source,
          format: data.format,
          message: data.message,
          sessionId: data.sessionId
        }
      };

      setMessages((prev) => [...prev, systemMessage]);
      
      // Set diagram with metadata
      setDiagram({
        code: data.diagramCode,
        format: data.format,
        source: data.source,
        originalPrompt: input,
        sessionId: data.sessionId
      });

    } catch (err) {
      // Remove loading message and add error message
      setMessages((prev) => prev.filter(msg => !msg.loading));
      
      console.error('❌ Backend error:', err);
      
      const errorMessage = {
        role: 'system',
        content: '❌ Failed to generate diagram. Check backend connection.',
        error: true
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      // Show fallback diagram
      setDiagram({
        code: 'graph TD;\nerror("Failed to reach backend")',
        format: 'mermaid',
        source: 'error',
        originalPrompt: input
      });
    }
  };

  const clearConversation = async () => {
    try {
      if (sessionId) {
        await fetch(`http://localhost:3003/api/conversation/${sessionId}`, { method: 'DELETE' });
      }
      setMessages([]);
      setDiagram(null);
      setSessionId(null);
      setMessages((prev) => [...prev, {
        role: 'system',
        content: '🗑️ Conversation cleared. Starting fresh!'
      }]);
    } catch (err) {
      console.error('❌ Failed to clear conversation:', err);
    }
  };

  const clearCache = async () => {
    try {
      await fetch('http://localhost:3003/api/cache', { method: 'DELETE' });
      setMessages((prev) => [...prev, {
        role: 'system',
        content: '🗑️ Backend cache cleared successfully'
      }]);
    } catch (err) {
      console.error('❌ Failed to clear cache:', err);
    }
  };

  const copyDiagramCode = () => {
    if (diagram?.code) {
      navigator.clipboard.writeText(diagram.code);
      setMessages((prev) => [...prev, {
        role: 'system',
        content: '📋 Diagram code copied to clipboard!'
      }]);
    }
  };

  const downloadDiagram = () => {
    if (diagram?.code) {
      const fileExtension = diagram.format === 'mermaid' ? 'mmd' : 
                           diagram.format === 'tikz' ? 'tex' :
                           diagram.format === 'pgf' ? 'tex' : 'txt';
      
      const blob = new Blob([diagram.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] h-screen overflow-hidden">
      {/* Chat Sidebar */}
      <aside className="bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen">
        {/* Fixed Header Section */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-2">🧠 Chat with ChartGenie</h2>
          
          {/* Backend Status */}
          <div className={`text-xs px-2 py-1 rounded mb-2 ${
            backendStatus === 'connected' ? 'bg-green-100 text-green-800' :
            backendStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            Backend: {backendStatus}
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="text-xs px-2 py-1 rounded mb-2 bg-blue-100 text-blue-800">
              Session: {sessionId.substring(0, 8)}...
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Output Format:</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full p-2 rounded border dark:bg-zinc-800 dark:border-zinc-600 text-sm"
            >
              {Object.entries(supportedFormats.formats || {}).map(([key, value]) => (
                <option key={key} value={value}>
                  {value.toUpperCase()} - {key.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Messages Section */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-100 dark:bg-blue-800 text-black dark:text-white'
                  : msg.error
                  ? 'bg-red-100 dark:bg-red-800 text-black dark:text-white'
                  : msg.loading
                  ? 'bg-yellow-100 dark:bg-yellow-800 text-black dark:text-white'
                  : 'bg-gray-200 dark:bg-zinc-700 text-black dark:text-white'
              }`}
            >
              <div>{msg.content}</div>
              {msg.format && (
                <div className="text-xs opacity-75 mt-1">Format: {msg.format}</div>
              )}
              {msg.metadata && (
                <div className="text-xs opacity-75 mt-1">
                  {msg.metadata.message}
                </div>
              )}
            </div>
          ))}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Section */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={sessionId ? "Add tables, modify schema, or ask questions..." : "Describe your database schema..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-600"
              disabled={backendStatus !== 'connected'}
            />
            <button
              onClick={handleSend}
              disabled={backendStatus !== 'connected'}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:bg-gray-400"
            >
              Send
            </button>
          </div>
          
          {/* Control Buttons */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={clearConversation}
              className="px-2 py-1 bg-blue-200 dark:bg-blue-700 rounded hover:bg-blue-300"
            >
              New Chat
            </button>
            <button
              onClick={clearCache}
              className="px-2 py-1 bg-gray-200 dark:bg-zinc-700 rounded hover:bg-gray-300"
            >
              Clear Cache
            </button>
            <button
              onClick={copyDiagramCode}
              disabled={!diagram}
              className="px-2 py-1 bg-gray-200 dark:bg-zinc-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Copy Code
            </button>
            <button
              onClick={downloadDiagram}
              disabled={!diagram}
              className="px-2 py-1 bg-gray-200 dark:bg-zinc-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Download
            </button>
          </div>
        </div>
      </aside>

      {/* Preview Pane */}
      <main className="p-8 overflow-y-auto bg-gray-50 dark:bg-zinc-800 text-black dark:text-white">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">📊 Diagram Preview</h1>
          {diagram && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Format: {diagram.format} | Source: {diagram.source}
              {diagram.sessionId && (
                <span> | Session: {diagram.sessionId.substring(0, 8)}...</span>
              )}
              {diagram.originalPrompt && (
                <span> | Last: "{diagram.originalPrompt}"</span>
              )}
            </div>
          )}
        </div>

        <div className="w-full h-[80vh] rounded-lg border border-dashed border-zinc-400 dark:border-zinc-600 p-4">
          {diagram ? (
            <DiagramRenderer diagram={diagram} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500">
                <p className="mb-2">Start a conversation about your database schema</p>
                <p className="text-sm mb-4">
                  Try: "I need a hospital database" → "Add a pharmacy table" → "Connect patients to pharmacies"
                </p>
                <p className="text-xs">
                  💬 Conversational: Ask for modifications, additions, or completely new schemas
                </p>
                <p className="text-xs mt-1">
                  🔧 Supports: Mermaid, TikZ/LaTeX, PGF, PlantUML
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Universal Diagram Renderer Component
function DiagramRenderer({ diagram }) {
  if (!diagram || !diagram.code) {
    return <p className="text-red-500">No diagram code available</p>;
  }

  switch (diagram.format) {
    case 'mermaid':
      return <MermaidRenderer code={diagram.code} />;
    
    case 'tikz':
    case 'pgf':
      return <LaTeXRenderer code={diagram.code} format={diagram.format} />;
    
    case 'plantuml':
      return <PlantUMLRenderer code={diagram.code} />;
    
    default:
      return <CodeRenderer code={diagram.code} format={diagram.format} />;
  }
}

// Code Renderer for unsupported formats
function CodeRenderer({ code, format }) {
  return (
    <div className="w-full h-full">
      <div className="mb-2 text-sm font-medium">
        {format.toUpperCase()} Code:
      </div>
      <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded overflow-auto h-full text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}