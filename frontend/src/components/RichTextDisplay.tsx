import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import renderMathInElement from 'katex/dist/contrib/auto-render.js';
import 'katex/dist/katex.min.css';
import 'react-quill-new/dist/quill.snow.css'; // For basic Quill formatting classes
import { X } from 'lucide-react';

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ html, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Find all quill formulas and convert their data-value to KaTeX
      const formulas = containerRef.current.querySelectorAll('.ql-formula');
      formulas.forEach((el) => {
        const latex = el.getAttribute('data-value');
        if (latex) {
          // Wrap with display math delimiters or use katex.render
          // Using katex.render directly on the element
          import('katex').then((katex) => {
            katex.default.render(latex, el as HTMLElement, {
              throwOnError: false,
              displayMode: true,
            });
          });
        }
      });
      
      // Also apply auto-render for any other math in the text
      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    }
  }, [html]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      const src = (target as HTMLImageElement).src;
      if (src) setExpandedImage(src);
    }
  };

  return (
    <>
      <div 
        ref={containerRef} 
        className={`ql-editor ${className}`}
        dangerouslySetInnerHTML={{ __html: html }} 
        style={{ padding: 0 }} // ql-editor adds padding by default
        onClick={handleClick}
      />

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 bg-black/50 rounded-full"
            onClick={() => setExpandedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-[90vh] object-contain bg-white rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
