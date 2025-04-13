package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Account;
import com.cpt202.service.impl.AdminServiceImpl;
import com.cpt202.service.impl.UserServiceImpl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;

/**
 * 用于处理token验证的控制器
 */
@RestController
public class TokenController {

    @Resource
    private AdminServiceImpl adminServiceImpl;

    @Resource
    private UserServiceImpl userServiceImpl;

    /**
     * 验证token是否有效
     * JWT拦截器会自动验证token，如果token无效，拦截器会抛出异常
     * 因此，如果请求能够到达这个方法，说明token是有效的
     */
    @GetMapping("/verifyToken")
    public Result verifyToken(HttpServletRequest request) {
        return Result.success("Token is valid");
    }
} 