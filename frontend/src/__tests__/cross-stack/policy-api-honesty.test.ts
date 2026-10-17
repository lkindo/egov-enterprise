// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, inProjection, missingOutsideLedger } from '@/test-utils/projection';
import { codeWithoutComments } from '../../../../scripts/code-without-comments.mjs';

/**
 * 정책 API 는 미등록을 본문으로 위장하지 않는다 — 화면 쪽 단언은 app/help/policies/__tests__/policy-view-honesty.test.ts 에 있다.
 *
 * `PolicyApiController.defaultPolicy` 가 등록된 정책이 없으면 "본 시스템은 사용자의 개인정보를 소중히 다루며, 관련 법규를
 * 준수합니다." 라는 **개인정보 처리 방침**을 만들어 200 으로 돌려줬다(경위는 화면 쪽 시험의 머리 주석). 서버 축의 404 는
 * `PolicyApiControllerTest` 가 고정하고, 여기서는 창작 폴백의 문자열이 서버 소스에 되살아나지 않는지 본다.
 *
 * 서버 소스를 읽으므로 cross-stack 에 둔다 — 컨트롤러만 바꾸는 백엔드-only PR 에서도 돈다(FE-CONTRACT-02). 정책 화면은 help 기능이
 * 소유해 그 기능이 빠진 생성물에서 지워지지만 컨트롤러는 core 에 남는다. 컨트롤러가 투영에 남아 있으면 등록한다.
 */
const CONTROLLER = 'api-server/src/main/java/nuri/api/controller/foundation/controller/system/policy/PolicyApiController.java';
const controllerPath = path.join(REPO_ROOT, CONTROLLER);

describe('정책 API — 미등록을 본문으로 위장하지 않는다', () => {
  it('결속한 서버 파일은 남아 있거나 투영으로 빠졌다', () => {
    expect(missingOutsideLedger([controllerPath])).toEqual([]);
  });

  if (inProjection(controllerPath)) {
    it('서버가 기본 본문을 만들어 내지 않는다', () => {
      // 주석 안의 문자열을 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다.
      const controller = codeWithoutComments(readFileSync(controllerPath, 'utf8'), CONTROLLER);
      // 이 문자열들이 서버 소스에 다시 나타나면 창작 폴백이 되살아난 것이다.
      expect(controller).not.toContain('defaultPolicy');
      expect(controller).not.toContain('개인정보를 소중히 다루며');
      expect(controller).not.toContain('저작권 보호 정책');
      expect(controller).not.toContain('준비 중인 정책 페이지입니다');
      // 미등록은 404 다.
      expect(controller).toContain('RESOURCE_NOT_FOUND');
    });
  }
});
