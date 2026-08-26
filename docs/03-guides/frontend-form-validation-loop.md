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
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend run lint
```

`test:form-validation`은 native/member form, form 없는 editable write, 직접 editable DOM이 없는 action-only screen의 write control을 AST로 다시 수집한다. custom child Form은 parent가 `onSubmit` adapter를 제공하는 형태와 import한 Form이 write를 자체 소유하는 형태를 모두 parent aggregate의 exact composition ledger로 연결한다. child의 `useAppForm` lock·실제 submit pending control, parent의 `isPending` 전달, `onWritePendingChange` 같은 pending bridge가 공유 parent ref에 연결되는지도 함께 해석한다. sibling parent write action이 없는 pure child composition에는 존재하지 않는 mutual-lock/external-busy를 요구하지 않는다. 검색·필터·UI primitive callback은 concrete service/action/mutation write sink에 도달하지 않으면 모집단에 들어오지 않는다. form-less owner의 schema-backed primary submit은 aggregate validated boundary가 소유하고, 같은 primary submit adapter를 호출하는 외부 control은 secondary로 중복 집계하지 않는다. 그 밖의 저장·이동·삭제·말소·가입·추천 control은 exact secondary action으로 분리한다. secondary action은 실제 write sink를 지배하는 guard→ref claim→write→`finally`/mutation `onSettled` release를 추적하고, lock helper와 callback wrapper도 실제 sink에 연결될 때만 인정한다. 실제 control의 `disabled`·`aria-busy`는 같은 action-specific pending state를 공유해야 하며, 그 state의 claim은 실제 sink보다 앞서고 release는 `finally`/`onSettled`에서 settlement 뒤에 이뤄져야 한다. 별도 action이 같은 generic busy identity를 빌리거나 handler ref와 무관한 pending state를 control에 붙이면 실패한다. 실패 feedback은 해당 `catch`/`onError` branch 안에 있어야 한다.

행동 증거는 한 action-specific test block 안에서 같은 sink의 호출 1회와 실패 주입, 같은 trigger control의 중복 실행·disabled·`aria-busy`, visible feedback을 함께 증명해야 한다. 테스트 제목에 action token만 넣고 다른 save/delete control의 assertion을 차용할 수 없다. composed child form은 manifest의 exact `composedChildContracts`(component, child handler/write sinks, 충돌하는 parent action handlers)를 기준으로 child→parent와 parent→child 양방향 잠금, child 자체 pending control, 외부 busy 전달을 별도 증거로 확인한다. 같은 파일의 관련 없는 ref·control·오류 UI나 일반 문자열은 다른 action의 증거가 될 수 없다. 신규·삭제·재분류·만료 예외·FormLabel 문맥 위반·중복 inline alert·모호한 compliance metadata·관련 없는 test evidence가 있으면 실패한다. 같은 gate는 pre-push, `scripts/verify.mjs`, required frontend CI에 연결되어 있다.

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
- `StandardDataTable bulkActions={localVariable}` callback이나 `axios.delete` sink를 ledger에서 누락
- custom child Form parent aggregate, child로 전달되는 `handle*` write callback, 가입·추천 action을 ledger에서 누락
- action 행동 assertion을 여러 test block에 분산하거나, 같은 block 안에서 다른 sink·control의 assertion을 차용
- composed child submit과 parent action의 aggregate ref/pending 신호만 제시하고 exact 양방향 mutual-lock을 누락
- `messageProps(...)` inline 오류에 중복 `role="alert"`를 추가
- 다른 화면의 테스트를 evidence로 연결하거나 예외 만료
- `WRITE_NOT_IMPLEMENTED=true`, 501 안내, exact control `disabled` 중 하나를 제거해 compile-time-disabled write 예외를 활성 경계로 바꿈

## 현재 census 기준선

2026-08-26 AST 기준선은 native form 47개(45 files), member form 1개, formless write 21개, secondary action 52개, 총 121개다. 정본은 census manifest와 실제 audit 출력이며 이 숫자는 detector·manifest 변경과 같은 변경 세트에서만 갱신한다.

현재 noncompliant 경계는 0개다. `ProgramAdminClient`, `WorkHubClient`, `DeptJobDetailClient`, `DeptJobCreateClient` composition과 `WorkHubClient.handleDeleteSchedule`은 exact sink·pending·실패·상호 잠금 행동 증거까지 등록되어 있다. Network create/update/delete는 `WRITE_NOT_IMPLEMENTED=true`, 501 안내, exact disabled control을 모두 검증하는 2026-12-31 만료 예외이며 상수가 활성화되거나 증거가 사라지면 gate가 즉시 red가 된다.
