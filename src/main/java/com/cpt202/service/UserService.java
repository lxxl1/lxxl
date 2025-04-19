package com.cpt202.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.cpt202.domain.Account;
import com.cpt202.domain.User;
import com.cpt202.dto.UserStatsDTO;
import com.cpt202.common.Result;
import com.github.pagehelper.PageInfo;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface UserService {
    Long register(Account account);

    Account login(Account account);

    void updatePassword(Account account);

    void add(User user);

    void deleteById(Integer id);

    void deleteBatch(List<Integer> ids);

    User selectById(Integer id);

    List<User> selectAll(User user);

    PageInfo<User> selectPage(User user, Integer pageNum, Integer pageSize);

    User selectByUserName(String userName);

    // 新添加的方法：查询总用户数量
    int getUserCount();

    boolean insert(User user);

    boolean update(User user);

    boolean delete(Integer id);

    boolean updateStatus(Integer id, Byte status);

    User selectByUsername(String username);

    boolean updateById(User user);
    
    /**
     * 获取指定用户的统计信息
     * @param userId 用户ID
     * @return UserStatsDTO 包含统计信息
     */
    UserStatsDTO getUserStats(Integer userId);

    // Add method to find user by email
    Account selectByEmail(String email);

    // Add method to reset password using code
    boolean resetPasswordWithCode(String email, String code, String newPassword);

    /**
     * 更新用户头像
     *
     * @param avatarFile 上传的头像文件
     * @return 更新后的头像URL
     * @throws IOException 文件上传或处理时可能发生IO异常
     */
    String updateAvatar(MultipartFile avatarFile) throws IOException;
}
