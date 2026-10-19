package nuri.business.support;

import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

/**
 * 시험용 {@code Pageable} 리졸버의 유일한 생성 지점(ADR-0036).
 *
 * <p>standalone MockMvc 는 Spring Boot 설정을 읽지 않는다. 시험마다 {@code new PageableHandlerMethodArgumentResolver()} 를
 * 만들면 운영과 달리 0 기반 {@code page} 로 해석해, 옛 기준을 검증하며 green 이 된다(테스트 application.yml 섀도잉과 같은 함정).
 * 그래서 운영 {@code spring.data.web.pageable.*} 와 같은 값으로 만든 리졸버를 여기서만 준다.
 * {@code PageableConstructionLinterTest} 가 아래 두 상수와 main·test application.yml 의 값이 같은지,
 * 그리고 시험 소스가 이 클래스 밖에서 리졸버를 직접 만들지 않는지 본다.
 */
public final class PageableTestResolvers {

    /** main·test application.yml 의 {@code spring.data.web.pageable.one-indexed-parameters} 와 같다. */
    public static final boolean ONE_INDEXED_PARAMETERS = true;

    /** main·test application.yml 의 {@code spring.data.web.pageable.max-page-size} 와 같다. */
    public static final int MAX_PAGE_SIZE = 100;

    private PageableTestResolvers() { }

    /** 운영과 같은 설정의 새 리졸버. */
    public static PageableHandlerMethodArgumentResolver standard() {
        PageableHandlerMethodArgumentResolver resolver = new PageableHandlerMethodArgumentResolver();
        apply(resolver);
        return resolver;
    }

    /** 이미 만들어진 리졸버(예: {@code @EnableSpringDataWebSupport} 의 것)에 운영 설정을 입힌다. */
    public static void apply(PageableHandlerMethodArgumentResolver resolver) {
        resolver.setOneIndexedParameters(ONE_INDEXED_PARAMETERS);
        resolver.setMaxPageSize(MAX_PAGE_SIZE);
    }
}
