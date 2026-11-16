import React from 'react';
import type { BadgeId } from '../types/radiolab';

interface BadgeGraphicProps {
  badgeId: BadgeId;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const BADGE_PALETTES: Record<BadgeId, { ring: string; bg: string; fg: string; accent: string }> = {
  'badge-01': { ring: '#0284c7', bg: '#e0f2fe', fg: '#0369a1', accent: '#f59e0b' },
  'badge-02': { ring: '#059669', bg: '#d1fae5', fg: '#047857', accent: '#0284c7' },
  'badge-03': { ring: '#0284c7', bg: '#dbeafe', fg: '#1d4ed8', accent: '#059669' },
  'badge-04': { ring: '#d97706', bg: '#fef3c7', fg: '#b45309', accent: '#0284c7' },
  'badge-05': { ring: '#ea580c', bg: '#ffedd5', fg: '#c2410c', accent: '#0f172a' },
  'badge-06': { ring: '#dc2626', bg: '#fee2e2', fg: '#b91c1c', accent: '#059669' },
  'badge-07': { ring: '#0d9488', bg: '#ccfbf1', fg: '#0f766e', accent: '#0284c7' },
  'badge-08': { ring: '#4f46e5', bg: '#e0e7ff', fg: '#4338ca', accent: '#059669' },
  'badge-09': { ring: '#059669', bg: '#ecfdf5', fg: '#065f46', accent: '#d97706' },
  'badge-10': { ring: '#0284c7', bg: '#f0f9ff', fg: '#0c4a6e', accent: '#dc2626' },
  'badge-11': { ring: '#059669', bg: '#d1fae5', fg: '#064e3b', accent: '#0284c7' },
  'badge-12': { ring: '#d97706', bg: '#fef9c3', fg: '#854d0e', accent: '#0284c7' },
  'wbadge-01': { ring: '#d97706', bg: '#fffbeb', fg: '#92400e', accent: '#f59e0b' },
  'wbadge-02': { ring: '#0284c7', bg: '#f0f9ff', fg: '#075985', accent: '#f59e0b' },
  'wbadge-03': { ring: '#0d9488', bg: '#f0fdfa', fg: '#115e59', accent: '#f59e0b' },
  'wbadge-04': { ring: '#b45309', bg: '#fef3c7', fg: '#78350f', accent: '#0284c7' },
};

export const BadgeGraphic: React.FC<BadgeGraphicProps> = ({
  badgeId,
  unlocked = true,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-28 h-28' : 'w-16 h-16';
  const pal = unlocked
    ? BADGE_PALETTES[badgeId]
    : { ring: '#94a3b8', bg: '#f1f5f9', fg: '#64748b', accent: '#94a3b8' };

  const isWeekly = badgeId.startsWith('wbadge-');

  return (
    <svg
      viewBox="0 0 80 80"
      className={`${dim} shrink-0 select-none ${unlocked ? '' : 'opacity-65 grayscale'}`}
      role="img"
      aria-label={`Emblema ${badgeId}`}
    >
      {/* Outer circular medal for modules OR octagonal gold-rimmed shield for weekly challenges */}
      {isWeekly ? (
        <>
          <polygon
            points="40,4 66,14 74,40 62,65 40,76 18,65 6,40 14,14"
            fill={pal.bg}
            stroke={pal.ring}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon
            points="40,10 61,18 68,40 58,60 40,69 22,60 12,40 19,18"
            fill="none"
            stroke={pal.accent}
            strokeOpacity="0.65"
            strokeWidth="1.3"
            strokeDasharray="3 2"
          />
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r="36" fill={pal.bg} stroke={pal.ring} strokeWidth="3.5" />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke={pal.ring}
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        </>
      )}

      {/* Custom emblem per badge */}
      {badgeId === 'badge-01' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.2">
          <ellipse cx="40" cy="40" rx="18" ry="8" transform="rotate(30 40 40)" />
          <ellipse cx="40" cy="40" rx="18" ry="8" transform="rotate(-30 40 40)" />
          <circle cx="40" cy="40" r="4" fill={pal.accent} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-02' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.4" strokeLinecap="round">
          <rect x="20" y="29" width="16" height="22" rx="2.5" fill="#ffffff" />
          <rect x="44" y="29" width="16" height="22" rx="2.5" fill="#ffffff" />
          <path d="M 28 29 V 23 H 52 V 29" stroke={pal.accent} />
          <path d="M 25 40 H 31 M 28 37 V 43" />
          <path d="M 49 40 H 55 M 52 37 V 43" />
        </g>
      )}

      {badgeId === 'badge-03' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.6" strokeLinecap="round">
          <line x1="18" y1="40" x2="62" y2="40" strokeOpacity="0.35" strokeWidth="1.4" />
          <path d="M 18 40 Q 25 22, 32 40 T 46 40 T 60 40" stroke={pal.fg} />
          <circle cx="32" cy="40" r="2.8" fill={pal.accent} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-04' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <line x1="20" y1="40" x2="34" y2="40" />
          <line x1="35" y1="25" x2="35" y2="55" strokeWidth="3.5" />
          <line x1="45" y1="25" x2="45" y2="55" strokeWidth="3.5" stroke={pal.accent} />
          <line x1="46" y1="40" x2="60" y2="40" />
        </g>
      )}

      {badgeId === 'badge-05' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M 18 44 H 24 A 5 5 0 0 1 34 44 A 5 5 0 0 1 44 44 A 5 5 0 0 1 54 44 H 62" />
          <line x1="25" y1="31" x2="55" y2="31" stroke={pal.accent} strokeDasharray="3 2" />
          <line x1="25" y1="26" x2="55" y2="26" stroke={pal.accent} strokeOpacity="0.5" />
        </g>
      )}

      {badgeId === 'badge-06' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.2" strokeLinecap="round">
          <path d="M 20 48 A 20 20 0 0 1 60 48" strokeWidth="3" />
          <path d="M 23 48 A 17 17 0 0 1 38 31" stroke={pal.accent} strokeWidth="3.5" />
          <line x1="40" y1="50" x2="31" y2="33" stroke="#0f172a" strokeWidth="2.4" />
          <circle cx="40" cy="50" r="3" fill={pal.fg} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-07' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M 18 52 C 28 52, 34 24, 40 24 C 46 24, 52 52, 62 52" />
          <line x1="40" y1="22" x2="40" y2="56" stroke={pal.accent} strokeDasharray="2.5 2.5" />
          <circle cx="40" cy="24" r="3" fill={pal.accent} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-08' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M 18 30 H 34 L 58 52" />
          <line x1="34" y1="30" x2="34" y2="54" stroke={pal.accent} strokeDasharray="3 3" strokeWidth="1.6" />
          <circle cx="34" cy="30" r="2.8" fill={pal.accent} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-09' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.4" strokeLinejoin="round">
          <polygon points="30,28 50,40 30,52" fill="#ffffff" />
          <line x1="50" y1="27" x2="50" y2="53" strokeWidth="3.2" stroke={pal.accent} />
          <line x1="18" y1="40" x2="30" y2="40" />
          <line x1="50" y1="40" x2="62" y2="40" />
        </g>
      )}

      {badgeId === 'badge-10' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.4" strokeLinecap="round">
          <path d="M 20 40 C 24 34, 28 46, 32 40 C 36 24, 40 56, 44 40 C 48 30, 52 50, 56 40 L 62 40" />
          <circle cx="40" cy="22" r="2.8" fill={pal.accent} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-11' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <line x1="40" y1="56" x2="40" y2="28" />
          <line x1="40" y1="28" x2="21" y2="46" stroke={pal.accent} />
          <line x1="40" y1="28" x2="59" y2="46" stroke={pal.accent} />
          <circle cx="40" cy="26" r="3" fill={pal.fg} stroke="none" />
        </g>
      )}

      {badgeId === 'badge-12' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.2" strokeLinejoin="round">
          <polygon
            points="40,18 45,31 59,31 48,40 52,54 40,45 28,54 32,40 21,31 35,31"
            fill={pal.accent}
            stroke={pal.fg}
          />
        </g>
      )}

      {badgeId === 'wbadge-01' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="43,19 26,42 39,42 36,61 54,37 41,37" fill={pal.accent} />
          <path d="M 22 25 L 25 28 M 58 25 L 55 28" stroke={pal.ring} />
        </g>
      )}

      {badgeId === 'wbadge-02' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 40 20 L 56 27 V 41 C 56 51, 48 58, 40 61 C 32 58, 24 51, 24 41 V 27 Z" fill="#ffffff" />
          <path d="M 29 40 Q 34 31, 40 40 T 51 40" stroke={pal.accent} strokeWidth="2.6" />
        </g>
      )}

      {badgeId === 'wbadge-03' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="40,20 57,50 23,50" fill="#ffffff" />
          <line x1="20" y1="38" x2="31" y2="38" stroke={pal.accent} strokeWidth="2.6" />
          <line x1="49" y1="34" x2="60" y2="31" stroke={pal.ring} />
          <line x1="49" y1="40" x2="61" y2="40" stroke={pal.accent} />
          <line x1="49" y1="46" x2="60" y2="49" stroke={pal.fg} />
        </g>
      )}

      {badgeId === 'wbadge-04' && (
        <g stroke={pal.fg} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 22 49 C 24 55, 31 59, 40 59 C 49 59, 56 55, 58 49" stroke={pal.ring} />
          <polygon
            points="40,18 45,30 58,30 48,38 52,50 40,43 28,50 32,38 22,30 35,30"
            fill={pal.accent}
          />
        </g>
      )}
    </svg>
  );
};
