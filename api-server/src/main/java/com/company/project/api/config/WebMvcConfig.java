package com.company.project.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // ?뺤쟻 由ъ냼??(CSS, JS, Images) 留ㅽ븨
        registry.addResourceHandler("/css/**").addResourceLocations("/css/");
        registry.addResourceHandler("/js/**").addResourceLocations("/js/");
        registry.addResourceHandler("/images/**").addResourceLocations("/images/");

        // ?쒕툝由?而⑦뀓?ㅽ듃 猷⑦듃???뺤쟻 ?먯썝 ?덉슜
        // registry.addResourceHandler("/**").addResourceLocations("/");
    }
}
