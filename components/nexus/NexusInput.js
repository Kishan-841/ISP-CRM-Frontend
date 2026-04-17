'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function NexusInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-shrink-0 items-end gap-2 border-t bg-background p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask VECTRA anything..."
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:py-2"
        style={{ maxHeight: 120 }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40 disabled:shadow-none sm:h-9 sm:w-9 active:scale-95"
        aria-label="Send"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
