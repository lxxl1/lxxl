package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Category;
import com.cpt202.service.CategoryService;
import com.github.pagehelper.PageInfo;
import com.cpt202.dto.TopCategoryDto;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

/**
 * 分类管理前端操作接口
 **/
@RestController
@RequestMapping("/category")
public class CategoryController {

    @Resource
    private CategoryService categoryService;

    /**
     * 新增分类
     */
    @PostMapping("/add")
    public Result add(@RequestBody Category category) {
        categoryService.add(category);
        return Result.success();
    }

    /**
     * 删除分类
     */
    @DeleteMapping("/delete/{id}")
    public Result deleteById(@PathVariable Integer id) {
        categoryService.deleteById(id);
        return Result.success();
    }

    /**
     * 批量删除分类
     */
    @DeleteMapping("/delete/batch")
    public Result deleteBatch(@RequestBody List<Integer> ids) {
        categoryService.deleteBatch(ids);
        return Result.success();
    }

    /**
     * 修改分类
     */
    @PutMapping("/update")
    public Result updateById(@RequestBody Category category) {
        categoryService.updateById(category);
        return Result.success();
    }

    /**
     * 根据ID查询分类
     */
    @GetMapping("/selectById/{id}")
    public Result selectById(@PathVariable Integer id) {
        Category category = categoryService.selectById(id);
        return Result.success(category);
    }

    /**
     * 查询所有分类
     */
    @GetMapping("/selectAll")
    public Result selectAll() {
        List<Category> list = categoryService.selectAll();
        return Result.success(list);
    }

    /**
     * 分页查询分类
     */
    @GetMapping("/selectPage")
    public Result selectPage(Category category,
                             @RequestParam(defaultValue = "1") Integer pageNum,
                             @RequestParam(defaultValue = "10") Integer pageSize) {
        PageInfo<Category> page = categoryService.selectPage(category, pageNum, pageSize);
        return Result.success(page);
    }
    
    /**
     * 根据用户ID查询该用户歌曲关联的类别
     */
    @GetMapping("/user/{userId}")
    public Result selectCategoriesByUserId(@PathVariable Integer userId) {
        List<Category> categories = categoryService.selectCategoriesByUserId(userId);
        return Result.success(categories);
    }

    /**
     * Get the category with the most songs.
     */
    @GetMapping("/top")
    public Result getTopCategory() {
        TopCategoryDto topCategory = categoryService.getTopCategory();
        if (topCategory != null) {
            return Result.success(topCategory);
        } else {
            // Return success but with a message indicating no data, or a specific error code
            return Result.success("No category data found."); // Or Result.error("404", "No data")
        }
    }
}