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
const detail = stripComments(read('admin/survey/manage/[id]/SurveyManageDetailClient.tsx'));
const pollTypes = stripComments(read('../types/business/poll.ts'));

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

/**
 * 응답 선택지: 볼 수는 있게, 여기서 고칠 수는 없게.
 *
 * 서버는 목록·상세 모두에서 `pollArticles` 를 채워 내려주는데 **프런트 타입에 선언이 없어**
 * 화면이 존재 자체를 몰랐다. 등록 화면이 선택지 4개를 소스에 고정하므로, 실제로 무엇이
 * 저장됐는지 확인할 수단이 아예 없다는 뜻이었다.
 *
 * 반대로 여기서 **고치게 두면 안 된다.** updatePoll 은 pollArticles 가 실려 오면 항목을
 * clear-and-recreate 하는데 tb_onln_poll_rslt.poll_artcl_sn 외래키가 NO ACTION 이라(V2_67)
 * 투표가 한 건이라도 있으면 저장이 실패한다. 그래서 읽기 형태를 쓰기 VO 와 타입 단계에서
 * 분리해, 폼 state 를 spread 하는 실수로 그 경로를 타지 못하게 했다.
 */
describe('여론조사 선택지', () => {
  it('조회 응답 타입이 선택지를 선언한다 — 선언이 없으면 화면이 존재를 모른다', () => {
    expect(pollTypes).toContain('OnlinePollManageDetailVO');
    expect(pollTypes).toMatch(/OnlinePollManageDetailVO[\s\S]{0,200}pollArticles/);
  });

  it('쓰기 VO 에는 선택지가 없다 — 폼 state 를 spread 해도 저장 경로로 새지 않는다', () => {
    const writeVo = pollTypes.match(/export interface OnlinePollManageVO \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(writeVo).not.toContain('pollArticles');
  });

  it('상세 화면이 선택지를 보여 준다', () => {
    expect(detail).toContain('응답 선택지');
    expect(detail).toContain('pollArticles');
  });

  it('상세 화면에 선택지 편집 컨트롤을 두지 않고 그 사실을 말한다', () => {
    // 편집을 열면 투표가 있는 설문에서 저장이 실패한다. 안 되는 것을 되는 척하지 않는다.
    expect(detail).toContain('이 화면에서는 바꿀 수 없습니다');
  });
});
