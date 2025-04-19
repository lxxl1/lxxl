package com.cpt202.utils;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.ObjectUtil;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.cpt202.common.Constants;
import com.cpt202.common.enums.RoleEnum;
import com.cpt202.domain.Account;
import com.cpt202.service.impl.AdminServiceImpl;
import com.cpt202.service.impl.UserServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.Date;

/**
 * Token工具类
 */
@Component
public class TokenUtils {

    private static final Logger log = LoggerFactory.getLogger(TokenUtils.class);

    private static AdminServiceImpl staticAdminServiceImpl;
    private static UserServiceImpl staticUserServiceImpl;

    @Resource
    AdminServiceImpl adminServiceImpl;
    @Resource
    UserServiceImpl userServiceImpl;

    @PostConstruct
    public void setUserService() {
        staticAdminServiceImpl = adminServiceImpl;
        staticUserServiceImpl = userServiceImpl;
    }

    /**
     * 生成token
     */
    public static String createToken(String data, String sign) {
        return JWT.create().withAudience(data) // 将 userId-role 保存到 token 里面,作为载荷
                .withExpiresAt(DateUtil.offsetHour(new Date(), 2)) // 2小时后token过期
                .sign(Algorithm.HMAC256(sign)); // 以 password 作为 token 的密钥
    }

    /**
     * 获取当前登录的用户信息
     */
    public static Account getCurrentUser() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            String token = request.getHeader(Constants.TOKEN);
            if (ObjectUtil.isNotEmpty(token)) {
                String userRole = JWT.decode(token).getAudience().get(0);
                String userId = userRole.split("-")[0];  // 获取用户id
                String role = userRole.split("-")[1];    // 获取角色
                if (RoleEnum.ADMIN.name().equals(role)) {
                    return staticAdminServiceImpl.selectById(Integer.valueOf(userId));
                }
                if (RoleEnum.USER.name().equals(role)) {
                    return staticUserServiceImpl.selectById(Integer.valueOf(userId));
                }
            }
        } catch (Exception e) {
            log.error("获取当前用户信息出错", e);
        }
        return new Account();  // 返回空的账号对象
    }
    
    /**
     * 从请求中获取用户ID
     * @param request HTTP请求
     * @return 用户ID，如果获取失败返回null
     */
    public static Integer getUserIdByRequest(HttpServletRequest request) {
        try {
            // Retrieve userId from request attribute set by JwtInterceptor
            Object userIdAttribute = request.getAttribute(Constants.USER_ID_ATTRIBUTE);
            if (userIdAttribute != null) {
                return (Integer) userIdAttribute;
            } else {
                log.warn("User ID not found in request attributes. Token might not have been processed or stored correctly by interceptor.");
                // Optional: Fallback to decoding token again, but it hides the root cause
                // String token = request.getHeader(Constants.TOKEN);
                // if (ObjectUtil.isNotEmpty(token)) {
                //     String userRole = JWT.decode(token).getAudience().get(0);
                //     String userId = userRole.split("-")[0];
                //     return Integer.valueOf(userId);
                // }
            }
        } catch (Exception e) {
            // Log ClassCastException or other errors during retrieval/casting
            log.error("从请求属性中获取用户ID出错", e); 
        }
        return null;
    }
}

