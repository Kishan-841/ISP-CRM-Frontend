'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, X, RotateCcw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import NexusInput from './NexusInput';

const SUGGESTED_QUESTIONS = [
  'How do I use this page?',
  'Who do I contact for help?',
  'What are the common workflows I should know?',
];

function QuotaPill({ quota }) {
  const { limit, remaining } = quota;
  const tone =
    remaining === 0 ? 'bg-red-500/90 text-white'
    : remaining <= 1 ? 'bg-amber-400/90 text-amber-950'
    : 'bg-white/20 text-white';

  const longLabel =
    remaining === 0 ? 'Limit reached'
    : remaining === 1 ? '1 left today'
    : `${remaining}/${limit} left`;

  return (
    <div
      title={`${limit - remaining} of ${limit} new questions used in the last 24h. Cached answers are free and do not count.`}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-colors sm:px-2.5 sm:text-[11px] ${tone}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {longLabel}
    </div>
  );
}

export default function NexusWidget({ useStoreHook }) {
  const {
    isOpen,
    messages,
    sending,
    quota,
    toggle,
    close,
    sendMessage,
    clearChat,
  } = useStoreHook();

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, isOpen]);

  // Lock body scroll when widget is open on mobile (widget overlays full screen)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen && window.matchMedia('(max-width: 640px)').matches) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating bubble */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Close VECTRA' : 'Open VECTRA'}
        className="fixed bottom-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-indigo-600 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
      >
        {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />}
        {!isOpen && (
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/30" aria-hidden />
        )}
      </button>

      {/* Chat panel — full-screen overlay on mobile, floating on desktop */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm sm:hidden"
            onClick={close}
            aria-hidden
          />

          <div
            className="
              fixed z-[60] flex flex-col overflow-hidden bg-background shadow-2xl
              inset-x-0 bottom-0 top-0 rounded-none border-0
              sm:inset-auto sm:bottom-24 sm:right-5 sm:top-auto
              sm:h-[min(600px,calc(100vh-120px))] sm:w-[400px] sm:rounded-2xl sm:border
            "
          >
            {/* Header */}
            <div className="flex flex-shrink-0 flex-col gap-2 border-b bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">VECTRA</div>
                    <div className="text-[11px] opacity-80">Your onboarding assistant</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {quota && <QuotaPill quota={quota} />}
                  <button
                    type="button"
                    onClick={clearChat}
                    aria-label="Clear chat"
                    title="Clear chat"
                    className="rounded-md p-2 transition-colors hover:bg-white/15 active:bg-white/25"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-md p-2 transition-colors hover:bg-white/15 active:bg-white/25"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-background/50 px-3 py-4 sm:px-4"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 px-2 py-8 text-center sm:py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-base font-semibold">Hi, I'm VECTRA.</div>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Ask me how to use any feature of the CRM and I'll walk you through it.
                    </p>
                  </div>
                  <div className="mt-2 flex w-full flex-col gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="rounded-lg border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted active:scale-[0.98] sm:py-1.5"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, idx) => (
                <ChatMessage
                  key={idx}
                  role={m.role}
                  content={m.content}
                  fromCache={m.fromCache}
                  isError={m.isError}
                />
              ))}

              {sending && (
                <div className="flex items-center gap-2 pl-9">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              )}
            </div>

            {/* Input */}
            <NexusInput onSend={sendMessage} disabled={sending} />
          </div>
        </>
      )}
    </>
  );
}
