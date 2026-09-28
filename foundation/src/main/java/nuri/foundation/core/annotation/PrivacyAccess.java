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
}
