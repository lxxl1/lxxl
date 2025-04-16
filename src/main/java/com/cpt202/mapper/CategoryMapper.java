package com.cpt202.mapper;

import com.cpt202.domain.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CategoryMapper {

    /**
     * 新增
     */
    void insert(Category category);

    /**
     * 根据ID删除
     */
    void deleteById(Integer id);

    /**
     * 批量删除
     */
    void deleteBatch(List<Integer> ids);

    /**
     * 根据ID更新
     */
    void updateById(Category category);

    /**
     * 根据ID查询
     */
    Category selectById(Integer id);

    /**
     * 查询所有
     */
    List<Category> selectAll();

    /**
     * 根据ID列表查询类别名称列表
     */
    List<String> selectNamesByIds(@Param("ids") List<Integer> ids);
    
    /**
     * 根据用户ID查询该用户所有歌曲关联的类别
     */
    List<Category> selectCategoriesByUserId(@Param("userId") Integer userId);
}
