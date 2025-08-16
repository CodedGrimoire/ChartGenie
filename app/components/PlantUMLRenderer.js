'use client';

import { useState, useEffect } from 'react';

export default function PlantUMLRenderer({ code }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (code) {
      renderPlantUML();
    }
  }, [code]);

  const renderPlantUML = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use PlantUML's online service to render the diagram
      const encodedCode = encodePlantUML(code);
      const plantUMLUrl = `https://www.plantuml.com/plantuml/png/${encodedCode}`;
      
      // Test if the image loads successfully
      const img = new Image();
      img.onload = () => {
        setImageUrl(plantUMLUrl);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError('Failed to render PlantUML diagram');
        setIsLoading(false);
      };
      img.src = plantUMLUrl;

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Simple PlantUML encoding (basic implementation)
  const encodePlantUML = (uml) => {
    // This is a simplified encoding - in production, use the official PlantUML encoder
    try {
      const compressed = btoa(uml);
      return compressed;
    } catch (err) {
      console.error('PlantUML encoding error:', err);
      return btoa('@startuml\n' + uml + '\n@enduml');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  const openInPlantUMLEditor = () => {
    const encodedCode = encodeURIComponent(code);
    const plantUMLEditorUrl = `https://www.plantuml.com/plantuml/uml/${encodePlantUML(code)}`;
    window.open(plantUMLEditorUrl, '_blank');
  };

  const downloadImage = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'plantuml-diagram.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">🔄 Rendering PlantUML diagram...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h3 className="font-medium text-lg">
          🌱 PlantUML Diagram
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            📋 Copy Code
          </button>
          <button
            onClick={openInPlantUMLEditor}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            🌐 Open in PlantUML
          </button>
          {imageUrl && (
            <button
              onClick={downloadImage}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              💾 Download PNG
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <p className="text-sm mt-1">Showing code instead:</p>
        </div>
      )}

      {/* Rendered diagram or code fallback */}
      <div className="flex-1 flex">
        {/* Image preview */}
        {imageUrl && !error && (
          <div className="flex-1 bg-white rounded-lg border p-4 mr-4 flex items-center justify-center overflow-auto">
            <img 
              src={imageUrl} 
              alt="PlantUML Diagram" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Code view */}
        <div className={`${imageUrl && !error ? 'w-1/3' : 'flex-1'} bg-gray-50 dark:bg-zinc-900 rounded-lg overflow-hidden`}>
          <div className="p-2 bg-gray-200 dark:bg-zinc-800 text-sm font-medium">
            PlantUML Code:
          </div>
          <div className="h-full overflow-auto">
            <pre className="p-4 text-sm leading-relaxed">
              <code className="language-plantuml">{code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm">
        <p className="font-medium mb-1">💡 PlantUML Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Diagrams are rendered using PlantUML's online service</li>
          <li>Click "Open in PlantUML" to edit online</li>
          <li>Download the PNG for presentations or documentation</li>
          <li>Code can be used in any PlantUML-compatible tool</li>
        </ul>
      </div>
    </div>
  );
}