package nuri.business.test;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * 전역적인 엄격한 Jackson 설정과 예외 처리를 공유하는 베이스 컨트롤러 테스트 클래스
 * foundation 모듈의 testFixtures 에 위치하여 모든 모듈에서 재사용 가능합니다.
 */
public abstract class BaseControllerTest {

    protected MockMvc mockMvc;

    // 운영 매퍼와 같은 규칙(ADR-0024 2단계): Jackson 3 에 종전 Jackson 2 기본값을 입히고, 종전 설정이 등록하던
    //   파라미터 이름 모듈·날짜 문자열·알 수 없는 필드 거부를 같은 뜻의 기능으로 켠다.
    @BeforeEach
    void setupInternal() {
        JsonMapper objectMapper = JsonMapper.builder()
                .configureForJackson2()
                .enable(MapperFeature.DETECT_PARAMETER_NAMES)
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();

        JacksonJsonHttpMessageConverter converter = new JacksonJsonHttpMessageConverter(objectMapper);
        
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
