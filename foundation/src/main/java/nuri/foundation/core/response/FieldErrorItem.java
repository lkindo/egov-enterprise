package nuri.foundation.core.response;

/**
 * 필드 단위 검증 오류 1건.
 *
 * <p>[존재 이유 — W1-14] 종전에는 {@code MethodArgumentNotValidException} 핸들러가 필드 오류들을
 * {@code ", "} 로 이어 붙여 하나의 문장으로 만들었다. 그래서 클라이언트는 <b>어떤 입력이 틀렸는지</b>
 * 알 수 없었고, 사용자는 폼 전체를 훑으며 스스로 찾아야 했다.
 *
 * <p><b>{@code Map<String,String>} 이 아니라 리스트인 이유:</b> 맵은 필드당 오류를 하나만 담는다.
 * 비밀번호처럼 규칙이 여럿인 필드(길이·문자 구성·확인 일치)는 동시에 여러 개가 틀릴 수 있고,
 * 그때 맵은 하나를 조용히 버린다. 리스트는 같은 필드가 여러 번 나올 수 있다.
 *
 * @param field   요청 DTO 의 필드 경로. 프론트의 폼 필드 이름과 대응한다.
 * @param message 사용자에게 보여줄 메시지(검증 애노테이션의 message 속성).
 */
public record FieldErrorItem(String field, String message) {
}
