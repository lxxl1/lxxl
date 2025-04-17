package com.cpt202.service;

import com.cpt202.domain.Category;
import com.github.pagehelper.PageInfo;
import com.cpt202.common.Result;
import com.cpt202.dto.TopCategoryDto;

import java.util.List;
import java.util.Map;

public interface CategoryService {
    void add(Category category);


    void deleteById(Integer id);


    void deleteBatch(List<Integer> ids);


    void updateById(Category category);


    Category selectById(Integer id);


    List<Category> selectAll();

    
    PageInfo<Category> selectPage(Category category, Integer pageNum, Integer pageSize);
    
    /**
     * 根据用户ID查询该用户歌曲关联的类别
     */
    List<Category> selectCategoriesByUserId(Integer userId);

    /**
     * Get the category with the most songs.
     *
     * @return TopCategoryDto containing the name and count, or null if none found.
     */
    TopCategoryDto getTopCategory();
}
