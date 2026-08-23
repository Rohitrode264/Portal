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

export const RichTextDisplay: React.FC<RichTextDisplayProps> = React.memo(({ html, className = '' }) => {
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

      // Add responsive styling and "click to expand" label to all images
      const images = containerRef.current.querySelectorAll('img');
      images.forEach((img) => {
        // Add responsive and interactive classes
        img.classList.add('cursor-pointer', 'hover:opacity-90', 'transition-opacity', 'max-h-64', 'sm:max-h-80', 'object-contain', 'rounded-xl', 'border', 'border-gray-100', 'shadow-sm', 'bg-white', 'my-2', 'max-w-full');
        
        // Prevent adding multiple labels if html changes and effect reruns
        if (!img.nextElementSibling?.classList.contains('expand-label')) {
          const label = document.createElement('div');
          label.className = 'expand-label text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 mb-4 flex items-center gap-1 w-full justify-center';
          label.innerHTML = '<span class="text-blue-500">↗</span> Click on the image to expand';
          
          // Instead of wrapping (which might break Quill's p tags), just insert the label after the image
          img.parentNode?.insertBefore(label, img.nextSibling);
        }
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
});
