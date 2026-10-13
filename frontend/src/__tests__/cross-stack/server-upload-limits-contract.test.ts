import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOARD_UPLOAD_EXTENSIONS,
  SERVER_MAX_FILE_SIZE_MB,
  SERVER_MAX_FILES_PER_REQUEST,
  SERVER_UPLOAD_EXTENSIONS,
} from '@/lib/attachments/server-upload-limits';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(SRC_DIR, '..', '..');
const FILE_SERVICE = join(REPO_DIR, 'business-core/src/main/java/nuri/business/service/file/FileService.java');
const BOARD_MEDIA_SIGNATURE = join(REPO_DIR, 'business-core/src/main/java/nuri/business/service/file/BoardMediaSignature.java');

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

  it('게시판 업로드 확장자는 일반 첨부와 서버 게시판 영상 프로필의 합집합이다', () => {
    const mediaSource = readFileSync(BOARD_MEDIA_SIGNATURE, 'utf8');
    const block = mediaSource.match(/EXTENSIONS\s*=\s*Set\.of\(([\s\S]*?)\);/);
    expect(block, 'BoardMediaSignature.EXTENSIONS를 찾지 못했다').not.toBeNull();
    const serverMediaExtensions = [...block![1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(serverMediaExtensions).toHaveLength(2);
    expect([...BOARD_UPLOAD_EXTENSIONS].sort())
      .toEqual([...SERVER_UPLOAD_EXTENSIONS, ...serverMediaExtensions].sort());
  });

  it('서버 액션은 서버 요청 50MiB와 multipart 여유 2MiB까지만 받는다', () => {
    const requestSize = source.match(/MAX_REQUEST_SIZE_BYTES\s*=\s*(\d+)L\s*\*\s*1024\s*\*\s*1024;/);
    expect(requestSize, 'FileService.MAX_REQUEST_SIZE_BYTES를 찾지 못했다').not.toBeNull();
    const backendRequestMiB = Number(requestSize![1]);
    expect(backendRequestMiB).toBe(50);

    const application = readFileSync(join(REPO_DIR, 'api-server/src/main/resources/application.yml'), 'utf8');
    const parserDefault = application.match(/max-request-size:\s*\$\{FILE_UPLOAD_MAX_REQUEST_SIZE:(\d+)MB\}/);
    expect(parserDefault, 'HTTP multipart 파서의 기본 요청 상한을 찾지 못했다').not.toBeNull();
    expect(Number(parserDefault![1])).toBe(backendRequestMiB);

    const nextConfig = readFileSync(join(REPO_DIR, 'frontend/next.config.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const actionLimit = nextConfig.match(/experimental\s*:\s*\{\s*serverActions\s*:\s*\{\s*bodySizeLimit\s*:\s*['"](\d+)mb['"]/i);
    expect(actionLimit, 'experimental.serverActions.bodySizeLimit를 명시해야 한다').not.toBeNull();
    expect(Number(actionLimit![1])).toBe(backendRequestMiB + 2);
  });
});
