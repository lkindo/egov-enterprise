// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, inProjection, missingOutsideLedger } from '@/test-utils/projection';
import { codeWithoutComments } from '../../../../scripts/code-without-comments.mjs';

/**
 * SMS 미연동 배너를 **실제 전송 구현체와 양방향으로 묶는다** — 배너의 문구·런타임 상태 단언은
 * app/admin/uss/ion/sms/__tests__/SmsAdminClient.test.tsx 에 있다.
 *
 * 배너만 하드코딩하면, 나중에 진짜 게이트웨이가 붙었을 때 화면이 반대로 거짓말한다. 저장소의 SmsSender 구현체를 전수로 읽어
 * 하나라도 성공을 돌려주면 이 계약이 red 가 되게 한다 — 그때 배너를 걷어내라는 신호다.
 *
 * 전송 구현체만 바꾸는 백엔드-only PR 에서도 돌아야 하므로 cross-stack 에 둔다(FE-CONTRACT-02). 문자 발송 기능이 빠진 생성물에서는
 * 구현체와 화면이 함께 지워진다 — 둘 다 투영에 남아 있을 때만 등록한다.
 */
const SENDER_DIR = 'business-app/src/main/java/nuri/business/service/sms';
const BOUND = [`${SENDER_DIR}/SmsSender.java`, 'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx']
  .map((file) => path.join(REPO_ROOT, file));

describe('SMS 미연동 배너 ↔ 전송 구현체', () => {
  it('결속한 구현체·화면 파일은 남아 있거나 투영으로 빠졌다', () => {
    expect(missingOutsideLedger(BOUND)).toEqual([]);
  });

  if (inProjection(BOUND)) {
    it('배너는 "모든 sender 가 실패를 돌려준다"는 사실에 결속돼 있다', () => {
      const senderDir = path.join(REPO_ROOT, SENDER_DIR);
      const senders = readdirSync(senderDir).filter((name) => /SmsSender\.java$/.test(name));

      // 구현체가 사라지면 이 검사가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
      expect(senders.length).toBeGreaterThanOrEqual(2);

      for (const name of senders) {
        if (name === 'SmsSender.java') continue; // 인터페이스
        // 주석 안의 `return true;` 는 동작이 아니다 — 주석만 지운 코드에서 본다.
        const body = codeWithoutComments(readFileSync(path.join(senderDir, name), 'utf8'), name);
        expect(body, `${name} 가 성공을 돌려주면 미연동 배너는 거짓이 된다`).not.toMatch(/return\s+true\s*;/);
      }
    });
  }
});
