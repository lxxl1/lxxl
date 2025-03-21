package com.javaclimb.music.dao;

import com.javaclimb.music.domain.Admin;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

/**
 * 管理员Dao
 */
@Repository
public interface AdminMapper {
    /**
     * 验证密码是否正确
     */
    int verifyPassword(@Param("username") String username, @Param("password") String password);

    Admin getAdmin(@Param("username") String username, @Param("password") String password);

    Admin getAdminWithPhoneNum(@Param("phoneNum") String phoneNum);
}
