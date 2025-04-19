package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.dto.UserStatsDTO;
import com.cpt202.service.UserService;
import com.github.pagehelper.PageInfo;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.cpt202.domain.User;

import javax.annotation.Resource;
import java.io.IOException;
import java.util.List;

/**
 * 用户前端操作接口
 **/
@RestController
@RequestMapping("/user")
public class UserController {

    @Resource
    private UserService userService;

    /**
     * 新增
     */
    @PostMapping("/add")
    public Result addUser(@RequestBody User user) {
        if (userService.insert(user)) {
            return Result.success("添加成功");
        }
        return Result.failure("添加失败");
    }

    /**
     * 删除
     */
    @DeleteMapping("/delete/{id}")
    public Result deleteUser(@PathVariable Integer id) {
        if (userService.delete(id)) {
            return Result.success("删除成功");
        }
        return Result.failure("删除失败");
    }

    /**
     * 批量删除
     */
    @DeleteMapping("/delete/batch")
    public Result deleteBatch(@RequestBody List<Integer> ids) {
        userService.deleteBatch(ids);
        return Result.success();
    }

    /**
     * 修改
     */
    @PostMapping("/update")
    public Result updateUser(@RequestBody User user) {
        if (userService.updateById(user)) {
            return Result.success("修改成功");
        }
        return Result.failure("修改失败");
    }

    /**
     * 根据ID查询
     */
    @GetMapping("/select/{id}")
    public Result selectById(@PathVariable Integer id) {
        User user = userService.selectById(id);
        if (user != null) {
            return Result.success(user);
        }
        return Result.failure("查询失败");
    }

    @GetMapping("/select/username/{username}")
    public Result selectByUsername(@PathVariable String username) {
        User user = userService.selectByUsername(username);
        if (user != null) {
            return Result.success(user);
        }
        return Result.failure("查询失败");
    }

    /**
     * 查询所有
     */
    @GetMapping("/select/all")
    public Result selectAll() {
        List<User> users = userService.selectAll(new User());
        return Result.success(users);
    }

    /**
     * 分页查询
     */
    @GetMapping("/selectPage")
    public Result selectPage(User user,
                             @RequestParam(defaultValue = "1") Integer pageNum,
                             @RequestParam(defaultValue = "10") Integer pageSize) {
        PageInfo<User> page = userService.selectPage(user, pageNum, pageSize);
        return Result.success(page);
    }
    @PostMapping("/status/{id}")
    public Result updateStatus(@PathVariable Integer id, @RequestParam Byte status) {
        if (userService.updateStatus(id, status)) {
            return Result.success(status == 1 ? "禁用成功" : "解禁成功");
        }
        return Result.failure("操作失败");
    }

    /**
     * 获取用户统计信息
     */
    @GetMapping("/{userId}/stats")
    public Result getUserStats(@PathVariable Integer userId) {
        if (userId == null) {
            return Result.failure("User ID cannot be null");
        }
        try {
            UserStatsDTO stats = userService.getUserStats(userId);
            if (stats != null) {
                return Result.success(stats);
            } else {
                // Handle case where user exists but has no stats (e.g., no songs)
                // Return an empty stats object or a specific message
                return Result.success(new UserStatsDTO()); // Return default empty DTO
            }
        } catch (Exception e) {
            // Log the exception properly in a real application
            System.err.println("Error fetching user stats for userId " + userId + ": " + e.getMessage());
            return Result.failure("Failed to retrieve user statistics.");
        }
    }

    /**
     * 上传用户头像
     */
    @PostMapping("/avatar/upload")
    public Result uploadAvatar(@RequestParam("file") MultipartFile file, 
                               @RequestParam("userId") Integer userId) {
        try {
            if (file.isEmpty()) {
                return Result.failure("上传文件不能为空");
            }
            
            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !(contentType.startsWith("image/"))) {
                return Result.failure("只能上传图片文件");
            }
            
            // 上传头像
            String avatarUrl = userService.updateAvatar(file, userId);
            return Result.success(avatarUrl);
        } catch (IOException e) {
            return Result.failure("头像上传失败: " + e.getMessage());
        }
    }
}
