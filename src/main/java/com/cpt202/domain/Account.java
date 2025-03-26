package com.cpt202.domain;

import lombok.Data;
import lombok.RequiredArgsConstructor;

/**
 * 角色用户父类
 */
@Data
@RequiredArgsConstructor
public class Account {
    public String code;
    private Integer id;
    /**
     * 用户名
     */
    private String username;
    /**
     * 名称
     */
    private String name;

    private String gender;
    /**
     * 密码
     */
    private String password;

    private String email;
    /**
     * 角色标识
     */
    private String role;

    private String phone;
    /**
     * 新密码
     */
    private String newPassword;
    /**
     * 头像
     */
    private String avatar;

    private String token;

    /**
     * 教练星级
     */


    private Integer star;

}
