import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'default' | 'subtle';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'default' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          variant === 'default'
            ? 'bg-sky-600 text-white hover:bg-sky-700'
            : 'bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-700'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installa App Offline</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Installa su iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <h3
                    id="ios-pwa-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-50"
                  >
                    Installa su iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Chiudi guida"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400">1.</span>
                  <span>
                    Tocca il pulsante{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                      Condividi <Share className="w-3.5 h-3.5 inline" />
                    </strong>{' '}
                    nella barra di Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400">2.</span>
                  <span>
                    Scorri verso il basso e tocca{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      Aggiungi alla schermata Home
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-sky-700 dark:text-sky-400">3.</span>
                  <span>
                    Apri <strong>Radio easy</strong> dalla Home per studiare i 12 moduli anche senza connessione.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-sky-600 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
