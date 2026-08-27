/**
 * 설문 허브 어휘 계약 — 한 화면에서 '설문'이 두 엔티티를 가리키지 않는다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 설문 허브 한 화면에 **서로 다른 두 표**의 수치와 목록이 동시에 있었다.
 *
 *   - 헤더 수치·MetricCard  → `surveyAdminService.getSurveyList` → `tb_srvy`(설문지)
 *   - '설문 관리' 탭의 목록  → `getPollList` → `tb_onln_poll_manage`(여론조사)
 *   - '신규 설문 등록' 버튼  → 목적지가 h1 '만족도 설문 등록'으로 **여론조사**를 만든다
 *
 * 셋 다 '설문'이라고 불렸다. 관리자가 "등록된 설문 3건" 을 읽고 바로 아래에서 12행을 봐도
 * 두 숫자를 맞출 방법이 없다 — 어느 쪽이 틀렸는지 화면이 알려 주지 않기 때문이다.
 * 문항·템플릿·응답자 탭은 `tb_srvy` 를 다루므로, 헤더 수치와 그 세 탭이 한 축이고
 * 관리 탭과 등록 버튼이 다른 축이다.
 *
 * 값을 한쪽으로 통일하면 다른 축의 정보가 화면에서 사라진다. 그래서 **값이 아니라 이름**을
 * 구분했다. 이 계약은 그 구분이 되돌아가지 않게 고정한다.
 *
 * '여론조사' 는 새로 지어낸 말이 아니라 저장소가 이미 쓰는 말이다
 * (`/admin/survey/polls/participate` 의 '여론조사 센터', `lib/poll-status.ts` 주석,
 * `proxy.ts` 의 USER_ACCESSIBLE_ADMIN_PATHS 주석).
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '..', '..', '..');

const read = (relative: string) => fs.readFileSync(path.join(APP, relative), 'utf8');

/** 주석 안의 문자열을 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

const hub = stripComments(read('admin/survey/hub/SurveyHubClient.tsx'));
const manage = stripComments(read('admin/survey/manage/SurveyManageClient.tsx'));

describe('설문 허브: 수치와 목록이 서로 다른 표라는 사실이 이름에 드러난다', () => {
  it('헤더 수치와 카드는 그 값의 출처(tb_srvy)를 이름으로 말한다', () => {
    // 이 두 곳만 surveyAdminService.getSurveyList 를 읽는다.
    expect(hub).toContain('등록된 설문지');
    expect(hub).not.toMatch(/등록된 설문(?!지)/);
  });

  it('여론조사를 만드는 버튼과 여론조사를 보여 주는 탭은 여론조사라고 부른다', () => {
    expect(hub).toContain('신규 여론조사 등록');
    expect(hub).toContain('여론조사 관리');
    // 같은 화면에서 poll 축을 다시 '설문'으로 부르면 구분이 무너진다.
    expect(hub).not.toContain('신규 설문 등록');
  });

  it('수치의 출처가 여전히 tb_srvy 다 — 출처가 바뀌면 라벨도 함께 바꿔야 한다', () => {
    /*
     * 라벨만 고정하고 출처를 놓치면, 나중에 누군가 수치를 poll 쪽으로 갈아끼웠을 때
     * '등록된 설문지' 라는 이름이 다시 거짓이 된다.
     */
    expect(hub).toContain('surveyAdminService.getSurveyList');
  });

  it('허브에 embed 되는 목록 화면도 같은 이름을 쓴다 — 탭과 패널 제목이 어긋나면 안 된다', () => {
    expect(manage).toContain('여론조사 관리');
    expect(manage).toContain('getPollList');
  });
});
