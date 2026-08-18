package nuri.business.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * 전역 MockMvc 테스트 설정
 * - Pageable 파라미터 자동 해석 (PageableHandlerMethodArgumentResolver)
 * - @WebMvcTest 기반 컨트롤러 테스트에서 Pageable 바인딩 오류 방지
 */
@TestConfiguration
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class MockMvcTestConfig implements WebMvcConfigurer {

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new PageableHandlerMethodArgumentResolver());
    }

    @Bean
    public PageableHandlerMethodArgumentResolver pageableHandlerMethodArgumentResolver() {
        return new PageableHandlerMethodArgumentResolver();
    }

    @Bean
    public nuri.business.service.menu.MenuIntegrationService menuIntegrationService() {
        nuri.business.service.menu.MenuIntegrationService mock = org.mockito.Mockito.mock(nuri.business.service.menu.MenuIntegrationService.class);
        // Default context mock to prevent null pointer exceptions
        nuri.business.service.menu.dto.MenuUIContext defaultContext = org.mockito.Mockito.mock(nuri.business.service.menu.dto.MenuUIContext.class);
        org.mockito.Mockito.when(mock.processMenuContext(
            org.mockito.Mockito.anyString(),
            org.mockito.Mockito.any(),
            org.mockito.Mockito.anyString(),
            org.mockito.Mockito.any()
        )).thenReturn(defaultContext);
        return mock;
    }

    /**
     * [W1-J1 회귀 봉합 — 2026-08-03] {@code ClientIpResolver} 를 슬라이스 컨텍스트에 공급한다.
     *
     * <p>Wave 1 의 신뢰 경계 통합(J-1)이 {@code OperationalAuditInterceptor} 에
     * {@code ClientIpResolver} 생성자 의존을 추가했다. 그런데 이 리졸버는 {@code foundation} 의
     * {@code @Component} 라 {@code @WebMvcTest} 슬라이스가 <b>컴포넌트 스캔하지 않는다</b> →
     * 인터셉터 생성 실패 → <b>컨트롤러 테스트 26건이 컨텍스트 로딩 단계에서 통째로 red</b> 가 됐다.
     *
     * <p>그 사실이 오래 드러나지 않은 이유: pre-push 게이트는 컴파일·tsc·codegen·harnessTest 만 돌고
     * {@code :api-server:test} 를 돌지 않는다. 게이트가 보지 않는 곳은 조용히 깨진다(AGENTS.md Evidence guardrails H5).
     *
     * <p>mock 이 아니라 <b>실제 구현</b>을 기본 신뢰 대역과 함께 넣는다 — mock 이면 IP 판정이 null 이 되어
     * 감사 경로가 테스트에서만 다르게 동작한다. {@code @ConditionalOnMissingBean} 이라
     * 실제 컨텍스트를 띄우는 테스트에서는 스캔된 빈이 그대로 쓰인다.
     */
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean(nuri.foundation.security.net.ClientIpResolver.class)
    public nuri.foundation.security.net.ClientIpResolver clientIpResolver() {
        return new nuri.foundation.security.net.ClientIpResolver(
                "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16");
    }
}
