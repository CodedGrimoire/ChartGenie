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
  const [isLoading, setIsLoading] = useState(false);
  
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
      const res = await fetch('https://chartgeniebackend.onrender.com/api/ping');
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
      const res = await fetch('https://chartgeniebackend.onrender.com/api/formats');
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
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = { role: 'user', content: input, format: outputFormat };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Add loading message
    const loadingMessage = {
      role: 'system',
      content: `Generating ${outputFormat} diagram...`,
      loading: true
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const res = await fetch('https://chartgeniebackend.onrender.com/api/diagram', {
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
        content: `${data.format} diagram generated successfully`,
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
        content: 'Failed to generate diagram. Please check your connection and try again.',
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
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      if (sessionId) {
        await fetch(`https://chartgeniebackend.onrender.com/api/conversation/${sessionId}`, { method: 'DELETE' });
      }
      setMessages([]);
      setDiagram(null);
      setSessionId(null);
      setMessages((prev) => [...prev, {
        role: 'system',
        content: 'Conversation cleared. Starting fresh!'
      }]);
    } catch (err) {
      console.error('❌ Failed to clear conversation:', err);
    }
  };

  const clearCache = async () => {
    try {
      await fetch('https://chartgeniebackend.onrender.com/api/cache', { method: 'DELETE' });
      setMessages((prev) => [...prev, {
        role: 'system',
        content: 'Backend cache cleared successfully'
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
        content: 'Diagram code copied to clipboard!'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  ChartGenie
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">AI-Powered Database Diagrams</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected' ? 'bg-emerald-500' :
                  backendStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-yellow-500 animate-pulse'
                }`} />
                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                  {backendStatus}
                </span>
              </div>
              
              {/* Format Selector */}
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(supportedFormats.formats || {}).map(([key, value]) => (
                  <option key={key} value={value}>
                    {value.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 h-[calc(100vh-120px)]">
          {/* Chat Sidebar */}
          <aside className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Conversation
              </h2>
              {sessionId && (
                <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>Session:</span>
                  <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                    {sessionId.substring(0, 8)}...
                  </code>
                </div>
              )}
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Start a conversation about your database schema
                  </p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-slate-900 dark:text-white ml-8'
                      : msg.error
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      : msg.loading
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 mr-8'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {msg.role === 'user' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
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
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder={sessionId ? "Add tables, modify schema, or ask questions..." : "Describe your database schema..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  disabled={backendStatus !== 'connected' || isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={backendStatus !== 'connected' || isLoading || !input.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearConversation}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                >
                  New Chat
                </button>
                <button
                  onClick={clearCache}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                >
                  Clear Cache
                </button>
                <button
                  onClick={copyDiagramCode}
                  disabled={!diagram}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors disabled:opacity-50"
                >
                  Copy Code
                </button>
                <button
                  onClick={downloadDiagram}
                  disabled={!diagram}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors disabled:opacity-50"
                >
                  Download
                </button>
              </div>
            </div>
          </aside>

          {/* Diagram Preview */}
          <main className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Diagram Preview
              </h2>
              {diagram && (
                <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center space-x-1">
                    <span>Format:</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                      {diagram.format.toUpperCase()}
                    </span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>Source:</span>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                      {diagram.source}
                    </span>
                  </span>
                  {diagram.sessionId && (
                    <span className="flex items-center space-x-1">
                      <span>Session:</span>
                      <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                        {diagram.sessionId.substring(0, 8)}...
                      </code>
                    </span>
                  )}
                </div>
              )}
            </div>

                         <div className="p-6 h-[calc(100%-120px)] overflow-auto">
               {diagram ? (
                 <div className="min-h-full">
                   <DiagramRenderer diagram={diagram} />
                 </div>
               ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      Ready to Create Diagrams
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Start by describing your database schema or requirements in the chat panel.
                    </p>
                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <p className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Try: "I need a hospital database"</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        <span>Then: "Add a pharmacy table"</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>Finally: "Connect patients to pharmacies"</span>
                      </p>
                    </div>
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <strong>Supported Formats:</strong> Mermaid, TikZ/LaTeX, PGF, PlantUML
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Universal Diagram Renderer Component
function DiagramRenderer({ diagram }) {
  if (!diagram || !diagram.code) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">No diagram code available</p>
      </div>
    );
  }

  switch (diagram.format) {
    case 'mermaid':
      return (
        <div className="w-full overflow-auto">
          <MermaidRenderer code={diagram.code} />
        </div>
      );
    
    case 'tikz':
    case 'pgf':
      return (
        <div className="w-full overflow-auto">
          <LaTeXRenderer code={diagram.code} format={diagram.format} />
        </div>
      );
    
    case 'plantuml':
      return (
        <div className="w-full overflow-auto">
          <PlantUMLRenderer code={diagram.code} />
        </div>
      );
    
    default:
      return <CodeRenderer code={diagram.code} format={diagram.format} />;
  }
}

// Code Renderer for unsupported formats
function CodeRenderer({ code, format }) {
  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">
          {format.toUpperCase()} Code
        </h3>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg overflow-auto h-full text-sm border border-slate-200 dark:border-slate-700">
        <code className="text-slate-800 dark:text-slate-200">{code}</code>
      </pre>
    </div>
  );
}