package nuri.foundation.support;

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
}
