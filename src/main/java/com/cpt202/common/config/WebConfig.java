package com.cpt202.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.annotation.Resource;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Resource
    private JwtInterceptor jwtInterceptor;

    // 配置跨域请求
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false);
    }

    // 放开JWT拦截器，直接注释掉配置或移除
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 完全去掉jwt拦截器的配置，进行其他controller的测试
        // registry.addInterceptor(jwtInterceptor)
        //         .addPathPatterns("/**") // 拦截所有请求
        //         .excludePathPatterns("/login", "/register", "/error", "/sendEmail"); // 排除特定路径
    }
}
