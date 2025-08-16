'use client';

import { useState, useEffect } from 'react';

export default function LaTeXRenderer({ code, format = 'tikz' }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (code) {
      renderLaTeX();
    }
  }, [code, format]);

  const renderLaTeX = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, we'll show the code and provide options to render
      // In a production app, you'd integrate with a LaTeX rendering service
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  const openInOverleaf = () => {
    // Create a simple LaTeX document wrapper
    const fullDocument = `\\documentclass{article}
\\usepackage{tikz}
\\usepackage{pgf}
\\begin{document}

${code}

\\end{document}`;
    
    const encodedCode = encodeURIComponent(fullDocument);
    const overleafUrl = `https://www.overleaf.com/docs?template=blank&engine=pdflatex#code=${encodedCode}`;
    window.open(overleafUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">🔄 Rendering LaTeX...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h3 className="font-medium text-lg">
          📐 {format.toUpperCase()} Code
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            📋 Copy Code
          </button>
          <button
            onClick={openInOverleaf}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            📝 Open in Overleaf
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Code display */}
      <div className="flex-1 bg-gray-50 dark:bg-zinc-900 rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <pre className="p-4 text-sm leading-relaxed">
            <code className="language-latex">{code}</code>
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
        <p className="font-medium mb-1">💡 How to use this LaTeX code:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Copy the code and paste it into a LaTeX editor like Overleaf</li>
          <li>Make sure you have the required packages: <code>tikz</code>, <code>pgf</code></li>
          <li>Compile with pdflatex or xelatex</li>
          <li>Click "Open in Overleaf" for instant editing</li>
        </ul>
      </div>
    </div>
  );
}