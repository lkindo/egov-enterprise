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

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new LoginUserArgumentResolver());
    }

    @Override

    public void configureViewResolvers(

            org.springframework.web.servlet.config.annotation.ViewResolverRegistry registry) {

        org.springframework.web.servlet.view.InternalResourceViewResolver resolver = new org.springframework.web.servlet.view.InternalResourceViewResolver();

        resolver.setPrefix("/WEB-INF/jsp/");

        resolver.setSuffix(".jsp");

        resolver.setViewClass(org.springframework.web.servlet.view.JstlView.class);

        registry.viewResolver(resolver);

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
        registry.addInterceptor(new nuri.api.interceptor.SortParameterGuard())

                .addPathPatterns("/api/**");

        sensitiveAuditInterceptor.ifAvailable(interceptor -> registry.addInterceptor(interceptor).addPathPatterns("/api/**"));

        registry.addInterceptor(operationalAuditInterceptor)

                .addPathPatterns("/api/**");

    }

}
