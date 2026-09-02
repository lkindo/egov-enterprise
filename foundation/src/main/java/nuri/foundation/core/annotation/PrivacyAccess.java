package nuri.foundation.core.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 이 핸들러가 <b>타인의 개인정보를 조회</b>함을 선언한다. 붙은 엔드포인트가 성공 응답을 내면
 * {@code tb_privacy_log}에 접근 기록이 남는다.
 *
 * <p><b>왜 애노테이션인가.</b> 개인정보 접근 기록은 컴플라이언스 증적이라 "어디까지 기록되는가"가
 * 코드에서 읽혀야 한다. URL 패턴 목록을 별도 설정 파일에 두면 라우트가 바뀔 때 조용히 어긋나지만,
 * 핸들러에 붙은 선언은 핸들러와 함께 움직인다.
 *
 * <p><b>붙이는 기준.</b> 응답이 <b>본인 아닌 사람</b>의 주민등록번호·연락처·주소·생년월일 중
 * 하나 이상을 포함할 때 붙인다. 본인 정보 조회(마이페이지)는 대상이 아니다 — 자기 정보를 보는 것은
 * 개인정보 '제공'이 아니며, 기록하면 증적이 자기 열람으로 희석된다.
 *
 * <p>{@link #value()}는 {@code tb_privacy_log.inq_info}(255자)에 그대로 실린다. 어떤 항목을 봤는지
 * 사람이 읽을 수 있게 쓰되, <b>실제 개인정보 값을 넣지 않는다</b>(증적이 곧 유출이 된다).
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface PrivacyAccess {

    /** 조회 대상 개인정보 항목 서술. 예: {@code "사용자 상세(연락처·생년월일·주소)"} */
    String value();
}
