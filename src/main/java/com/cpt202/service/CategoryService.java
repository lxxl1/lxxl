package com.cpt202.service;

import com.cpt202.domain.Category;
import com.github.pagehelper.PageInfo;

import java.util.List;

public interface CategoryService {
    void add(Category category);


    void deleteById(Integer id);


    void deleteBatch(List<Integer> ids);


    void updateById(Category category);


    Category selectById(Integer id);


    List<Category> selectAll();

    
    PageInfo<Category> selectPage(Category category, Integer pageNum, Integer pageSize);
}
