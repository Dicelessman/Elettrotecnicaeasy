import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BellRing,
  BookMarked,
  Calendar,
  CheckCircle2,
  Clock,
  Cloud,
  Compass,
  Download,
  EyeOff,
  Flame,
  Globe,
  Lock,
  Moon,
  NotebookPen,
  Plus,
  Printer,
  RefreshCw,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { BADGES, LESSONS, SCOUT_RANKS } from '../data/curriculum';
import { DOMAIN_OPTIONS } from '../data/domainContent';
import { useStudy } from '../context/StudyContext';
import type { DailyGoalMinutes, DayKey, ExampleDomain, LessonId, ThemeMode } from '../types/radiolab';
import {
  DAY_LABELS,
  downloadDailyReminderIcs,
  formatShortItalianDate,
  getLastSevenDateKeys,
} from '../utils/reminders';
import {
  getOrCreateFcmDeviceId,
  showBrowserOrSwNotification,
} from '../utils/fcm';
import { WEEKLY_BADGES } from '../utils/weeklyChallenges';
import { isVibrationSupported, triggerGamificationFeedback } from '../utils/feedbackAudio';
import { SMART_GLOSSARY_ENTRIES } from '../utils/smartGlossary';
import { downloadStudyNotebookMarkdown } from '../utils/studyNotebookExport';
import { BadgeGraphic } from './BadgeGraphic';
import { PrintableNotebookModal } from './PrintableNotebookModal';
import { PWAInstallButton } from './PWAInstallButton';
import { UserAnalyticsSection } from './UserAnalyticsSection';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface UserProfileViewProps {
  onOpenLesson?: (lessonId: LessonId) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onOpenLesson }) => {
  const {
    user,
    authError,
    profile,
    lessonProgress,
    lessonNotes,
    studyLogs,
    fcmDevices,
    leaderboardEntries,
    currentRank,
    nextRank,
    proMode,
    setProMode,
    signInWithGoogle,
    signOutUser,
    updateUserPreferences,
    updateReminderSettings,
    registerFcmDevice,
    removeFcmDevice,
  } = useStudy();

  const prefersReducedMotion = useReducedMotion();
  const { isInstalled } = usePWAInstall();
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [swActive, setSwActive] = useState(
    () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
  );
  const [displayNameInput, setDisplayNameInput] = useState(profile.displayName);
  const [nameSaved, setNameSaved] = useState(false);

  const [enabled, setEnabled] = useState(profile.reminderEnabled);
  const [fcmEnabled, setFcmEnabled] = useState(profile.fcmEnabled);
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    profile.reminderTimes.length > 0 ? profile.reminderTimes : [profile.reminderTime || '19:30']
  );
  const [newTimeInput, setNewTimeInput] = useState('08:30');
  const [timezone, setTimezone] = useState(profile.reminderTimezone || 'Europe/Rome');
  const [days, setDays] = useState<DayKey[]>(profile.reminderDays);
  const [message, setMessage] = useState(profile.reminderMessage);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [fcmLoading, setFcmLoading] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const [fcmFeedback, setFcmFeedback] = useState<{
    tone: 'success' | 'info' | 'warn';
    text: string;
  } | null>(null);

  const localDeviceId = React.useMemo(() => getOrCreateFcmDeviceId(), []);
  const timezoneOptions = React.useMemo(() => {
    const common = [
      'Europe/Rome',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'America/New_York',
      'America/Los_Angeles',
      'UTC',
    ];
    const set = new Set<string>(common);
    try {
      const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      if (typeof intlAny.supportedValuesOf === 'function') {
        for (const tz of intlAny.supportedValuesOf('timeZone')) {
          set.add(tz);
        }
      }
    } catch {
      // Fallback to common list
    }
    if (profile.reminderTimezone) set.add(profile.reminderTimezone);
    if (timezone) set.add(timezone);
    return Array.from(set).sort();
  }, [profile.reminderTimezone, timezone]);

  useEffect(() => {
    setDisplayNameInput(profile.displayName);
    setEnabled(profile.reminderEnabled);
    setFcmEnabled(profile.fcmEnabled);
    setReminderTimes(
      profile.reminderTimes.length > 0 ? profile.reminderTimes : [profile.reminderTime || '19:30']
    );
    setTimezone(profile.reminderTimezone || 'Europe/Rome');
    setDays(profile.reminderDays);
    setMessage(profile.reminderMessage);
  }, [profile]);

  useEffect(() => {
    const onOfflineReady = () => setSwActive(true);
    window.addEventListener('pwa-offline-ready', onOfflineReady);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(() => setSwActive(true));
    }
    return () => window.removeEventListener('pwa-offline-ready', onOfflineReady);
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    await updateUserPreferences({ displayName: displayNameInput.trim() });
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 3000);
  };

  const toggleDay = (day: DayKey) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddTimeSlot = (candidate?: string) => {
    const target = (candidate ?? newTimeInput).trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(target)) return;
    if (reminderTimes.includes(target)) return;
    if (reminderTimes.length >= 5) {
      setSavedNotice('Puoi configurare fino a un massimo di 5 orari giornalieri.');
      window.setTimeout(() => setSavedNotice(null), 4000);
      return;
    }
    setReminderTimes((prev) => [...prev, target].sort());
  };

  const handleRemoveTimeSlot = (slot: string) => {
    if (reminderTimes.length <= 1) return;
    setReminderTimes((prev) => prev.filter((t) => t !== slot));
  };

  const handleSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    const sortedTimes = [...reminderTimes].sort();
    await updateReminderSettings({
      reminderEnabled: enabled,
      fcmEnabled,
      reminderTime: sortedTimes[0] || '19:30',
      reminderTimes: sortedTimes,
      reminderTimezone: timezone,
      reminderDays: days,
      reminderMessage: message,
    });
    setSavedNotice(
      user
        ? 'Orari personalizzati e preferenze FCM salvati e sincronizzati sul cloud!'
        : 'Orari salvati in locale. Accedi con Google per sincronizzarli su più dispositivi.'
    );
    window.setTimeout(() => setSavedNotice(null), 4500);
  };

  const handleActivateFcmPush = async () => {
    setFcmLoading(true);
    setFcmFeedback(null);
    try {
      const result = await registerFcmDevice();
      if (typeof Notification !== 'undefined') {
        setNotifStatus(Notification.permission);
      } else {
        setNotifStatus(result.status);
      }

      if (result.status === 'granted') {
        setEnabled(true);
        setFcmEnabled(true);
        setFcmFeedback({ tone: 'success', text: result.message });
        await showBrowserOrSwNotification(
          'Radiotecnica easy · Notifiche Push attive!',
          `Promemoria impostati alle ${reminderTimes.join(', ')} (${timezone}).`
        );
      } else if (result.status === 'permission-only') {
        setEnabled(true);
        setFcmFeedback({ tone: 'info', text: result.message });
        await showBrowserOrSwNotification(
          'Radiotecnica easy · Notifiche attive!',
          `Promemoria pronti alle ${reminderTimes.join(', ')}.`
        );
      } else {
        setFcmFeedback({ tone: 'warn', text: result.message });
      }
    } finally {
      setFcmLoading(false);
    }
  };

  const handleTestNotification = async () => {
    const sent = await showBrowserOrSwNotification(
      'Radiotecnica easy · Promemoria di prova',
      message || `Obiettivo di oggi: ${profile.dailyGoalMinutes} minuti di studio!`
    );
    if (sent) {
      setSavedNotice('Notifica di prova inviata al dispositivo.');
    } else {
      setSavedNotice('Attiva prima il permesso notifiche dal pulsante Notifiche Push (FCM).');
    }
    window.setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setRemovingDeviceId(deviceId);
    try {
      await removeFcmDevice(deviceId);
      setFcmFeedback({
        tone: 'info',
        text: 'Dispositivo disassociato dalle notifiche push.',
      });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const completedLessonsCount = LESSONS.filter((l) => lessonProgress[l.id]?.completed).length;
  const attemptedQuizzes = Object.values(lessonProgress).filter((p) => p.quizAttempts > 0);
  const avgQuizScore =
    attemptedQuizzes.length > 0
      ? Math.round(
          attemptedQuizzes.reduce((acc, p) => acc + p.quizBestScore, 0) / attemptedQuizzes.length
        )
      : 0;

  const rankSpan = nextRank ? Math.max(1, nextRank.minXp - currentRank.minXp) : 1;
  const rankPct = nextRank
    ? Math.min(100, Math.max(0, Math.round(((profile.xp - currentRank.minXp) / rankSpan) * 100)))
    : 100;

  const lastSeven = getLastSevenDateKeys();
  const maxMinutes = Math.max(
    profile.dailyGoalMinutes,
    ...lastSeven.map((k) => studyLogs[k]?.minutesStudied ?? 0)
  );

  return (
    <div className="space-y-8">
      {/* 1. Multi-User Account & Nickname */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                {user
                  ? `Profilo di ${profile.displayName}`
                  : 'Profilo Studente · Modalità Locale'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {user
                  ? `${user.email || ''} · Progressi, tema, ambito esempi e promemoria sincronizzati su Cloud Firestore.`
                  : 'Accedi con Google per usare Radiotecnica easy su più dispositivi o condividere lo stesso computer tra utenti diversi.'}
              </p>
              {authError && (
                <p className="text-xs text-red-700 dark:text-red-400 font-medium mt-1">
                  {authError}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cambia Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Disconnetti
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                Accedi con Google
              </button>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSaveName(e)}
          className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1 max-w-sm">
            <label
              htmlFor="profile-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nome visualizzato / Nominativo
            </label>
            <input
              id="profile-name"
              type="text"
              maxLength={40}
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Es. Marco · IU2XYZ"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Aggiorna Nome
          </button>
          {nameSaved && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Nome aggiornato!
            </span>
          )}
        </form>
      </section>

      {/* 2. Preferences: Theme (Light/Dark), Example Domain (3 choices), Daily Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Aspetto e Ritmo di Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalizza il tema visivo e quanti minuti dedicare ogni giorno.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Tema dell’interfaccia
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'light' as ThemeMode, label: 'Tema Chiaro', Icon: Sun },
                  { id: 'dark' as ThemeMode, label: 'Tema Scuro', Icon: Moon },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = profile.theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void updateUserPreferences({ theme: id })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Obiettivo giornaliero
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([5, 15, 30] as DailyGoalMinutes[]).map((min) => {
                const active = profile.dailyGoalMinutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => void updateUserPreferences({ dailyGoalMinutes: min })}
                    className={`py-2 text-xs font-mono font-semibold rounded-lg border cursor-pointer transition-colors ${
                      active
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 text-sky-900 dark:text-sky-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {min} min/g
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <EyeOff className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Modalità Concentrazione
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  Nasconde menu superiore, banner notifiche e footer durante la lettura delle lezioni.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profile.focusMode}
              onClick={() => void updateUserPreferences({ focusMode: !profile.focusMode })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                profile.focusMode
                  ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {profile.focusMode ? 'Attiva' : 'Disattiva'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Modalità PRO (Laboratorio Avanzato)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  Abilita il banco guasti &ldquo;Trova il guasto&rdquo;, il ponte Utilità → Laboratorio e QRN/QRM in Morse.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={proMode}
              onClick={() => setProMode(!proMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                proMode
                  ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {proMode ? 'Attiva' : 'Disattiva'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {profile.soundEffectsEnabled ? (
                  <Volume2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Effetti Sonori (Audio)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    Riproduce segnali acustici al completamento dei quiz e allo sblocco dei badge.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.soundEffectsEnabled}
                onClick={() => {
                  const nextVal = !profile.soundEffectsEnabled;
                  void updateUserPreferences({ soundEffectsEnabled: nextVal });
                  if (nextVal) {
                    triggerGamificationFeedback('preview', {
                      soundEffectsEnabled: true,
                      hapticFeedbackEnabled: false,
                    });
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  profile.soundEffectsEnabled
                    ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {profile.soundEffectsEnabled ? 'Attivi' : 'Disattivi'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Vibrate
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    profile.hapticFeedbackEnabled
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Feedback Aptico (Vibrazione)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {isVibrationSupported()
                      ? 'Attiva una breve vibrazione su quiz completati e nuovi distintivi.'
                      : 'Attivo sui dispositivi mobili compatibili (la preferenza resta salvata nel profilo).'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.hapticFeedbackEnabled}
                onClick={() => {
                  const nextVal = !profile.hapticFeedbackEnabled;
                  void updateUserPreferences({ hapticFeedbackEnabled: nextVal });
                  if (nextVal) {
                    triggerGamificationFeedback('preview', {
                      soundEffectsEnabled: false,
                      hapticFeedbackEnabled: true,
                    });
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  profile.hapticFeedbackEnabled
                    ? 'bg-sky-600 border-sky-600 text-white hover:bg-sky-700'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {profile.hapticFeedbackEnabled ? 'Attivo' : 'Disattivo'}
              </button>
            </div>

            {(profile.soundEffectsEnabled || profile.hapticFeedbackEnabled) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    triggerGamificationFeedback('badgeUnlock', {
                      soundEffectsEnabled: profile.soundEffectsEnabled,
                      hapticFeedbackEnabled: profile.hapticFeedbackEnabled,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Prova Effetto Badge</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Studio Offline e App (PWA)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {isInstalled
                    ? `App installata in modalità standalone · I ${LESSONS.length} moduli e i quiz funzionano anche senza rete.`
                    : swActive
                      ? 'Cache offline attiva: puoi consultare i moduli, simulatori e quiz anche senza connessione internet.'
                      : 'Salva l’app sul dispositivo per studiare i moduli già caricati anche offline.'}
                </p>
              </div>
            </div>
            <PWAInstallButton />
          </div>
        </section>

        {/* 3 Thematic Example Domains */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-2.5">
            <Compass className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Ambito Preferito per Esempi e Analogie
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tutte le {LESSONS.length} lezioni adattano istantaneamente spiegazioni, analogie ed esempi pratici al contesto che senti più vicino.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DOMAIN_OPTIONS.map((dom) => {
              const active = profile.exampleDomain === dom.id;
              return (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() =>
                    void updateUserPreferences({ exampleDomain: dom.id as ExampleDomain })
                  }
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-600 dark:border-sky-500'
                      : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {dom.label}
                      </span>
                      {active && (
                        <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {dom.description}
                    </p>
                  </div>
                  <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 pt-1">
                    {active ? 'Selezionato' : 'Usa questo ambito'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* 3. Visual Gamification Recap */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Riepilogo Visivo dei Progressi</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Livello attuale, avanzamento del percorso, media quiz e costanza settimanale.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold tabular-nums text-sky-700 dark:text-sky-400">
            Liv. {currentRank.level} / {SCOUT_RANKS.length} · {currentRank.title}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Grado & Esperienza</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {profile.xp} XP
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all"
                style={{ width: `${rankPct}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {nextRank
                ? `Mancano ${Math.max(0, nextRank.minXp - profile.xp)} XP a "${nextRank.title}"`
                : 'Grado massimo raggiunto!'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Moduli Superati</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {completedLessonsCount} / {LESSONS.length}
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.round((completedLessonsCount / LESSONS.length) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {Math.round((completedLessonsCount / LESSONS.length) * 100)}% del manuale completato
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Media Migliori Quiz</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {attemptedQuizzes.length > 0 ? `${avgQuizScore}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {attemptedQuizzes.length} {attemptedQuizzes.length === 1 ? 'modulo valutato' : 'moduli valutati'} ·{' '}
              {profile.wrongQuestionIds.length} errori in ripasso
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Serie Attiva</span>
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {profile.streakCount} {profile.streakCount === 1 ? 'giorno' : 'giorni'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Oggi: {profile.todayMinutesStudied}/{profile.dailyGoalMinutes}m · Flashcard:{' '}
              {profile.masteredFlashcards.length}/{SMART_GLOSSARY_ENTRIES.length}
            </div>
          </div>
        </div>

        {/* Module Graphic Badges + 4 Exclusive Weekly Badges Showcase */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Bacheca Distintivi Grafici ({profile.unlockedBadges.filter((b) => b.startsWith('badge-')).length} / {BADGES.length})
              </span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Supera il quiz da 10 domande di ciascuna lezione per sbloccarli
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {BADGES.map((badge, idx) => {
              const unlocked = profile.unlockedBadges.includes(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={unlocked && !prefersReducedMotion ? { y: -3, scale: 1.02 } : undefined}
                  whileTap={unlocked && !prefersReducedMotion ? { scale: 0.985 } : undefined}
                  transition={{
                    duration: 0.28,
                    delay: prefersReducedMotion ? 0 : idx * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                    unlocked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <motion.div
                    initial={
                      unlocked && !prefersReducedMotion
                        ? { scale: 0.72, rotate: -10, opacity: 0.4 }
                        : false
                    }
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 20,
                      delay: prefersReducedMotion ? 0 : idx * 0.035 + 0.06,
                    }}
                    className="shrink-0"
                  >
                    <BadgeGraphic badgeId={badge.id} unlocked={unlocked} size="sm" />
                  </motion.div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {badge.title}
                      </span>
                      {unlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  Badge Esclusivi Sfide Settimanali ({profile.unlockedBadges.filter((b) => b.startsWith('wbadge-')).length} / 4)
                </span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Completa una sequenza settimanale di 3 moduli entro domenica sera
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {WEEKLY_BADGES.map((badge, idx) => {
                const unlocked = profile.unlockedBadges.includes(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={unlocked && !prefersReducedMotion ? { y: -3, scale: 1.02 } : undefined}
                    whileTap={unlocked && !prefersReducedMotion ? { scale: 0.985 } : undefined}
                    transition={{
                      duration: 0.3,
                      delay: prefersReducedMotion ? 0 : 0.18 + idx * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                      unlocked
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                    }`}
                  >
                    <motion.div
                      initial={
                        unlocked && !prefersReducedMotion
                          ? { scale: 0.72, rotate: 10, opacity: 0.4 }
                          : false
                      }
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 20,
                        delay: prefersReducedMotion ? 0 : 0.24 + idx * 0.05,
                      }}
                      className="shrink-0"
                    >
                      <BadgeGraphic badgeId={badge.id} unlocked={unlocked} size="sm" />
                    </motion.div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {badge.title}
                        </span>
                        {unlocked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        {badge.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3.5 Recharts Analytics: Quiz Scores Over Time & Study Time per Module */}
      <UserAnalyticsSection />

      {/* 3.8 Saved Personal Lesson Markdown Notes & Printable Notebook Export */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-2.5">
            <NotebookPen className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Quaderno Appunti Personali &amp; Formulario Stampabile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user
                  ? 'Note in formato Markdown sincronizzate nel tuo profilo Firebase. Esportale o stampale con il formulario pre-esame.'
                  : 'Note salvate in locale. Esportale in Markdown o stampa il quaderno con tutte le formule.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mr-1">
              {Object.keys(lessonNotes).length} / {LESSONS.length} moduli
            </span>
            <button
              type="button"
              onClick={() => downloadStudyNotebookMarkdown(profile, lessonNotes)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica Markdown (.md)</span>
            </button>
            <button
              type="button"
              onClick={() => setNotebookOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Anteprima &amp; Stampa / PDF</span>
            </button>
          </div>
        </div>

        {Object.keys(lessonNotes).length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Non hai ancora scritto appunti personali. Apri una qualsiasi lezione e usa il pannello "Appunti Personali (Markdown)" per salvare riassunti, formule o domande d’esame.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LESSONS.filter((l) => Boolean(lessonNotes[l.id]?.content.trim())).map((lesson) => {
              const note = lessonNotes[lesson.id];
              const previewLine =
                note.content
                  .split('\n')
                  .map((line) => line.replace(/^#+\s*/, '').trim())
                  .find((line) => line.length > 0) ?? '';
              const dateLabel = new Date(note.updatedAtMs).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
              });
              return (
                <div
                  key={lesson.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span>Modulo {String(lesson.number).padStart(2, '0')}</span>
                      <span>
                        Aggiornato {dateLabel} · {note.content.length} car.
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {lesson.shortTitle}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {previewLine}
                    </p>
                  </div>

                  {onOpenLesson && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenLesson(lesson.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        <span>Apri lezione e note</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Daily Reminders, FCM Push & 7-Day Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Promemoria Quotidiano & Notifiche Push (FCM)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configura uno o più orari personalizzati e ricevi notifiche push sui tuoi dispositivi registrati.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-sky-600 cursor-pointer"
              />
              <span>Attivo</span>
            </label>
          </div>

          <form onSubmit={(e) => void handleSaveReminders(e)} className="space-y-4">
            {/* Multi-time schedule slots */}
            <div className="space-y-2.5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Orari di studio giornalieri ({reminderTimes.length}/5)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Max 5 fasce
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {reminderTimes.map((slot) => (
                  <div
                    key={slot}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
                  >
                    <span>{slot}</span>
                    {reminderTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(slot)}
                        aria-label={`Rimuovi orario ${slot}`}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  id="rem-new-time"
                  type="time"
                  aria-label="Nuovo orario promemoria"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleAddTimeSlot()}
                  disabled={reminderTimes.length >= 5 || reminderTimes.includes(newTimeInput)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi orario</span>
                </button>
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="mr-0.5">Rapidi:</span>
                  {['08:30', '13:00', '19:30', '21:00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={reminderTimes.includes(preset) || reminderTimes.length >= 5}
                      onClick={() => handleAddTimeSlot(preset)}
                      className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="rem-tz"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fuso orario</span>
                </label>
                <select
                  id="rem-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rem-msg"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Messaggio promemoria
                </label>
                <input
                  id="rem-msg"
                  type="text"
                  maxLength={160}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Es. 10 min di Radiotecnica easy!"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Giorni della settimana
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d) => {
                  const active = days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                        active
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Sincronizza orari per Notifiche Push FCM
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Invia lo schema orario ai dispositivi autorizzati su Firebase Cloud Messaging.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fcmEnabled}
                onChange={(e) => setFcmEnabled(e.target.checked)}
                className="w-4 h-4 accent-sky-600 cursor-pointer shrink-0"
              />
            </label>

            {savedNotice && (
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                {savedNotice}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
              >
                Salva Orari e Promemoria
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadDailyReminderIcs({
                    time: reminderTimes[0] || '19:30',
                    times: reminderTimes,
                    days,
                    goalMinutes: profile.dailyGoalMinutes,
                    message,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Scarica Calendario (.ics)</span>
              </button>
            </div>
          </form>

          {/* FCM Push Device Registration & Registered Devices */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Dispositivi & Firebase Cloud Messaging (FCM)</span>
                </p>
                <p>
                  Permesso:{' '}
                  {notifStatus === 'granted'
                    ? 'Attivo'
                    : notifStatus === 'denied'
                      ? 'Bloccato dal browser'
                      : notifStatus === 'unsupported'
                        ? 'Non supportato in questo riquadro'
                        : 'Non ancora autorizzato'}{' '}
                  · Dispositivi collegati: {fcmDevices.length}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={fcmLoading}
                  onClick={() => void handleActivateFcmPush()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 disabled:opacity-60 cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>
                    {fcmLoading
                      ? 'Registrazione...'
                      : fcmDevices.some((d) => d.deviceId === localDeviceId)
                        ? 'Aggiorna Dispositivo FCM'
                        : 'Attiva Notifiche Push (FCM)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleTestNotification()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Prova Notifica
                </button>
              </div>
            </div>

            {fcmFeedback && (
              <p
                className={`text-xs font-medium rounded-lg px-3 py-2 border ${
                  fcmFeedback.tone === 'success'
                    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                    : fcmFeedback.tone === 'warn'
                      ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
                      : 'text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800'
                }`}
              >
                {fcmFeedback.text}
              </p>
            )}

            {!user ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accedi con Google in alto per registrare questo dispositivo su Firestore e ricevere notifiche push sincronizzate su smartphone e desktop.
              </p>
            ) : fcmDevices.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nessun dispositivo push registrato al momento. Premi &quot;Attiva Notifiche Push (FCM)&quot; sui dispositivi su cui vuoi ricevere i promemoria.
              </p>
            ) : (
              <div className="space-y-2">
                {fcmDevices.map((dev) => {
                  const isCurrent = dev.deviceId === localDeviceId;
                  return (
                    <div
                      key={dev.deviceId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {dev.deviceLabel}
                          {isCurrent ? ' · Questo dispositivo' : ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {dev.reminderEnabled ? 'Attivo' : 'In pausa'} · {dev.reminderTimes.join(', ')} · {dev.timezone}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={removingDeviceId === dev.deviceId}
                        onClick={() => void handleRemoveDevice(dev.deviceId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{removingDeviceId === dev.deviceId ? 'Rimozione...' : 'Rimuovi'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 7-Day Activity Chart */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Costanza degli Ultimi 7 Giorni
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Obiettivo attuale: {profile.dailyGoalMinutes} min/giorno
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            {lastSeven.map((dateKey) => {
              const mins = studyLogs[dateKey]?.minutesStudied ?? 0;
              const pct = Math.min(100, Math.round((mins / Math.max(1, maxMinutes)) * 100));
              const metGoal = mins >= profile.dailyGoalMinutes;
              return (
                <div key={dateKey} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {mins}m
                  </span>
                  <div className="w-full max-w-8 bg-slate-100 dark:bg-slate-800 rounded-t-md h-24 flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        metGoal
                          ? 'bg-emerald-600'
                          : mins > 0
                            ? 'bg-sky-600'
                            : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(mins > 0 ? 12 : 4, pct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {formatShortItalianDate(dateKey)}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Barra verde: obiettivo giornaliero raggiunto ({profile.dailyGoalMinutes} min). Bastano anche 5 minuti al giorno per mantenere viva la serie!
          </p>
        </section>
      </div>

      {/* 5. Multi-User Opt-In Leaderboard */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-2.5">
            <Users className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Classifica Multiutente & Globale
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                I partecipanti ai Gruppi di Studio compaiono automaticamente nella Top 10 Globale della dashboard con nickname, XP, grado e moduli (nessuna email esposta). Se non sei ancora in un gruppo, puoi attivare comunque la condivisione opzionale qui sotto.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shrink-0">
            <input
              type="checkbox"
              disabled={!user}
              checked={profile.shareInLeaderboard}
              onChange={(e) => void updateUserPreferences({ shareInLeaderboard: e.target.checked })}
              className="w-4 h-4 accent-sky-600 cursor-pointer disabled:opacity-50"
            />
            <span>Partecipa alla classifica</span>
          </label>
        </div>

        {!user ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Accedi con Google per partecipare alla classifica multiutente o passare da un utente all’altro sullo stesso browser.
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              Accedi con Google
            </button>
          </div>
        ) : leaderboardEntries.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nessun partecipante pubblico ancora in lista. Attiva "Partecipa alla classifica" qui sopra per comparire per primo!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Studente</th>
                  <th className="py-2 pr-3 font-semibold">Grado</th>
                  <th className="py-2 pr-3 font-semibold">Moduli</th>
                  <th className="py-2 pr-3 font-semibold">Distintivi</th>
                  <th className="py-2 font-semibold text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboardEntries.map((entry, idx) => {
                  const isMe = entry.userId === user.uid;
                  const rankDef =
                    SCOUT_RANKS.find((r) => r.level === entry.rankLevel) ?? SCOUT_RANKS[0];
                  return (
                    <tr
                      key={entry.userId}
                      className={
                        isMe
                          ? 'bg-sky-50/70 dark:bg-sky-950/40 font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }
                    >
                      <td className="py-2.5 pr-3 font-mono tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5">
                          {entry.nickname}
                          {isMe && (
                            <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        Liv. {rankDef.level} · {rankDef.title}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {entry.completedLessonsCount}/{LESSONS.length}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {entry.badgesCount}/{BADGES.length + WEEKLY_BADGES.length}
                      </td>
                      <td className="py-2.5 font-mono tabular-nums text-right text-sky-700 dark:text-sky-400">
                        {entry.xp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PrintableNotebookModal
        open={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        profile={profile}
        lessonNotes={lessonNotes}
      />
    </div>
  );
};
