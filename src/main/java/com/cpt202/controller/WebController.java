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
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 基础前端接口
 */
@RestController
public class WebController {

    @Resource
    private AdminService adminService;
    @Resource
    private UserService userService;

    @GetMapping("/hello")
    public Result hello() {
        return Result.success("访问成功");
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

}
