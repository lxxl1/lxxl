package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.dto.UserStatsDTO;
import com.cpt202.service.UserService;
import com.cpt202.utils.exception.CustomException;
import com.github.pagehelper.PageInfo;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.cpt202.domain.User;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
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
     * 更新用户头像
     * @param avatarFile 上传的头像文件 (expected form-data key: "avatarFile")
     * @return Result object containing the new avatar URL or error
     */
    @PostMapping("/updateAvatar")
    public Result updateAvatar(@RequestParam("avatarFile") MultipartFile avatarFile) {
        try {
            String newAvatarUrl = userService.updateAvatar(avatarFile);
            return Result.success(newAvatarUrl); // Return the new URL in the data field
        } catch (CustomException e) {
            // Log the custom exception maybe
            return Result.error(e.getCode(), e.getMessage());
        } catch (IOException e) {
            // Log the IO exception
            return Result.error(ResultCodeEnum.SYSTEM_ERROR.code, "文件上传失败");
        } catch (Exception e) {
            // Log the generic exception
            return Result.error(ResultCodeEnum.SYSTEM_ERROR.code, "更新头像时发生未知错误");
        }
    }
}
