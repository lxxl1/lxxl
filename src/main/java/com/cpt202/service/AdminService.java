package com.cpt202.service;

import com.cpt202.domain.Account;
import com.cpt202.domain.Admin;
import com.github.pagehelper.PageInfo;
import org.springframework.stereotype.Service;

import java.util.List;
@Service


public interface AdminService {
    void add(Admin admin);

    void deleteById(Integer id);

    void deleteBatch(List<Integer> ids);

    void updateById(Admin admin);

    Admin selectById(Integer id);

    List<Admin> selectAll(Admin admin);

    PageInfo<Admin> selectPage(Admin admin, Integer pageNum, Integer pageSize);

    Account login(Account account);

    Long register(Account account);

    void updatePassword(Account account);
}




