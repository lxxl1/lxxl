package com.cpt202.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cpt202.domain.Song;
import com.cpt202.domain.User;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/**
 * 操作user相关数据接口
 */
public interface UserMapper extends BaseMapper<User> {

    /**
     * 新增
     */
    int insert(User user);

    /**
     * 删除
     */
    int deleteById(Integer id);

    /**
     * 修改
     */
    int updateById(User user);

    /**
     * 根据ID查询
     */
    User selectById(Integer id);

    /**
     * 查询所有
     */
    List<User> selectAll(User user);

    @Select("select * from user where username = #{username}")
    User selectByUsername(String username);

    @Select("SELECT * FROM user WHERE email = #{email} LIMIT 1")
    User selectByEmail(@Param("email") String email);

    int selectUserCount();

    @Update("update user set user.avatar = #{url} where id =#{id}")
    void updateUrl(String url, Integer id);

    @Select("select mail.code from mail where mail.email = #{email}")
    String selectEmail(String email);

    /**
     * 更新用户状态
     */
    @Update("UPDATE user SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Integer id, @Param("status") Integer status);

    /**
     * 获取用户状态
     */
    @Select("SELECT status FROM user WHERE id = #{id}")
    Integer selectStatusById(Integer id);

    /**
     * 更新歌曲审核状态
     */
    @Update("UPDATE song SET status = #{status}, audit_reason = #{reason}, " +
            "audit_time = NOW(), auditor_id = #{auditorId} WHERE id = #{songId}")
    int updateSongAuditStatus(@Param("songId") Integer songId,
                             @Param("status") Integer status,
                             @Param("reason") String reason,
                             @Param("auditorId") Integer auditorId);

    /**
     * 获取待审核歌曲列表
     */
    @Select("SELECT * FROM song WHERE status = 0")
    List<Song> selectPendingAuditSongs();

    /**
     * 获取已审核歌曲列表
     */
    @Select("SELECT * FROM song WHERE status = #{status}")
    List<Song> selectAuditedSongs(@Param("status") Integer status);
}