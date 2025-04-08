package com.cpt202.service;

import com.cpt202.domain.Account;
import com.cpt202.domain.User;
import com.github.pagehelper.PageInfo;
import java.util.List;

public interface UserService {
    Long register(Account account);

    Account login(Account account);

    void updatePassword(Account account);

    void add(User user);

    void deleteById(Integer id);

    void deleteBatch(List<Integer> ids);

    void updateById(User user);

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
}
