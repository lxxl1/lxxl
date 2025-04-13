package com.cpt202.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
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

    // 配置JWT拦截器
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/**") // 拦截所有请求
                .excludePathPatterns(
                        // 登录注册相关接口
                        "/login", 
                        "/register", 
                        "/sendEmail", 
                        "/verifyToken",
                        "/resetPassword",
                        "/forgetPassword",
                        
                        // 错误页
                        "/error", 
                        
                        // 公开API，不需要认证
                        "/song/**",
                        "/singer/**",
                        
                        // 管理员相关API
                        "/admin/**",
                        "/Admin/**",
                        
                        // 静态资源
                        "/**/*.html", 
                        "/**/*.js", 
                        "/**/*.css",
                        "/**/*.ico",
                        "/**/*.png", 
                        "/**/*.jpg",
                        "/**/*.jpeg",
                        "/**/*.gif",
                        "/**/*.svg",
                        "/**/*.ttf",
                        "/**/*.woff",
                        "/**/*.woff2",
                        "/**/*.map",
                        
                        // 目录级别的静态资源
                        "/static/**",
                        "/resources/**",
                        "/User/**",
                        "/Admin/**", 
                        "/Common/**",
                        "/upload/**",
                        
                        // Swagger相关
                        "/swagger-ui.html",
                        "/swagger-resources/**",
                        "/v2/api-docs",
                        "/webjars/**"
                ); // 排除公共路径和静态资源
    }
    
    // 添加静态资源处理
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/", "classpath:/resources/");
        
        // Swagger资源处理
        registry.addResourceHandler("swagger-ui.html")
                .addResourceLocations("classpath:/META-INF/resources/");
        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }
}
