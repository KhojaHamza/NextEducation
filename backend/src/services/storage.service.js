import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/AppError.js';

// Local disk storage. Hosts like Railway or Render wipe the disk on each deploy: before going
// live, reimplement these functions on S3 (same signatures, nothing else changes).
const root = () => path.resolve(process.env.UPLOAD_DIR || 'uploads');

const ALLOWED = {
  '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  '.png': { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  '.jpg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.jpeg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
};

// Checks the extension AND the real file signature; the mime type is ours, never the client's
export const inspectFile = (originalName, buffer) => {
  const ext = path.extname(originalName).toLowerCase();
  const rule = ALLOWED[ext];
  if (!rule) throw new AppError(`File type not allowed (use ${Object.keys(ALLOWED).join(', ')})`, 400);
  if (!rule.magic.every((byte, i) => buffer[i] === byte)) {
    throw new AppError(`"${path.basename(originalName)}" is not a valid ${ext} file`, 400);
  }
  return { ext, mime: rule.mime };
};

export const saveFile = async (buffer, ext) => {
  const key = `${crypto.randomUUID()}${ext}`;
  await fs.mkdir(root(), { recursive: true });
  await fs.writeFile(path.join(root(), key), buffer, { flag: 'wx' });
  return key;
};

const KEY_PATTERN = /^[0-9a-f-]{36}\.[a-z]{3,4}$/;
const resolveKey = (key) => {
  if (!KEY_PATTERN.test(key)) throw new AppError('Invalid file key', 400);
  return path.join(root(), key);
};

export const openFile = async (key) => {
  const file = resolveKey(key);
  await fs.access(file).catch(() => { throw new AppError('File not found', 404); });
  return createReadStream(file);
};

export const deleteFile = (key) => fs.rm(resolveKey(key), { force: true });