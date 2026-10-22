// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, inProjection, missingOutsideLedger } from '@/test-utils/projection';

/**
 * 콘텐츠 문서 판정 fixture 의 서버 정본과 화면 사본이 같다(ADR-0039 결정 5). 서버 검증기(CmsDocumentValidatorTest)는 정본을,
 * 화면 판정기 시험(lib/cms/__tests__/document.test.ts)은 사본을 읽는다 — 둘이 같아야 두 판정기가 같은 사례로 대조된다.
 *
 * 서버 시험 자원을 읽으므로 cross-stack 에 둔다 — 정본만 바꾼 백엔드-only PR 에서도 돈다. 판정기를 import 하지 않고 두 파일만 읽어,
 * 콘텐츠 페이지 기능이 빠진 생성물에서도 이 계약은 남고(두 파일은 투영 원장에 적힌다) 대조만 등록하지 않는다.
 */
const CANONICAL = path.join(REPO_ROOT, 'business-app/src/test/resources/nuri/business/service/cms/cms-document-fixtures.json');
const COPY = path.join(REPO_ROOT, 'frontend/src/lib/cms/__tests__/cms-document-fixtures.json');

describe('콘텐츠 문서 판정 fixture', () => {
  it('정본과 사본은 남아 있거나 투영으로 빠졌다', () => {
    expect(missingOutsideLedger([CANONICAL, COPY])).toEqual([]);
  });

  if (inProjection([CANONICAL, COPY])) {
    it('화면 사본이 서버 정본과 같다 — 정본을 고치면 사본도 같이 고친다', () => {
      expect(JSON.parse(readFileSync(COPY, 'utf8'))).toEqual(JSON.parse(readFileSync(CANONICAL, 'utf8')));
    });
  }
});
