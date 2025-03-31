package com.cpt202.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cpt202.domain.User;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
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


    String selectEmail(String email);

    int selectUserCount();

    @Update("update cpt202.user set cpt202.user.avatar = #{url} where id =#{id}")
    void updateUrl(String url, Integer id);
}