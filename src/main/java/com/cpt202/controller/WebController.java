package com.cpt202.controller;

import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import com.cpt202.common.Result;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.common.enums.RoleEnum;
import com.cpt202.domain.Account;
import com.cpt202.service.AdminService;
import com.cpt202.service.UserService;
import com.cpt202.utils.exception.CustomException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Import necessary classes for email reset
import javax.mail.MessagingException;
import com.cpt202.domain.Mail; // Assuming Mail domain contains email and code
import com.cpt202.service.EmailService;
import com.cpt202.utils.VerificationCodeUtils;

import java.util.Map;

/**
 * 基础前端接口
 */
@RestController
public class WebController {

    private static final Logger log = LoggerFactory.getLogger(WebController.class);

    @Resource
    private AdminService adminService;
    @Resource
    private UserService userService;
    @Resource
    private EmailService emailService;

    @GetMapping("/hello")
    public Result hello() {
        return Result.success("Access successful");
    }

    /**
     * 登录
     */
    @PostMapping("/login")
    public Result login(@RequestBody Account account) {
        try {
            if (ObjectUtil.isEmpty(account.getUsername()) || ObjectUtil.isEmpty(account.getPassword())
                    || ObjectUtil.isEmpty(account.getRole())) {
                return Result.error(ResultCodeEnum.PARAM_LOST_ERROR);
            }
            
            if (RoleEnum.ADMIN.name().equals(account.getRole())) {
                account = adminService.login(account);
            }
            
            if (RoleEnum.USER.name().equals(account.getRole())) {
                account = userService.login(account);
            }
            
            return Result.success(account);
        } catch (CustomException e) {
            // 捕获自定义异常并返回友好的错误信息
            return Result.error(e.getCode(), e.getMsg());
        } catch (Exception e) {
            // 捕获其他未知异常
            e.printStackTrace();
            return Result.error(ResultCodeEnum.SYSTEM_ERROR);
        }
    }

    /**
     * 注册
     */
    @PostMapping("/register")
    public Result register(@RequestBody Account account) {
        String username = account.getUsername();

        String password = account.getPassword();

        String name = account.getName();

        if (StrUtil.isBlank(account.getUsername()) || StrUtil.isBlank(account.getPassword())
                || ObjectUtil.isEmpty(account.getRole())) {
            return Result.error(ResultCodeEnum.PARAM_LOST_ERROR);
        }
        if (username.length() < 4) {
            return Result.error("0","User account is too short, account length needs to be at least 4 characters");
//            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户账号过短");
        }
        if (password.length() < 8 ) {
            return Result.error("0","The user password is too short. Password length must be at least 8 characters");
//            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户密码过短");
        }

        // 账户不能包含特殊字符
        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】'；：'。，、？]";
        Matcher matcher = Pattern.compile(validPattern).matcher(username);

        if (matcher.find()) {
            return Result.error("0", "The username contains illegal characters. Please avoid using special characters in the username");

        }
        if (RoleEnum.ADMIN.name().equals(account.getRole())) {
            adminService.register(account);
            return Result.success();
        }
        if (RoleEnum.USER.name().equals(account.getRole())) {
            userService.register(account);
            return Result.success();
        }
        return Result.error();
    }

    /**
     * 修改密码
     */
    @PutMapping("/updatePassword")
    public Result updatePassword(@RequestBody Account account) {
        if (StrUtil.isBlank(account.getUsername()) || StrUtil.isBlank(account.getPassword())
                || ObjectUtil.isEmpty(account.getNewPassword())) {
            return Result.error(ResultCodeEnum.PARAM_LOST_ERROR);
        }
        if (RoleEnum.ADMIN.name().equals(account.getRole())) {
            adminService.updatePassword(account);
        }
        if (RoleEnum.USER.name().equals(account.getRole())) {
            userService.updatePassword(account);
        }
        return Result.success();
    }

    /**
     * 请求密码重置 (发送验证码)
     */
    @PostMapping("/requestPasswordReset")
    public Result requestPasswordReset(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String role = payload.get("role");

        if (StrUtil.isBlank(email) || StrUtil.isBlank(role)) {
            return Result.error(ResultCodeEnum.PARAM_LOST_ERROR);
        }

        Account account = null;
        try {
            // Find user by email and role
            if (RoleEnum.ADMIN.name().equals(role)) {
                account = adminService.selectByEmail(email); // Need to add selectByEmail to AdminService
            } else if (RoleEnum.USER.name().equals(role)) {
                account = userService.selectByEmail(email);   // Need to add selectByEmail to UserService
            }

            if (ObjectUtil.isNull(account)) {
                return Result.error(ResultCodeEnum.USER_NOT_EXIST_ERROR.name(), "Account not found for this email and role.");
            }

            // Generate verification code
            String code = VerificationCodeUtils.generateCode(6);

            // Send email
            String subject = "Password Reset Verification Code";
            String content = "Your password reset verification code is: " + code + ". It is valid for 10 minutes."; // TODO: Add expiration info
            emailService.sendMail(email, subject, content);

            // Save/Update code in mail table
            Mail mail = new Mail();
            mail.setEmail(email);
            mail.setCode(code);
            emailService.save(mail); // Assumes save handles insert/update

            return Result.success("Verification code sent to your email.");

        } catch (MessagingException e) {
            log.error("Failed to send password reset email to {}", email, e);
            return Result.error(ResultCodeEnum.SYSTEM_ERROR.name(), "Failed to send verification email. Please try again later.");
        } catch (Exception e) {
            log.error("Error during password reset request for email {}", email, e);
            return Result.error(ResultCodeEnum.SYSTEM_ERROR);
        }
    }

    /**
     * 使用验证码重置密码
     */
    @PostMapping("/resetPasswordWithCode")
    public Result resetPasswordWithCode(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String role = payload.get("role");
        String code = payload.get("verificationCode");
        String newPassword = payload.get("newPassword");

        if (StrUtil.isBlank(email) || StrUtil.isBlank(role) || StrUtil.isBlank(code) || StrUtil.isBlank(newPassword)) {
            return Result.error(ResultCodeEnum.PARAM_LOST_ERROR);
        }
        
        if (newPassword.length() < 8) {
            return Result.error("4000", "New password must be at least 8 characters long.");
        }

        try {
            boolean success = false;
            if (RoleEnum.ADMIN.name().equals(role)) {
                success = adminService.resetPasswordWithCode(email, code, newPassword); // Need to add this method
            } else if (RoleEnum.USER.name().equals(role)) {
                success = userService.resetPasswordWithCode(email, code, newPassword);   // Need to add this method
            }

            if (success) {
                return Result.success("Password reset successfully.");
            } else {
                // Service layer should throw specific exceptions for invalid code/user not found etc.
                // Or return false, handled here.
                return Result.error("4000", "Password reset failed. Invalid code or other error.");
            }
        } catch (CustomException e) {
            return Result.error(e.getCode(), e.getMsg());
        } catch (Exception e) {
            log.error("Error during password reset with code for email {}", email, e);
            return Result.error(ResultCodeEnum.SYSTEM_ERROR);
        }
    }

}
