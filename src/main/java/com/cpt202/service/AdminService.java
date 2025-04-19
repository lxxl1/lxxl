package com.cpt202.service;

import com.cpt202.domain.Account;
import com.cpt202.domain.Admin;
import com.cpt202.domain.Song;
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

    /**
     * 更新用户状态
     */
    void updateUserStatus(Integer userId, Integer status);

    /**
     * 获取用户状态
     */
    Integer getUserStatus(Integer userId);

    /**
     * 审核歌曲
     * @param songId 歌曲ID
     * @param status 审核状态 0-待审核，1-审核通过，2-审核不通过
     * @param reason 审核不通过原因
     * @param auditorId 审核人ID
     */
    void auditSong(Integer songId, Integer status, String reason, Integer auditorId);

    /**
     * 获取待审核歌曲列表
     * @return 待审核歌曲列表
     */
    List<Song> getPendingAuditSongs();

    /**
     * 获取已审核歌曲列表
     * @param status 审核状态 1-已通过，2-未通过
     * @return 已审核歌曲列表
     */
    List<Song> getAuditedSongs(Integer status);

    // Method to approve/reject songs
    void reviewSong(Integer songId, Integer status, String reason, Integer auditorId);
    
    // Method to get pending songs
    PageInfo<Song> getPendingSongs(Integer pageNum, Integer pageSize);

    // Add method to find admin by email
    Account selectByEmail(String email);

    // Add method to reset password using code
    boolean resetPasswordWithCode(String email, String code, String newPassword);
}




