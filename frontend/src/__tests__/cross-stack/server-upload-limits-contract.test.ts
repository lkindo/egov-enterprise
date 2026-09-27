import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SERVER_MAX_FILE_SIZE_MB,
  SERVER_MAX_FILES_PER_REQUEST,
  SERVER_UPLOAD_EXTENSIONS,
} from '@/lib/attachments/server-upload-limits';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(SRC_DIR, '..', '..');
const FILE_SERVICE = join(REPO_DIR, 'business-core/src/main/java/nuri/business/service/file/FileService.java');

/**
 * 업로더 제한과 서버 첨부 제한의 대조(2026-09-27 DIP B5 F9).
 *
 * 종전 업로더는 모든 형식·파일당 10MB·5개를 보였고, 서버는 17개 확장자만 받았다. 화면이 받은 파일이 저장할 때
 * 415 로 거부되는 것을 사용자는 뒤늦게 알았다. 서버 상수가 바뀌면 이 계약이 먼저 red 가 된다.
 */
describe('server upload limits contract', () => {
  const source = readFileSync(FILE_SERVICE, 'utf8');

  it('확장자 목록이 FileService.ALLOWED_EXTENSIONS 와 같다', () => {
    const block = source.match(/ALLOWED_EXTENSIONS\s*=\s*Arrays\.asList\(([\s\S]*?)\);/);
    expect(block, 'FileService.ALLOWED_EXTENSIONS 를 찾지 못했다').not.toBeNull();
    const withoutComments = block![1].replace(/\/\/[^\n]*/g, '');
    const serverExtensions = [...withoutComments.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(serverExtensions.length).toBeGreaterThan(0);
    expect([...SERVER_UPLOAD_EXTENSIONS].sort()).toEqual([...serverExtensions].sort());
  });

  it('파일당 크기·요청당 파일 수 상한이 서버 상수와 같다', () => {
    const size = source.match(/MAX_FILE_SIZE_BYTES\s*=\s*(\d+)L\s*\*\s*1024\s*\*\s*1024;/);
    const count = source.match(/MAX_FILES_PER_REQUEST\s*=\s*(\d+);/);
    expect(size, 'FileService.MAX_FILE_SIZE_BYTES 형식이 바뀌었다').not.toBeNull();
    expect(count, 'FileService.MAX_FILES_PER_REQUEST 형식이 바뀌었다').not.toBeNull();
    expect(SERVER_MAX_FILE_SIZE_MB).toBe(Number(size![1]));
    expect(SERVER_MAX_FILES_PER_REQUEST).toBe(Number(count![1]));
  });
});
