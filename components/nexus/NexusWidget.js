'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, RotateCcw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import NexusInput from './NexusInput';

// Distance the pointer must travel before we treat the gesture as a drag
// (not a click). Below this, pointerup fires `toggle()` as before.
const DRAG_THRESHOLD_PX = 6;

const CORNERS = ['br', 'bl', 'tr', 'tl'];
const CORNER_CLASS = {
  br: 'bottom-4 right-4 sm:bottom-5 sm:right-5',
  bl: 'bottom-4 left-4  sm:bottom-5 sm:left-5',
  tr: 'top-4    right-4 sm:top-5    sm:right-5',
  tl: 'top-4    left-4  sm:top-5    sm:left-5',
};
const PANEL_CORNER_CLASS = {
  br: 'sm:inset-auto sm:bottom-24 sm:right-5 sm:top-auto',
  bl: 'sm:inset-auto sm:bottom-24 sm:left-5  sm:top-auto',
  tr: 'sm:inset-auto sm:top-24    sm:right-5 sm:bottom-auto',
  tl: 'sm:inset-auto sm:top-24    sm:left-5  sm:bottom-auto',
};

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

  // Draggable bubble: which corner it sticks to + transient drag state.
  // The corner persists in localStorage so users don't have to re-drag
  // every reload. Drag position drives a fixed left/top while dragging,
  // then on pointer-up we snap to the nearest corner based on viewport
  // halves.
  const [corner, setCorner] = useState('br');
  const [dragPos, setDragPos] = useState(null);   // { x, y } while dragging
  const dragStartRef = useRef(null);              // { x, y, moved }

  // Load saved corner from localStorage once on mount (client-only).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('vectra-corner');
    if (saved && CORNERS.includes(saved)) setCorner(saved);
  }, []);

  const handlePointerDown = (e) => {
    // Left-click / single touch only. Right-click + middle-click pass through.
    if (e.button !== undefined && e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* iOS Safari may throw */ }
  };

  const handlePointerMove = (e) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      start.moved = true;
    }
    if (start.moved) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e) => {
    const start = dragStartRef.current;
    if (!start) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (start.moved) {
      // Snap to whichever corner the bubble's centre is closest to.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isRight = e.clientX > vw / 2;
      const isBottom = e.clientY > vh / 2;
      const next = `${isBottom ? 'b' : 't'}${isRight ? 'r' : 'l'}`;
      setCorner(next);
      try { window.localStorage.setItem('vectra-corner', next); } catch { /* quota / private mode */ }
    } else {
      // Not a drag — treat as a click and open/close the panel.
      toggle();
    }
    setDragPos(null);
    dragStartRef.current = null;
  };

  // While dragging, clamp the centre of the bubble inside the viewport so
  // it can't be dropped outside the screen. The button is 48px (h-12) on
  // mobile, 56px (sm:h-14) on desktop — use 28px as a half-width
  // approximation; small over/undershoot is harmless visually.
  const halfBubble = 28;
  const buttonStyle = dragPos
    ? {
        position: 'fixed',
        left: Math.max(8, Math.min(window.innerWidth - halfBubble * 2 - 8, dragPos.x - halfBubble)),
        top:  Math.max(8, Math.min(window.innerHeight - halfBubble * 2 - 8, dragPos.y - halfBubble)),
        bottom: 'auto',
        right: 'auto',
        transition: 'none',
        touchAction: 'none',
        cursor: 'grabbing',
      }
    : { touchAction: 'none', cursor: 'grab' };

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
      {/* Floating bubble — draggable, snaps to nearest corner on release. */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={isOpen ? 'Close VECTRA' : 'Open VECTRA'}
        style={buttonStyle}
        className={`fixed z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-indigo-600 text-white shadow-xl transition-all hover:scale-105 active:scale-95 sm:h-14 sm:w-14 ${dragPos ? '' : CORNER_CLASS[corner]}`}
      >
        {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />}
        {!isOpen && !dragPos && (
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
            className={`
              fixed z-[60] flex flex-col overflow-hidden bg-background shadow-2xl
              inset-x-0 bottom-0 top-0 rounded-none border-0
              ${PANEL_CORNER_CLASS[corner]}
              sm:h-[min(600px,calc(100vh-120px))] sm:w-[400px] sm:rounded-2xl sm:border
            `}
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
