import { redirect } from 'next/navigation';
import { parseKnowledgeTab, TAB_HUB } from '../knowledge-tabs';

/**
 * 지식 허브(`/admin/help`)로 보낸다 — 기본은 Q&A 탭이다.
 *
 * [2026-11-08 DEC-OPS-407] 이 라우트는 `KnowledgeHubClient defaultTab="QNA"` 를 그려 `/admin/help` 와 같은 허브를 기본 탭만 다르게
 * 한 번 더 보이고 있었다(처분 consolidate-to-canonical). 이 화면에서 탭을 누르면 허브가 지금 경로를 유지해
 * `/admin/help/qna?tab=COMMUNITY` 같은 주소를 만들었으므로, 그 주소들이 같은 탭에 닿게 tab 을 옮긴다.
 * - 지식 허브 고유 탭(WIKI·FAQ·QNA)이나 기여할 수 있는 탭(TAB_HUB.contributable)이면 그대로 보낸다. 기여 탭 주소는 그 구성의 허브가
 *   그 탭을 보일 때만 만들어지므로(빠진 구성의 허브는 그 탭을 그리지 않는다) 정적 선언으로 그 구성에서 만든 주소를 모두 보존한다.
 *   기여 탭 등록 파일(generated-hub-tabs-knowledge)은 읽지 않는다 — 허브 탭 슬롯의 소비자는 그 허브 셸 하나다.
 * - 없거나 그 밖이면 QNA 로 보낸다. 정본의 기본 탭(WIKI)이 아니라 이 화면의 종전 기본 탭을 지킨다.
 * - 기여 탭은 지금 모두 늘 보이는 탭이다. 권한에 따라 숨는 기여 탭이 생기면, 그 탭을 볼 수 없는 사용자는 종전 Q&A 대신 허브 기본 탭에 닿는다.
 * - 그 밖의 키(bbsId 등)는 넘기지 않는다. 앱은 이 옛 주소에 그런 키를 붙여 만들지 않고, 허브도 탭을 바꿀 때 bbsId 를 버린다.
 * 페이지 권한은 정본과 같다(로그인만). 라우트 원장이 이 파일을 별칭으로 읽으려면 redirect 호출이 하나이고 return 이 없어야 한다.
 */
const CONTRIBUTABLE_TABS = Object.keys(TAB_HUB.contributable);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function QnaRedirectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tab = parseKnowledgeTab(first((await searchParams).tab), CONTRIBUTABLE_TABS) ?? 'QNA';
  redirect(`/admin/help?tab=${tab}`);
}
