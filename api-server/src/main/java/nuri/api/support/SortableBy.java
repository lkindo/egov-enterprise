package nuri.api.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 이 {@code Pageable} 이 받는 클라이언트 정렬({@code sort}) 속성의 허용 목록(2026-11-25 품질 평가).
 *
 * <p>{@code Pageable} 은 기본으로 클라이언트 정렬을 받지 않는다 — {@link nuri.api.interceptor.SortParameterGuard} 가 이 표시가 없는
 * 핸들러의 {@code sort} 를 400 으로 거부하고, {@code OpenApiConfig#paginationParameterCustomizer} 가 스펙에서 {@code sort} 를 뺀다.
 * 종전에는 형식만 보아 화면이 쓰지 않는 임의 속성(인덱스가 없는 열 포함)으로도 정렬할 수 있었다. 화면이 실제로 보내는 정렬만
 * 여기에 적고, 인덱스가 받치는 속성만 둔다. 정렬을 받되 걷어 내는 목록은 {@link UnsortedPageable} 이다.
 */
@Documented
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface SortableBy {

    /** 허용하는 엔티티 속성 경로(대소문자 구분, 정확히 일치). */
    String[] value();
}
