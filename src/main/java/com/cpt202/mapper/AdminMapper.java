package com.cpt202.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cpt202.domain.Admin;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 操作admin相关数据接口
 */
public interface AdminMapper extends BaseMapper<Admin> {

    /**
     * 新增
     */
    int insert(Admin admin);

    /**
     * 删除
     */
    int deleteById(Integer id);

    /**
     * 修改
     */
    int updateById(Admin admin);

    /**
     * 根据ID查询
     */
    Admin selectById(Integer id);

    /**
     * 查询所有
     */
    List<Admin> selectAll(Admin admin);

    @Select("select * from cpt202.admin where username = #{username}")
    Admin selectByUsername(String username);
}