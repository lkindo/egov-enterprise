package nuri.foundation.core.annotation;

import java.lang.annotation.*;

/** Marks a sensitive mutation whose attempt and HTTP outcome accompany its transactional audit. */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface SensitiveOperation {
    String value();

    /**
     * [2026-10-20] 사유를 받는 요청 파라미터 이름(예: 내보내기 사유). 비어 있지 않으면 그 값이 필수이고, 감사 경계가 핸들러를
     * 부르기 전에 검사해 원장의 설명에 함께 남긴다 — 사유 없는 요청은 원장에 시도도 남기지 않고 400 이다. 비어 있으면(기본값)
     * 사유를 받지 않는다.
     */
    String reasonParameter() default "";
}
