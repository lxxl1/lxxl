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
        registry.addMapping("/**") // 允许访问的路径
                .allowedOrigins("http://127.0.0.1:5500") // 允许跨域的来源地址（前端地址）
                .allowedMethods("GET", "POST", "PUT", "DELETE") // 允许的请求方法
                .allowedHeaders("*") // 允许所有的请求头
                .allowCredentials(true); // 允许发送 Cookie
    }

    // 配置拦截器
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 这里你可以根据需要拦截路径
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/**") // 拦截所有请求
                .excludePathPatterns("/login", "/register", "/error", "/sendEmail"); // 排除特定路径
    }
}
