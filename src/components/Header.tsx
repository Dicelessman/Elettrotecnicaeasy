import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { AppView } from '../types/radiolab';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'path', label: 'Percorso' },
  { id: 'review', label: 'Ripasso' },
  { id: 'lab', label: 'Laboratorio' },
  { id: 'utilities', label: 'Utilità' },
  { id: 'glossary', label: 'Glossario' },
  { id: 'groups', label: 'Gruppi' },
  { id: 'profile', label: 'Profilo' },
];

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, authLoading, profile, signInWithGoogle, signOutUser } = useStudy();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate('path')}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600 rounded"
        >
          Radiotecnica easy
        </button>

        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              currentView === item.id ||
              (item.id === 'path' && (currentView === 'lesson' || currentView === 'exam'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                  active
                    ? 'text-sky-700 dark:text-sky-400 border-sky-600 dark:border-sky-400'
                    : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          {authLoading ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              Caricamento...
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Esci ({profile.displayName.split(' ')[0] || 'Account'})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Accedi con Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Navigazione mobile"
        className="flex md:hidden items-center justify-between gap-1 overflow-x-auto border-t border-slate-100 dark:border-slate-800 px-2 py-1.5 bg-white dark:bg-slate-900 text-xs font-medium"
      >
        {NAV_ITEMS.map((item) => {
          const active =
            currentView === item.id ||
            (item.id === 'path' && (currentView === 'lesson' || currentView === 'exam'));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
