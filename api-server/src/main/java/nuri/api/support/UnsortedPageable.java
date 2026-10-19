package nuri.api.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 이 {@code Pageable} 은 {@code page}·{@code size} 만 쓰고 클라이언트 정렬({@code sort})은 받지 않는다(ADR-0036).
 *
 * <p>종전에 {@code @RequestParam int page/pageIndex} 로 받던 목록을 {@code Pageable} 로 옮기면서 정렬의 허용 범위가
 * 넓어지지 않게 한다. 핸들러는 {@link PageRequests#unsorted} 로 정렬을 걷거나 번호·크기만 꺼내 쓰고,
 * {@code OpenApiConfig#paginationParameterCustomizer} 가 스펙에서 {@code sort} 를 뺀다.
 * {@code PageableConstructionLinterTest} 가 이 파라미터를 다른 방식으로 넘기지 않는지 본다.
 */
@Documented
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface UnsortedPageable {
}
