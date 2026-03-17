'use client';

import { useEffect, useRef } from 'react';

let openModalCount = 0;

/**
 * Adds Escape-to-close, body scroll lock, and autofocus to custom modals.
 * Tracks nested modals — scroll is only restored when ALL modals close.
 *
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {Function} onClose - Function to call when Escape is pressed
 */
export function useModal(isOpen, onClose) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Track open modals for scroll lock
    openModalCount++;
    if (openModalCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    // Escape key handler
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Autofocus first input/textarea/select inside the newest modal
    const timer = setTimeout(() => {
      const modals = document.querySelectorAll('[data-modal]');
      const target = modals.length > 0 ? modals[modals.length - 1] : document;
      const focusable = target.querySelector(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
      );
      if (focusable) focusable.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      openModalCount--;
      if (openModalCount <= 0) {
        openModalCount = 0;
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);
}
