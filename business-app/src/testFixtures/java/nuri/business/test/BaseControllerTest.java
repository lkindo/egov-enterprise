package nuri.business.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 전역적인 엄격한 Jackson 설정과 예외 처리를 공유하는 베이스 컨트롤러 테스트 클래스
 * foundation 모듈의 testFixtures 에 위치하여 모든 모듈에서 재사용 가능합니다.
 */
public abstract class BaseControllerTest {

    protected MockMvc mockMvc;

    @BeforeEach
    void setupInternal() {
        ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json()
                .modules(new JavaTimeModule(), new ParameterNamesModule())
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .failOnUnknownProperties(true)
                .build();
        
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(objectMapper);
        
        java.util.List<org.springframework.web.method.support.HandlerMethodArgumentResolver> resolvers = new java.util.ArrayList<>();
        resolvers.add(new org.springframework.data.web.PageableHandlerMethodArgumentResolver());
        java.util.Collections.addAll(resolvers, getCustomArgumentResolvers());
        
        mockMvc = MockMvcBuilders.standaloneSetup(getController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(converter)
                .setCustomArgumentResolvers(resolvers.toArray(new org.springframework.web.method.support.HandlerMethodArgumentResolver[0]))
                .addInterceptors(getInterceptors())
                .build();
    }

    /**
     * 테스트할 대상 컨트롤러를 반환해야 합니다.
     */
    protected abstract Object getController();

    /**
     * 커스텀 Argument Resolver가 필요한 경우 오버라이드합니다.
     */
    protected org.springframework.web.method.support.HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new org.springframework.web.method.support.HandlerMethodArgumentResolver[0];
    }

    /**
     * 인터셉터가 필요한 경우 오버라이드합니다.
     */
    protected org.springframework.web.servlet.HandlerInterceptor[] getInterceptors() {
        return new org.springframework.web.servlet.HandlerInterceptor[0];
    }
}
