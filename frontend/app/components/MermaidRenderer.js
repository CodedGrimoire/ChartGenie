'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export default function MermaidRenderer({ code }) {
  const ref = useRef(null);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });
    
    if (ref.current && code) {
      // Clear previous content
      ref.current.innerHTML = '';
      
      try {
        const uniqueId = `mermaid-${Date.now()}`;
        mermaid.render(uniqueId, code).then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        }).catch((err) => {
          console.error('Mermaid render error:', err);
          if (ref.current) {
            ref.current.innerHTML = '<p class="text-red-500">⚠️ Failed to render Mermaid diagram.</p>';
          }
        });
      } catch (err) {
        console.error('Mermaid error:', err);
        if (ref.current) {
          ref.current.innerHTML = '<p class="text-red-500">⚠️ Failed to render Mermaid diagram.</p>';
        }
      }
    }
  }, [code]);

  return <div ref={ref} className="w-full overflow-auto" />;
}