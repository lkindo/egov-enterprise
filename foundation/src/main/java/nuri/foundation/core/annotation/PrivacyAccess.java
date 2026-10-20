package nuri.foundation.core.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 타인의 식별·연락 정보 또는 민감 첨부파일/운영 로그의 조회를 선언한다.
 * 요청 실행 전 ATTEMPTED, 인가된 응답 준비 후 전송 전 PREPARED를 내구 기록한다.
 * 기존 tb_privacy_log는 PREPARED 투영이다. SUCCEEDED도 서버 처리 완료이며 수신 보장은 아니다.
 * value에는 항목 설명만 쓰고 실제 개인정보 값을 넣지 않는다.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PrivacyAccess {

    /** 조회 대상 개인정보 항목 서술. 예: {@code "사용자 상세(연락처·생년월일·주소)"} */
    String value();

    /**
     * [2026-10-20] 사유를 받는 요청 파라미터 이름(예: 내보내기 사유). 비어 있지 않으면 그 값이 필수이고, 감사 경계가 핸들러를
     * 부르기 전에 검사해 원장의 설명(시도·응답 준비·완료와 개인정보 접근 기록)에 함께 남긴다 — 사유 없는 요청은 원장에 시도도
     * 남기지 않고 400 이다. 비어 있으면(기본값) 사유를 받지 않는다. 사유는 사람이 쓴 문장이라 실제 개인정보 값을 넣지 않도록 화면이 안내한다.
     */
    String reasonParameter() default "";
}
