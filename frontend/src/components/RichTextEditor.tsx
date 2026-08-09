import React, { useMemo, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

// Attach katex to window for Quill formula module
(window as any).katex = katex;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const uploadToS3 = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return null;
    }
    const toastId = toast.loading('Uploading image...');
    try {
      const res = await api.post('/upload/presign', {
        fileName: file.name || 'pasted-image.png',
        contentType: file.type
      });
      const { presignedUrl, publicUrl } = res.data;
      
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      toast.success('Image uploaded!', { id: toastId });
      return publicUrl;
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image.', { id: toastId });
      return null;
    }
  }, []);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (file) {
        const url = await uploadToS3(file);
        if (url) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1, 0);
          }
        }
      }
    };
  }, [uploadToS3]);

  React.useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const root = quill.root;
    const handleNativePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            
            const url = await uploadToS3(file);
            if (url) {
              const range = quill.getSelection(true) || { index: quill.getLength() };
              quill.insertEmbed(range.index, 'image', url);
              quill.setSelection(range.index + 1, 0);
            }
          }
        }
      }
    };

    root.addEventListener('paste', handleNativePaste, true); // use capture phase
    return () => {
      root.removeEventListener('paste', handleNativePaste, true);
    };
  }, [uploadToS3]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['formula', 'image'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler
        }
      }
    }),
    [imageHandler]
  );

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        className="bg-white rounded-xl overflow-hidden border border-gray-200"
      />
    </div>
  );
};
