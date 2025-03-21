package com.javaclimb.music.service;

import com.javaclimb.music.domain.Admin;

/**
 * 管理员service接口
 */
public interface AdminService {

    /**
     * 验证密码是否正确
     */
    boolean verifyPassword(String username, String password);

    /**
     * 使用帐号密码登录
     *
     * @param username: 帐号
     * @param password: 密码
     * @return com.javaclimb.music.domain.Admin
     * @since 2023/3/2 23:13
     */
    Admin getAdmin(String username, String password);

    /**
     * 使用手机号码登录
     *
     * @param phoneNum:
     * @return com.javaclimb.music.domain.Admin
     * @since 2023/3/2 23:13
     */
    Admin getAdminWithPhoneNum(String phoneNum);
}
