import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GlossaryItem, LessonId } from '../types/radiolab';
import { splitTextWithGlossary } from '../utils/glossaryHighlight';

interface ActivePopoverState {
  item: GlossaryItem;
  matchedTerm: string;
  rect: {
    top: number;
    bottom: number;
    left: number;
    width: number;
  };
}

interface GlossaryPopoverContextValue {
  openGlossaryItem: (item: GlossaryItem, matchedTerm: string, triggerEl: HTMLElement) => void;
  closeGlossaryItem: () => void;
  activeId: string | null;
}

const GlossaryPopoverContext = createContext<GlossaryPopoverContextValue | null>(null);

interface GlossaryPopoverProviderProps {
  currentLessonId?: LessonId;
  onOpenLesson?: (lessonId: LessonId) => void;
  children: React.ReactNode;
}

export const GlossaryPopoverProvider: React.FC<GlossaryPopoverProviderProps> = ({
  currentLessonId,
  onOpenLesson,
  children,
}) => {
  const [active, setActive] = useState<ActivePopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const closeGlossaryItem = useCallback(() => {
    setActive(null);
  }, []);

  const openGlossaryItem = useCallback(
    (item: GlossaryItem, matchedTerm: string, triggerEl: HTMLElement) => {
      const domRect = triggerEl.getBoundingClientRect();
      setActive((prev) => {
        if (
          prev &&
          prev.item.id === item.id &&
          Math.abs(prev.rect.top - domRect.top) < 4 &&
          Math.abs(prev.rect.left - domRect.left) < 4
        ) {
          return null;
        }
        return {
          item,
          matchedTerm,
          rect: {
            top: domRect.top,
            bottom: domRect.bottom,
            left: domRect.left,
            width: domRect.width,
          },
        };
      });
    },
    []
  );

  // Close on Escape, outside click, or scroll
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGlossaryItem();
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (target.closest('[data-glossary-trigger="true"]')) return;
      closeGlossaryItem();
    };

    const handleScroll = () => {
      closeGlossaryItem();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [active, closeGlossaryItem]);

  // Close when switching lesson
  useEffect(() => {
    setActive(null);
  }, [currentLessonId]);

  const positionStyle = useMemo<React.CSSProperties>(() => {
    if (!active || typeof window === 'undefined') return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = Math.min(340, vw - 24);

    if (vw < 640) {
      // Mobile: crisp floating bottom card above safe area
      return {
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 16,
      };
    }

    const triggerCenterX = active.rect.left + active.rect.width / 2;
    const left = Math.max(12, Math.min(vw - cardWidth - 12, triggerCenterX - cardWidth / 2));
    const spaceBelow = vh - active.rect.bottom;
    const placeAbove = spaceBelow < 230 && active.rect.top > 220;

    if (placeAbove) {
      return {
        position: 'fixed',
        left,
        width: cardWidth,
        bottom: vh - active.rect.top + 8,
      };
    }

    return {
      position: 'fixed',
      left,
      width: cardWidth,
      top: active.rect.bottom + 8,
    };
  }, [active]);

  const ctxValue = useMemo<GlossaryPopoverContextValue>(
    () => ({
      openGlossaryItem,
      closeGlossaryItem,
      activeId: active?.item.id ?? null,
    }),
    [openGlossaryItem, closeGlossaryItem, active?.item.id]
  );

  return (
    <GlossaryPopoverContext.Provider value={ctxValue}>
      {children}

      <AnimatePresence>
        {active && (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-label={`Definizione: ${active.item.term}`}
            style={positionStyle}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="z-50 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-2.5 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Glossario · {active.item.category}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {active.item.term}
                </h4>
              </div>

              <button
                type="button"
                onClick={closeGlossaryItem}
                aria-label="Chiudi definizione"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {active.item.formula && (
              <div className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 font-mono text-xs font-semibold text-sky-800 dark:text-sky-300">
                {active.item.formula}
              </div>
            )}

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {active.item.plainMeaning}
            </p>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/70 rounded-lg p-2 leading-relaxed">
              <strong className="text-sky-900 dark:text-sky-300">Nota rapida:</strong>{' '}
              {active.item.examTip}
            </p>

            {onOpenLesson && active.item.relatedLessonId !== currentLessonId && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const target = active.item.relatedLessonId;
                    closeGlossaryItem();
                    onOpenLesson(target);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  <span>Approfondisci nel modulo dedicato</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlossaryPopoverContext.Provider>
  );
};

interface GlossaryTextProps {
  text: string;
}

export const GlossaryText: React.FC<GlossaryTextProps> = ({ text }) => {
  const ctx = useContext(GlossaryPopoverContext);

  const segments = useMemo(() => splitTextWithGlossary(text), [text]);

  if (!ctx) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type !== 'keyword' || !seg.item) {
          return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
        }
        const item = seg.item;
        const isCurrentActive = ctx.activeId === item.id;
        return (
          <button
            key={idx}
            type="button"
            data-glossary-trigger="true"
            aria-haspopup="dialog"
            aria-expanded={isCurrentActive}
            title={`Definizione rapida: ${item.term}`}
            onClick={(e) => {
              e.stopPropagation();
              ctx.openGlossaryItem(item, seg.value, e.currentTarget);
            }}
            className={`inline text-left font-medium underline decoration-dotted underline-offset-[3px] rounded-xs px-0.5 -mx-0.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600 ${
              isCurrentActive
                ? 'bg-sky-100 dark:bg-sky-900/70 text-sky-900 dark:text-sky-100 decoration-sky-600'
                : 'text-sky-800 dark:text-sky-300 decoration-sky-500/70 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:decoration-sky-600'
            }`}
          >
            {seg.value}
          </button>
        );
      })}
    </>
  );
};
