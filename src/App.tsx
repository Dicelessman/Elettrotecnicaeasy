import React, { Component, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { DashboardOverview } from './components/DashboardOverview';
import { ExamSimulationView } from './components/ExamSimulationView';
import { Header } from './components/Header';
import { LabSandboxView } from './components/LabSandboxView';
import { LessonView } from './components/LessonView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PreExamGlossaryView } from './components/PreExamGlossaryView';
import { QuickReviewView } from './components/QuickReviewView';
import { StudyGroupsView } from './components/StudyGroupsView';
import { UserProfileView } from './components/UserProfileView';
import { StudyProvider, useStudy } from './context/StudyContext';
import type { AppView, LessonId } from './types/radiolab';

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Qualcosa è andato storto
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Si è verificato un errore durante il caricamento o il salvataggio dei dati.
            </p>
            <p className="text-xs font-mono text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded p-2.5 break-all">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              Ricarica l’applicazione
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppShell: React.FC = () => {
  const [view, setView] = useState<AppView>('path');
  const [activeLessonId, setActiveLessonId] = useState<LessonId>('lesson-01');
  const { profile, notificationBanner, dismissNotificationBanner } = useStudy();
  const isFocusReading = view === 'lesson' && profile.focusMode;

  const openLesson = (lessonId: LessonId) => {
    setActiveLessonId(lessonId);
    setView('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (nextView: AppView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {!isFocusReading && <Header currentView={view} onNavigate={navigate} />}

      {!isFocusReading && notificationBanner && (
        <div className="bg-sky-600 text-white px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 shrink-0" />
              <span>{notificationBanner}</span>
            </div>
            <button
              type="button"
              onClick={dismissNotificationBanner}
              aria-label="Chiudi promemoria"
              className="p-1 rounded hover:bg-sky-700 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 ${
          isFocusReading ? 'max-w-5xl' : 'max-w-6xl'
        }`}
      >
        {view === 'path' && (
          <DashboardOverview
            onOpenLesson={openLesson}
            onOpenQuickReview={() => navigate('review')}
            onOpenExamSimulation={() => navigate('exam')}
            onOpenGroups={() => navigate('groups')}
            onOpenProfile={() => navigate('profile')}
          />
        )}
        {view === 'exam' && (
          <ExamSimulationView
            onOpenLesson={openLesson}
            onBackToPath={() => navigate('path')}
          />
        )}
        {view === 'review' && (
          <QuickReviewView
            onOpenLesson={openLesson}
            onBackToPath={() => navigate('path')}
          />
        )}
        {view === 'lesson' && (
          <LessonView
            lessonId={activeLessonId}
            onSelectLesson={openLesson}
            onBackToPath={() => navigate('path')}
          />
        )}
        {view === 'lab' && <LabSandboxView onOpenLesson={openLesson} />}
        {view === 'glossary' && <PreExamGlossaryView onOpenLesson={openLesson} />}
        {view === 'groups' && <StudyGroupsView onOpenLesson={openLesson} />}
        {view === 'profile' && <UserProfileView onOpenLesson={openLesson} />}
      </main>

      {!isFocusReading && (
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>Radiotecnica easy · 12 Moduli + Guida Pre-Esame</span>
            <span>Basato sul programma "Radiotecnica per Radioamatori"</span>
          </div>
        </footer>
      )}

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <StudyProvider>
        <AppShell />
      </StudyProvider>
    </AppErrorBoundary>
  );
}
