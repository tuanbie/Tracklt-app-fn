/**
 * Minimal Google Drive v3 REST client — just what TrackIt needs to keep one JSON file
 * at "My Drive/TrackIt/trackit-data.json". Uses fetch directly to avoid a heavy SDK.
 */
import { getAccessToken, invalidateToken } from './googleAuth';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const FOLDER_NAME = 'TrackIt';
export const FILE_NAME = 'trackit-data.json';

export interface DriveFile {
  id: string;
  modifiedTime: string;
  /** Changes on every write; used to detect concurrent edits from another device. */
  version: string;
}

export class DriveError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  } catch {
    throw new DriveError('Không có kết nối mạng.', 0);
  }
  if (res.status === 401 && !retried) {
    await invalidateToken(token);
    return request(url, init, true);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new DriveError(`Drive ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  return res;
}

const FIELDS = 'id,modifiedTime,version';

async function findOne(q: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    q,
    spaces: 'drive',
    fields: `files(${FIELDS})`,
    orderBy: 'modifiedTime desc',
    pageSize: '1',
  });
  const res = await request(`${API}/files?${params}`);
  const json = (await res.json()) as { files: DriveFile[] };
  return json.files[0] ?? null;
}

const escapeQ = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function ensureFolder(): Promise<string> {
  const existing = await findOne(
    `name='${escapeQ(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  if (existing) return existing.id;
  const res = await request(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return ((await res.json()) as { id: string }).id;
}

export function findDataFile(): Promise<DriveFile | null> {
  return findOne(`name='${escapeQ(FILE_NAME)}' and mimeType='application/json' and trashed=false`);
}

export async function getFileMeta(id: string): Promise<DriveFile> {
  const res = await request(`${API}/files/${id}?fields=${FIELDS}`);
  return (await res.json()) as DriveFile;
}

export async function downloadJson(id: string): Promise<unknown> {
  const res = await request(`${API}/files/${id}?alt=media`);
  return res.json();
}

function multipart(metadata: object, json: string) {
  const boundary = `trackit_${Date.now().toString(36)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

export async function createDataFile(data: unknown): Promise<DriveFile> {
  const folderId = await ensureFolder();
  const { body, contentType } = multipart(
    { name: FILE_NAME, mimeType: 'application/json', parents: [folderId] },
    JSON.stringify(data, null, 2),
  );
  const res = await request(`${UPLOAD}/files?uploadType=multipart&fields=${FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
  return (await res.json()) as DriveFile;
}

export async function updateDataFile(id: string, data: unknown): Promise<DriveFile> {
  const res = await request(`${UPLOAD}/files/${id}?uploadType=media&fields=${FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data, null, 2),
  });
  return (await res.json()) as DriveFile;
}
