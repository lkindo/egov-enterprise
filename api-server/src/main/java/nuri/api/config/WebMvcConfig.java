package nuri.api.config;

import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.business.security.resolver.LoginUserArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final OperationalAuditInterceptor operationalAuditInterceptor;
    private final org.springframework.beans.factory.ObjectProvider<nuri.api.interceptor.SensitiveAuditInterceptor> sensitiveAuditInterceptor;
    /** Spring Data 웹 지원의 정렬 리졸버(spring.data.web.sort.* 설정이 붙은 것) — 정렬 허용 목록이 같은 해석을 쓴다. */
    private final org.springframework.beans.factory.ObjectProvider<org.springframework.data.web.SortHandlerMethodArgumentResolver> sortResolver;

    /** 리졸버가 읽는 정렬 파라미터 이름 — 이름을 바꾼 배포에서도 허용 목록이 같은 파라미터를 본다. */
    @org.springframework.beans.factory.annotation.Value("${spring.data.web.sort.sort-parameter:sort}")
    private String sortParameter;

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new LoginUserArgumentResolver());
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 정적 리소스(CSS, JS, Images) 설정 - classpath 접두어 사용으로 안전성 확보
        registry.addResourceHandler("/css/**").addResourceLocations("classpath:/static/css/");
        registry.addResourceHandler("/js/**").addResourceLocations("classpath:/static/js/");
        registry.addResourceHandler("/images/**").addResourceLocations("classpath:/static/images/");
        registry.addResourceHandler("/favicon.ico").addResourceLocations("classpath:/static/favicon.ico");
    }

    @Override

    public void addInterceptors(InterceptorRegistry registry) {

        // 관리자가 초기화한 임시 비밀번호로는 비밀번호 변경 밖의 API 를 쓸 수 없다(2026-10-01 결정 18).
        registry.addInterceptor(new nuri.api.interceptor.PasswordChangeRequiredGuard())
                .addPathPatterns("/api/**");

        // 형식이 아닌 sort 값을 저장소에 닿기 전에 400 으로 끝낸다(2026-09-24 ZAP API 스캔).
        // [2026-11-25 DEC-OPS-433] 정렬 허용 목록 — 핸들러가 실제로 받을 정렬을 Spring Data 의 정렬 리졸버로 만들어 본다.
        registry.addInterceptor(new nuri.api.interceptor.SortParameterGuard(
                sortResolver.getIfAvailable(org.springframework.data.web.SortHandlerMethodArgumentResolver::new), sortParameter))

                .addPathPatterns("/api/**");

        sensitiveAuditInterceptor.ifAvailable(interceptor -> registry.addInterceptor(interceptor).addPathPatterns("/api/**"));

        registry.addInterceptor(operationalAuditInterceptor)

                .addPathPatterns("/api/**");

    }

}
