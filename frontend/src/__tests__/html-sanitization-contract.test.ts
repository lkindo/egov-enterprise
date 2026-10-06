/**
 * `DOMPurify.sanitize` 의 통과·차단 기준선 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 이 살균기는 `dangerouslySetInnerHTML` 세 곳의 **유일한 방어선**이다 —
 * 게시글 본문(`BoardDetailClient`), FAQ 템플릿의 펼친 답(`BoardTemplates`, 2026-09-26 DIP V6),
 * 정책 문서(`help/policies/[type]`). 그런데 2026-09-13 실측에서
 * 그 동작을 고정하는 테스트가 **저장소 전체에 하나도 없었다.**
 *
 * 저장된 HTML의 표시 범위는 DOMPurify 기본 정책에 영향을 받는다.
 * 기본값이 엄격해지면 사용자가 저장한 본문이 화면에서 조용히 깎이고, 느슨해지면 방어선이 내려간다.
 * 어느 쪽도 오류를 내지 않는다.
 *
 * ⚠ 이 파일은 라이브러리 동작을 **베끼는** 것이 아니라 **우리가 의존하는 계약**만 고정한다.
 *   - 통과해야 하는 것: 본문 서식 태그(`strong`·`em`·`code`·목록·링크)
 *   - 막아야 하는 것: 스크립트 실행 경로(`<script>`, 인라인 이벤트 핸들러)
 *   버전을 올릴 때 이 둘 중 하나라도 달라지면 red 로 드러나고, 그때 판단하면 된다.
 */

import { describe, expect, it } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';

describe('HTML 살균 기준선 — 에디터가 만드는 것은 통과하고, 실행 경로는 막힌다', () => {
  it.each([
    ['strong', '<strong>굵게</strong>'],
    ['em', '<em>기울임</em>'],
    ['code', '<code>코드</code>'],
    ['ul/li', '<ul><li>항목</li></ul>'],
    ['ol/li', '<ol><li>항목</li></ol>'],
    ['a[href]', '<a href="https://example.com">링크</a>'],
  ])('에디터가 만드는 %s 는 그대로 통과한다', (_label, html) => {
    // 깎이면 사용자가 저장한 본문이 화면에서 조용히 사라진다 — 오류는 나지 않는다.
    expect(DOMPurify.sanitize(html)).toBe(html);
  });

  it('스크립트 태그는 본문만 남기고 제거한다', () => {
    expect(DOMPurify.sanitize('<script>alert(1)</script>본문')).toBe('본문');
  });

  it('인라인 이벤트 핸들러는 요소를 남기더라도 속성을 제거한다', () => {
    const sanitized = DOMPurify.sanitize('<img src=x onerror="alert(1)">');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert');
  });

  it('javascript: 스킴 링크는 목적지를 남기지 않는다', () => {
    const sanitized = DOMPurify.sanitize('<a href="javascript:alert(1)">클릭</a>');
    expect(sanitized).not.toContain('javascript:');
  });

  /*
    style 속성은 현재 통과한다(실측). 저장된 정렬 서식이 라이브러리 기본 정책 변경으로
    사라지면 이 계약이 red로 알려 준다.
  */
  it('인라인 style 속성은 현재 기본 정책에서 통과한다', () => {
    expect(DOMPurify.sanitize('<p style="text-align:center">가운데</p>'))
      .toBe('<p style="text-align:center">가운데</p>');
  });
});
