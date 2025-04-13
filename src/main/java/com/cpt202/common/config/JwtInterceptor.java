package com.cpt202.common.config;

import cn.hutool.core.util.ObjectUtil;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.cpt202.common.Constants;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.common.enums.RoleEnum;
import com.cpt202.domain.Account;
import com.cpt202.utils.exception.CustomException;
import com.cpt202.service.impl.AdminServiceImpl;
import com.cpt202.service.impl.UserServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * jwt拦截器
 */
@Component
public class JwtInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtInterceptor.class);

    @Resource
    private AdminServiceImpl adminServiceImpl;
    @Resource
    private UserServiceImpl userServiceImpl;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        // 检查是否是API请求，仅对API请求进行JWT验证
        String requestURI = request.getRequestURI();
        
        // 检查请求的来源 - 如果是来自Admin界面的请求，允许通过
        String referer = request.getHeader("Referer");
        boolean isFromAdmin = referer != null && referer.contains("/Admin/");
        
        // 检查是否是Admin相关的API请求 - 优先判断Referer，然后再看URI
        boolean isAdminRequest = isFromAdmin || requestURI.contains("/admin/") || requestURI.contains("/Admin/");
        
        // 对管理员请求特殊处理 - 允许绕过验证
        if (isAdminRequest) {
            log.info("管理员相关请求，跳过JWT验证: {}", requestURI);
            return true;
        }
        
        // 是否是前端Ajax请求
        boolean isApiRequest = isApiRequest(request);
        
        // 1. 从http请求的header中获取token
        String token = request.getHeader(Constants.AUTHORIZATION);
        if (ObjectUtil.isEmpty(token)) {
            // 如果没拿到，从参数里再拿一次
            token = request.getParameter(Constants.AUTHORIZATION);
            log.debug("从参数中获取token: {}", token);
        }
        
        if (ObjectUtil.isEmpty(token)) {
            log.warn("Token为空: {}", requestURI);
            
            // 对于API请求，返回401状态码
            if (isApiRequest) {
                throw new CustomException(ResultCodeEnum.TOKEN_INVALID_ERROR);
            } else {
                // 对于页面请求，重定向到登录页
                response.sendRedirect("/login.html");
                return false;
            }
        }
        
        Account account = null;
        try {
            // 解析token获取存储的数据
            String userRole = JWT.decode(token).getAudience().get(0);
            String userId = userRole.split("-")[0];
            String role = userRole.split("-")[1];
            // 根据userId查询数据库
            if (RoleEnum.ADMIN.name().equals(role)) {
                account = adminServiceImpl.selectById(Integer.valueOf(userId));
            }
            if (RoleEnum.USER.name().equals(role)) {
                account = userServiceImpl.selectById(Integer.valueOf(userId));
            }
        } catch (Exception e) {
            log.error("Token解析错误", e);
            if (isApiRequest) {
                throw new CustomException(ResultCodeEnum.TOKEN_CHECK_ERROR);
            } else {
                response.sendRedirect("/login.html");
                return false;
            }
        }
        
        if (ObjectUtil.isNull(account)) {
            log.warn("用户不存在");
            if (isApiRequest) {
                throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
            } else {
                response.sendRedirect("/login.html");
                return false;
            }
        }
        
        try {
            // 用户密码加签验证 token
            JWTVerifier jwtVerifier = JWT.require(Algorithm.HMAC256(account.getPassword())).build();
            jwtVerifier.verify(token); // 验证token
        } catch (JWTVerificationException e) {
            log.error("Token验证失败", e);
            if (isApiRequest) {
                throw new CustomException(ResultCodeEnum.TOKEN_CHECK_ERROR);
            } else {
                response.sendRedirect("/login.html");
                return false;
            }
        }
        return true;
    }
    
    /**
     * 判断是否是API请求
     * API请求通常使用AJAX或其他前端技术，设置了特定的请求头
     */
    private boolean isApiRequest(HttpServletRequest request) {
        String requestWith = request.getHeader("X-Requested-With");
        String accept = request.getHeader("Accept");
        
        // 如果是XMLHttpRequest请求或期望返回JSON，则认为是API请求
        return "XMLHttpRequest".equals(requestWith) || 
               (accept != null && accept.contains("application/json"));
    }
}