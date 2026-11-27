# 프런트엔드 입력 검증 루프

이 문서는 입력·수정·전송 화면의 검증을 일회성 점검이 아니라 반복 가능한 계약으로 유지하는 개발 가이드다. 규범 우선순위는 [AGENTS.md](../../AGENTS.md)와 [프런트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)을 따른다.

## 화면 계약

쓰기 화면은 다음 항목을 함께 충족해야 한다.

1. OpenAPI generated Zod, 백엔드 DTO 검증, 실제 DB 길이·숫자 범위를 근거로 필수값·공백·최소/최대 길이·패턴·정수·범위·날짜 순서를 검증한다.
2. generated field를 강화할 때 `.extend({ field: z.string()... })`로 기존 상한을 교체하지 않는다. `GeneratedSchema.shape.field`, 필요한 경우 `.unwrap()`, `.pipe()` 또는 교집합을 사용해 기존 제약을 보존한다.
3. 검증 실패는 예외나 console error로 처리하지 않는다. 화면 안 오류 요약과 필드별 오류를 표시하고 `aria-invalid`, `aria-errormessage`, `aria-describedby`, 필수 필드의 `aria-required`를 연결한다.
   `FormErrorSummary`가 assertive live region을 소유하므로 `messageProps(...)`를 펼친 inline 오류에는 `role="alert"`를 다시 부여하지 않는다.
4. 첫 오류는 DOM 순서로 선택한다. 숨은 탭·단계는 먼저 연 뒤 스크롤하고 포커스하며, 대상이 사라지면 오류 요약으로 안전하게 복구한다. reduced-motion 사용자는 smooth scroll을 사용하지 않는다.
5. 구조화된 서버 field error는 같은 필드로 돌려보내고 사용자가 입력한 값과 모달을 유지한다. 필드에 귀속할 수 없는 인증·네트워크 오류만 form-level 안내로 처리한다.
6. 비동기 호출 전 ref 잠금을 먼저 선점하고 pending 동안 제출 control을 비활성화한다. React state가 갱신되기 전 같은 tick의 이중 클릭도 write를 한 번만 실행해야 한다.
7. custom validation이 invalid submit을 단독 소유하도록 쓰기 `<form>`에는 `noValidate`를 둔다.

표준 RHF 화면은 `useAppForm` + `FormErrorSummary`, 작은 raw-state 화면은 `useManualFormValidation` + `FormErrorSummary`를 사용한다. 부모가 공용 form callback의 오류를 잡는 경우 구조화 field error는 자식으로 다시 전달하고 일반 오류만 부모가 안내한다.

## 신규 화면 루프

1. 화면과 write sink를 구현한다.
2. 제약의 원본과 필드별 메시지를 정하고 invalid/no-write 테스트를 먼저 red로 만든다.
3. 오류 요약·inline ARIA·첫 오류 이동·서버 field error·값 보존·동기 중복 잠금 테스트를 green으로 만든다.
4. [frontend-form-validation-census.json](../../config/governance/frontend-form-validation-census.json)에 exact candidate와 가장 가까운 실행 테스트를 등록한다. 검색·UI primitive·action-only 경계를 입력 form으로 위장하지 않는다. form/editable DOM의 직접 소유 여부와 관계없이 resolvable write sink에 도달하는 각 concrete write control은 후보이며, primary adapter가 소유하지 않는 control은 `secondary-action`으로 따로 등록한다. child component로 전달하는 `handle*` write callback, `StandardDataTable`의 inline/local-variable `bulkActions` callback, `axios.delete` 같은 transport도 실제 trigger·sink별 후보가 된다.
   - editable field를 adapter/schema로 검증하는 action은 `validated-secondary-ui-action`으로 schema와 exact `validatedFields`를 남긴다.
   - drag/reorder처럼 구조화된 UI 상태를 보내는 action은 `structured-ui-state-validation`으로 exact payload와 검토한 invariant를 남긴다.
   - `action-only-no-editable-payload`는 정말 편집 payload가 없는 action에만 사용한다.
5. 아래 명령으로 census와 행동 계약을 확인한다.

```bash
pnpm -C frontend run test:form-validation
pnpm -C frontend run type-check
pnpm -C frontend run lint
```

`test:form-validation`은 native/member form, form 없는 editable write, 직접 editable DOM이 없는 action-only screen의 write control을 AST로 다시 수집한다. custom child Form은 parent가 `onSubmit` adapter를 제공하는 형태와 import한 Form이 write를 자체 소유하는 형태를 모두 parent aggregate의 exact composition ledger로 연결한다. child의 `useAppForm` lock·실제 submit pending control, parent의 `isPending` 전달, `onWritePendingChange` 같은 pending bridge가 공유 parent ref에 연결되는지도 함께 해석한다. sibling parent write action이 없는 pure child composition에는 존재하지 않는 mutual-lock/external-busy를 요구하지 않는다. 검색·필터·UI primitive callback은 concrete service/action/mutation write sink에 도달하지 않으면 모집단에 들어오지 않는다. form-less owner의 schema-backed primary submit은 aggregate validated boundary가 소유하고, 같은 primary submit adapter를 호출하는 외부 control은 secondary로 중복 집계하지 않는다. 그 밖의 저장·이동·삭제·말소·가입·추천 control은 exact secondary action으로 분리한다. secondary action은 실제 write sink를 지배하는 guard→ref claim→write→`finally`/mutation `onSettled` release를 추적하고, lock helper와 callback wrapper도 실제 sink에 연결될 때만 인정한다. 실제 control의 `disabled`·`aria-busy`는 같은 action-specific pending state를 공유해야 하며, 그 state의 claim은 실제 sink보다 앞서고 release는 `finally`/`onSettled`에서 settlement 뒤에 이뤄져야 한다. 별도 action이 같은 generic busy identity를 빌리거나 handler ref와 무관한 pending state를 control에 붙이면 실패한다. 실패 feedback은 해당 `catch`/`onError` branch 안에 있어야 한다.

행동 증거는 한 action-specific test block 안에서 같은 sink의 호출 1회와 실패 주입, 같은 trigger control의 중복 실행·disabled·`aria-busy`, visible feedback을 함께 증명해야 한다. 테스트 제목에 action token만 넣고 다른 save/delete control의 assertion을 차용할 수 없다. composed child form은 manifest의 exact `composedChildContracts`(component, child handler/write sinks, 충돌하는 parent action handlers)를 기준으로 child→parent와 parent→child 양방향 잠금, child 자체 pending control, 외부 busy 전달을 별도 증거로 확인한다. 같은 파일의 관련 없는 ref·control·오류 UI나 일반 문자열은 다른 action의 증거가 될 수 없다. 신규·삭제·재분류·만료 예외·FormLabel 문맥 위반·중복 inline alert·모호한 compliance metadata·관련 없는 test evidence가 있으면 실패한다. 같은 gate는 pre-push, `scripts/verify.mjs`, required frontend CI에 연결되어 있다.

## 처리기 해석 범위

census 는 단추·폼의 처리기 이름을 그 이름이 쓰인 자리의 TypeScript 심볼로 따라가 쓰기·동기 잠금·처리 중 표시를 본다(2026-11-27, 파일 안 첫 같은 이름 선언을 빌리던 이름 검색을 바꿨다). 판정 규칙은 그대로다.

- 같은 파일 안: 지역 선언, 같은 파일 훅이 돌려준 객체에서 구조 분해한 처리기, 같은 파일 컴포넌트·함수에 props·인자로 넘긴 처리기를 따라간다. 반환 객체를 `useMemo` 로 감싸거나 인라인 함수(`{ archive: (id) => remove(id) }`)로 돌려줘도, props 를 JSX 스프레드(`{...rowProps}`)나 인라인 화살표 속성(`onArchive={() => remove(id)}`)으로 넘겨도 같다. 값이 여럿이면(조건식, 같은 컴포넌트를 다른 처리기로 두 번 씀) 모두 본다.
- 훅 객체의 멤버(`actions.cleanup()`·`onClick={actions.cleanup}`·`disabled={actions.pending}`)도 구조 분해와 같이 따라간다.
- 다른 파일의 훅(`use…`): 그 훅이 돌려준 처리기와 상태(`[state, setState] = useState()` 의 setter 포함)를 따라간다. 쓰기 증거는 훅 파일의 줄로 적고, 쓰기 호출은 그 호출이 있는 파일의 import 로 판정한다. 처리기를 훅 파일로 옮겨도 경계가 남는다. 다만 다른 파일 값은 쓰기를 가진 처리기일 때만 따라간다 — 토스트·확인 대화 같은 도구 훅의 본문은 처리기 계약에 넣지 않는다.
- 같은 훅을 두 번 부르면 인스턴스가 둘이다. 대기 상태는 처리기가 쓰는 인스턴스의 것이어야 처리 중 표시로 보고, 잠금 획득·해제 도우미도 같은 인스턴스여야 잠금으로 본다. 인스턴스는 `useWriteActions({ lock })` 처럼 인자·props 로 넘겨도 따라간다.
- 공용 단일 실행 훅 [`useSingleFlight`](../../frontend/src/hooks/use-single-flight.ts): 손으로 짜던 `if (pendingRef.current) return; … finally { … }` 대신 `flight.run(task)`·`flight.runFor(key, task)` 로 쓰기를 감싸면 census 가 다른 파일의 감싸기 함수(자기 콜백 매개변수를 부르는 함수)를 따라가 같은 파일 감싸기 함수와 같은 규칙으로 잠금·처리 중 표시를 판정한다. 동작마다 인스턴스를 하나씩 두고, 단추의 `disabled`·`aria-busy` 는 같은 상태(`flight.pending` 또는 `flight.pendingKey`)로 묶는다. 콜백은 인라인 함수든 이름으로 넘긴 함수든 된다(이름으로 넘긴 함수를 감싸기 밖에서도 직접 부르면 잠금으로 보지 않는다). 감싸기 함수의 finally 해제는 콜백을 바로 `await task()` 로 기다려야 잠금으로 보고(Promise 사슬 너머의 await 는 보지 않는다), 대기 상태는 감싸기 호출과 같은 인스턴스의 것이어야 하며, 훅 안 ref 는 그 ref 를 잡는 함수를 부른 인스턴스로 이름을 한정해 서로 다른 인스턴스를 상호 잠금으로 보지 않는다. 서로의 `isRunning()` 으로 막는 두 인스턴스는 아직 상호 잠금으로 읽지 않는다(보수적 미탐 — 합성 폼 자식 제출에서만 생긴다). 감싸기 함수 자체의 모양(한 분기만 await, 중첩 함수 안 await)은 정밀하게 가리지 않는다 — 공인 감싸기 함수는 공용 훅 하나이고 census 시험이 그 실제 원문을 읽으므로, 새 감싸기 함수를 만들지 말고 이 훅을 쓴다. 폼 제출은 아직 이 훅으로 옮기지 않는다 — 폼의 동기 잠금은 파일 단위 원문 표지(`…PendingRef`)로만 보므로, 그 표지를 훅 호출로 넓히면 같은 파일의 다른 동작을 감싼 호출이 잠그지 않은 제출의 증거가 된다. 훅의 함수를 `useCallback` 으로 감싸면 census 가 감싸기 함수를 못 보므로 그렇게 바꾸지 않는다(census 시험이 실제 훅 원문으로 이를 지킨다). 상호 배제·화면 이탈 뒤 해제 생략처럼 의미가 다른 잠금은 기계적으로 옮기지 않는다. 다음 모양도 census 가 훅의 잠금·처리 중 표시를 따라가지 못해 붉게 판정하므로(거짓 통과는 아니다) 손으로 짠 잠금을 둔다.
  - 옮길 잠금이 폼 없는 쓰기(formless-write) 경계가 있는 파일의 유일한 동기 ref 일 때. 그 경계는 폼처럼 파일 원문의 동기 ref 표지로 판정하므로, 다른 동기 ref 가 남는 파일(등록·전송 잠금이 남는 템플릿 관리·쪽지)은 옮겨도 된다.
  - 쓰기를 콜백으로 받는 범용 실행 함수(`runAction(member, kind, call)`) 안의 잠금.
  - 훅이 반환 객체의 속성(`{ pendingId: flight.pendingKey }`)으로 돌려준 대기 상태.
- 다른 파일에서 가져온 서비스·액션 함수는 쓰기 지점이다. census 는 그 함수 본문에 들어가지 않는다.
- 다른 파일 컴포넌트에 넘기는 쓰기 처리기는 부모 쪽 속성 이름으로만 따라간다(`handle…`·`onClick`·`onSave` → 자식 정의의 같은 이름 컨트롤). 화면을 다른 파일의 하위 컴포넌트로 나눌 때는 이 이름 관례를 지킨다.
- 남은 경계: 폼 없는 편집 화면(formless-write) 경계는 그 컴포넌트 본문에 쓰기 호출이 있어야 잡힌다 — 쓰기를 다른 파일 훅으로 옮기면 그 경계는 빠지고, 단추(onClick·onSave·handle…)로 부르는 쓰기만 보조 동작 경계로 남는다. 그런 분해는 옮기기 전후 `--print-draft` 결과를 비교하고, 빠지면 처리기를 컨트롤 파일에 두거나 보조 동작 컨트롤로 잇는다. `disabled` 식의 대기 상태 극성(`!pending`)은 보지 않는다. 규칙 밖 누락 목록은 활성 gap `GAP-FORM-001` 이 정본이다.

## RED 증명

게이트를 수정할 때는 최소한 다음 위반이 red인지 함께 확인한다.

- 등록되지 않은 native/member/formless write 추가
- `URLSearchParams.delete`, `Set.delete`, `Map.delete`를 서버 mutation으로 잘못 분류
- mutation을 search/filter로 위장
- generated 최대 길이 또는 필수 제약 제거
- `FormLabel`을 `FormField`·`FormItem` 밖에서 사용
- `noValidate`, 오류 요약, 서버 오류 연결 또는 동기 pending 잠금 제거
- form/editable DOM 유무와 관계없이 concrete secondary write action에서 실제 handler ref lock·실패 feedback 또는 실제 control의 `disabled`·`aria-busy` 제거
- `disabled={false}`/`aria-busy="false"` 또는 서로 무관한 상태를 pending control 증거로 사용
- handler ref는 실제 sink를 잠그지만 control의 `disabled`·`aria-busy`는 sink를 감싸지 않는 decoy state를 사용
- 여러 secondary action이 action identity 없이 하나의 generic busy state를 공유
- write 전에 lock을 잡지 않거나, write 전에 해제하거나, reject 시 건너뛰는 plain post-`await` 해제를 사용
- 성공 toast와 빈 `catch`를 실패 feedback으로 위장하거나, 같은 source의 다른 handler/control에만 있는 ref·feedback으로 compliance를 주장
- 같은 파일의 다른 컴포넌트에 있는 같은 이름 처리기의 잠금을 빌리거나, 같은 파일 훅에서 구조 분해한 처리기를 같은 이름의 다른 지역 함수로 판정
- 쓰기 처리기를 다른 파일의 훅으로 옮겨 경계·잠금·처리 중 표시를 잃음
- 여러 대안 처리기 중 처음 것만 보거나, `useMemo` 반환·JSX 스프레드·인라인 화살표 속성·훅 객체 멤버로 넘긴 처리기를 놓침
- 같은 훅의 다른 인스턴스에서 대기 상태나 잠금 해제를 빌리거나, 도구 훅(토스트) 본문의 이름을 대기 상태로 적음
- `StandardDataTable bulkActions={localVariable}` callback이나 `axios.delete` sink를 ledger에서 누락
- custom child Form parent aggregate, child로 전달되는 `handle*` write callback, 가입·추천 action을 ledger에서 누락
- action 행동 assertion을 여러 test block에 분산하거나, 같은 block 안에서 다른 sink·control의 assertion을 차용
- composed child submit과 parent action의 aggregate ref/pending 신호만 제시하고 exact 양방향 mutual-lock을 누락
- `messageProps(...)` inline 오류에 중복 `role="alert"`를 추가
- 다른 화면의 테스트를 evidence로 연결하거나 예외 만료
- `WRITE_NOT_IMPLEMENTED=true`, 501 안내, exact control `disabled` 중 하나를 제거해 compile-time-disabled write 예외를 활성 경계로 바꿈

## 현재 census 기준선

native form·member form·formless write·secondary action의 현재 모집단과 기대 개수는 [census manifest](../../config/governance/frontend-form-validation-census.json)의 `expected`와 실제 audit 출력을 대조한다. 문서에는 개수를 복제하지 않으며, detector·화면 변경으로 모집단이 달라지면 같은 변경 세트에서 manifest를 갱신하고 행동 계약을 검증한다.

현재 noncompliant 경계는 0개다. `WorkReportClient`·`ScheduleCalendarClient`(2026-10-12 업무 허브 분해로 `WorkHubClient` 를 나눴다), `DeptJobDetailClient`, `DeptJobCreateClient` composition과 `ScheduleCalendarClient.handleDeleteSchedule`은 exact sink·pending·실패·상호 잠금 행동 증거까지 등록되어 있다. 비활성 쓰기 예외는 현재 0건이다 — 유일했던 네트워크 관리 화면은 DEC-OPS-129로 퇴역했다. 화면 관리의 이전 프로그램 폼(`ProgramForm`)과 그 composition 은 2026-10-04 프로그램 목록 퇴역으로 걷었다.
