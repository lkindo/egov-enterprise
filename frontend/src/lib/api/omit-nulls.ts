/**
 * 응답에서 읽은 값을 **요청으로 되돌려 실을 때** null 필드를 떨어뜨린다.
 *
 * [왜 필요한가] 생성 계약의 요청·응답 방향이 비대칭이다. DEC-OPS-028 이 **응답** 방향의
 * non-required 필드에만 `.nullable()` 을 붙였기 때문이다(springdoc 이 Java DTO 의 nullability 를
 * 추론하지 못해 정상 응답이 런타임에 throw 하던 것을 고친 결정). 그 결과 같은 필드가
 *
 *   요청: `z.string().optional()`            ← null 을 **거부**한다
 *   응답: `z.string().optional().nullable()` ← null 을 허용한다
 *
 * 로 갈린다. 그래서 "전체 치환 PUT 이라 화면이 묻지 않는 필드도 상세에서 읽어 되돌려 보낸다"
 * 는 이 저장소의 확립된 왕복 패턴(DEC-OPS-045·058·071)이, **그 필드가 null 인 행**에서는
 * 요청 스키마 파싱에 걸려 실패한다. 차단은 `parseGeneratedOperationRequest` 안에서 일어나므로
 * **HTTP 요청이 나가기 전**이고, 서버 로그에는 아무 흔적도 남지 않는다.
 *
 * null 이 생기는 경로는 평범하다 — 등록 폼이 묻지 않는 선택 필드를 서버가 그대로 null 로
 * 저장하면, 그 행은 이후 어떤 수정도 받지 못한다. "같은 화면인데 어떤 행은 되고 어떤 행은
 * 안 된다" 로 나타난다.
 *
 * [무엇을 하지 않는가] 얕은 1단계만 훑는다. 중첩 객체·배열 안의 null 은 건드리지 않는다 —
 * 그 안까지 손대면 서버가 "명시적으로 비운다" 로 읽어야 할 값까지 조용히 지울 수 있다.
 * `undefined` 는 이미 직렬화에서 빠지므로 그대로 둔다.
 *
 * ⚠ 이 함수는 **되돌려 싣는 값**에만 쓴다. 사용자가 화면에서 비운 값(빈 문자열 등)은 그대로
 * 보내야 서버가 지운다 — null 로 바꿔 넣은 뒤 이 함수를 태우면 "지우기" 가 "유지" 로 뒤집힌다.
 *
 * [제약이 `object` 인 이유] 되돌려 싣는 값은 대부분 생성 타입·수제 DTO 같은 **interface** 다.
 * interface 는 index signature 가 없어 `Record<string, unknown>` 에 할당되지 않으므로, 그
 * 제약으로는 정작 이 함수가 필요한 자리에서 전부 컴파일 오류가 난다.
 */
export function omitNulls<T extends object>(source: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== null) out[key] = value;
  }
  return out as Partial<T>;
}
