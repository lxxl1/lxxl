package com.javaclimb.music.controller;

import cn.dev33.satoken.secure.SaSecureUtil;
import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.util.SaResult;
import cn.hutool.core.util.ObjectUtil;
import com.javaclimb.music.domain.Admin;
import com.javaclimb.music.service.AdminService;
import com.javaclimb.music.utils.CipherBean;
import com.javaclimb.music.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

@RestController
@RequestMapping("/admin/login")
public class AdminController {
    @Autowired
    private CipherBean cipher;
    @Autowired
    private AdminService adminService;

    /**
     * 帐号密码登录
     *
     * @param request: 请求内容
     * @param session: 会话
     * @return cn.dev33.satoken.util.SaResult
     * @since 2023/3/2 23:40
     */
    @RequestMapping(value = "/status", method = RequestMethod.POST)
    public SaResult loginStatus(HttpServletRequest request, HttpSession session) {
        String name = request.getParameter("name");
        String passwordFont = request.getParameter("password");
        //加密前端传入的 密码
        String password = SaSecureUtil.aesEncrypt(cipher.getKey(), passwordFont);
        //根据用户名和密码获取数据库里面所有的信息
        Admin admin = adminService.getAdmin(name, password);
        //如果查到了用户
        if (ObjectUtil.isNotNull(admin)) {
            //设置登录状态
            StpUtil.login(admin.getId());
            session.setAttribute(Consts.NAME, name);
            return SaResult.ok("登录成功");
        }
        return SaResult.error("用户名或密码错误");
    }

    /**
     * 二维码手机登录
     *
     * @param phoneNum: 手机号码
     * @return cn.dev33.satoken.util.SaResult
     * @since 2023/3/2 23:12
     */
    @PostMapping("/{phoneNum}")
    public SaResult loginWithPhoneNum(@PathVariable("phoneNum") String phoneNum, HttpSession session) {
        //只要访问这个接口,就直接先给退出登录,清除cookie
        StpUtil.logout();
        Admin admin = adminService.getAdminWithPhoneNum(phoneNum);
        if (ObjectUtil.isNotNull(admin)) {
            //设置登录状态
            StpUtil.login(admin.getId());
            session.setAttribute(Consts.NAME, admin.getName());
            return SaResult.ok("登录成功");
        }
        return SaResult.error("手机号码对应的帐号不存在,请先绑定手机号码");
    }
}






















