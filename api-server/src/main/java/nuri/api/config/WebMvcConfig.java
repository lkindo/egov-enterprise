package nuri.api.config;

import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.foundation.security.resolver.LoginUserArgumentResolver;
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
        // 정적 리소스(CSS, JS, Images) 설정
        registry.addResourceHandler("/css/**").addResourceLocations("/css/");

        registry.addResourceHandler("/js/**").addResourceLocations("/js/");

        registry.addResourceHandler("/images/**").addResourceLocations("/images/");

    }

    @Override

    public void addInterceptors(InterceptorRegistry registry) {

        registry.addInterceptor(operationalAuditInterceptor)

                .addPathPatterns("/api/**");

    }

}
