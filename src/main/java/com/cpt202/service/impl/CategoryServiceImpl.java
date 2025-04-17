package com.cpt202.service.impl;

import com.cpt202.domain.Category;
import com.cpt202.mapper.CategoryMapper;
import com.cpt202.service.CategoryService;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.cpt202.dto.TopCategoryDto;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Resource
    private CategoryMapper categoryMapper;

    @Override
    public void add(Category category) {
        categoryMapper.insert(category);
    }

    @Override
    public void deleteById(Integer id) {
        categoryMapper.deleteById(id);
    }

    @Override
    public void deleteBatch(List<Integer> ids) {
        categoryMapper.deleteBatch(ids);
    }

    @Override
    public void updateById(Category category) {
        categoryMapper.updateById(category);
    }

    @Override
    public Category selectById(Integer id) {
        return categoryMapper.selectById(id);
    }

    @Override
    public List<Category> selectAll() {
        return categoryMapper.selectAll();
    }

    @Override
    public PageInfo<Category> selectPage(Category category, Integer pageNum, Integer pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<Category> list = categoryMapper.selectAll(); // 这里可以根据条件查询
        return new PageInfo<>(list);
    }
    
    @Override
    public List<Category> selectCategoriesByUserId(Integer userId) {
        return categoryMapper.selectCategoriesByUserId(userId);
    }

    /**
     * Get the category with the most songs.
     *
     * @return TopCategoryDto containing the name and count, or null if none found.
     */
    @Override
    public TopCategoryDto getTopCategory() {
        // Call the mapper method to get the top category data
        return categoryMapper.findTopCategoryBySongCount();
    }
}
