interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
}

interface FirestoreRunQueryRow {
  document?: {
    name?: string;
    fields?: Record<string, FirestoreValue>;
  };
}

const DEFAULT_PROJECT_ID = 'quiet-engine-436107-e7';
const DEFAULT_DATABASE_ID = 'ai-studio-eb2c1731-f601-482e-856a-5310389ece29';

const WEEKDAY_MAP: Record<string, string> = {
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
};

function getEnv(key: string): string {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key] ?? '';
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return base64UrlEncodeBytes(bytes);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(normalized);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function mintGoogleAccessToken(sa: ServiceAccountCredentials): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
  const claimSet = base64UrlEncodeJson({
    iss: sa.client_email,
    scope:
      'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  });

  const unsignedJwt = `${header}.${claimSet}`;
  const keyBuffer = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const unsignedBytes = new TextEncoder().encode(unsignedJwt);
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    unsignedBytes.buffer as ArrayBuffer
  );
  const jwt = `${unsignedJwt}.${base64UrlEncodeBytes(new Uint8Array(signatureBuffer))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`OAuth2 token error (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('OAuth2 response missing access_token');
  }
  return tokenData.access_token;
}

function getLocalDayAndMinutes(timezone: string, now: Date): { dayKey: string; minutesOfDay: number } {
  let safeTz = timezone || 'Europe/Rome';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: safeTz }).format(now);
  } catch {
    safeTz = 'Europe/Rome';
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayPart = (parts.find((p) => p.type === 'weekday')?.value ?? 'mon').toLowerCase().slice(0, 3);
  const hourNum = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minNum = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return {
    dayKey: WEEKDAY_MAP[weekdayPart] ?? 'mon',
    minutesOfDay: hourNum * 60 + minNum,
  };
}

function parseHHMMToMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isWithinSlotWindow(currentMinutes: number, slots: string[], toleranceMinutes = 35): boolean {
  for (const slot of slots) {
    const slotMin = parseHHMMToMinutes(slot);
    if (slotMin === null) continue;
    const rawDiff = Math.abs(currentMinutes - slotMin);
    const circularDiff = Math.min(rawDiff, 1440 - rawDiff);
    if (circularDiff <= toleranceMinutes) {
      return true;
    }
  }
  return false;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = getEnv('CRON_SECRET');
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }
  }

  const rawServiceAccount = getEnv('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!rawServiceAccount) {
    return jsonResponse({
      ok: false,
      skipped: true,
      reason: 'FIREBASE_SERVICE_ACCOUNT_JSON non configurata nelle Environment Variables di Vercel.',
    });
  }

  let sa: ServiceAccountCredentials;
  try {
    sa = JSON.parse(rawServiceAccount) as ServiceAccountCredentials;
    if (!sa.client_email || !sa.private_key) {
      throw new Error('Missing client_email or private_key');
    }
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: `FIREBASE_SERVICE_ACCOUNT_JSON non valido: ${err instanceof Error ? err.message : 'errore parsing'}`,
      },
      500
    );
  }

  const projectId = sa.project_id || getEnv('FIREBASE_PROJECT_ID') || DEFAULT_PROJECT_ID;
  const databaseId = getEnv('FIREBASE_DATABASE_ID') || DEFAULT_DATABASE_ID;
  const forceAll = new URL(request.url).searchParams.get('force') === '1';

  try {
    const accessToken = await mintGoogleAccessToken(sa);

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:runQuery`;
    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'fcmTokens', allDescendants: true }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'reminderEnabled' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
        },
      }),
    });

    if (!queryRes.ok) {
      const errBody = await queryRes.text();
      return jsonResponse(
        { ok: false, error: `Firestore query error (${queryRes.status}): ${errBody}` },
        502
      );
    }

    const rows = (await queryRes.json()) as FirestoreRunQueryRow[];
    const now = new Date();
    let checked = 0;
    let matched = 0;
    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      const fields = row.document?.fields;
      if (!fields) continue;
      checked += 1;

      const token = fields.token?.stringValue ?? '';
      if (!token) continue;

      const timezone = fields.timezone?.stringValue || 'Europe/Rome';
      const reminderDays = (fields.reminderDays?.arrayValue?.values ?? [])
        .map((v) => v.stringValue ?? '')
        .filter(Boolean);
      const reminderTimes = (fields.reminderTimes?.arrayValue?.values ?? [])
        .map((v) => v.stringValue ?? '')
        .filter(Boolean);
      const reminderMessage =
        fields.reminderMessage?.stringValue ||
        '10 minuti di Radiotecnica easy per tenere allenata la tua stazione!';

      if (!forceAll) {
        const { dayKey, minutesOfDay } = getLocalDayAndMinutes(timezone, now);
        if (reminderDays.length > 0 && !reminderDays.includes(dayKey)) {
          continue;
        }
        if (
          reminderTimes.length > 0 &&
          !isWithinSlotWindow(minutesOfDay, reminderTimes, 35)
        ) {
          continue;
        }
      }

      matched += 1;

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
      const pushRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: 'Radiotecnica easy · Promemoria di Studio',
              body: reminderMessage,
            },
            webpush: {
              fcm_options: {
                link: '/',
              },
            },
          },
        }),
      });

      if (pushRes.ok) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return jsonResponse({
      ok: true,
      projectId,
      databaseId,
      checked,
      matched,
      sent,
      failed,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Errore imprevisto nel cron FCM',
      },
      500
    );
  }
}
