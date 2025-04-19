package com.cpt202.service;

import com.cpt202.domain.Account;
import com.cpt202.domain.User;
import com.cpt202.dto.UserStatsDTO;
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
    
    // 上传并更新用户头像
    String updateAvatar(MultipartFile file, Integer userId) throws IOException;

    /**
     * 获取指定用户的统计信息
     * @param userId 用户ID
     * @return UserStatsDTO 包含统计信息
     */
    UserStatsDTO getUserStats(Integer userId);
}
