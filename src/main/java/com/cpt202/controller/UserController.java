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
import com.cpt202.utils.TokenUtils;
import com.cpt202.domain.Admin;
import com.cpt202.mapper.AdminMapper;
import com.cpt202.common.enums.RoleEnum;

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

    @Resource
    private AdminMapper adminMapper;

    /**
     * 新增
     */
    @PostMapping("/add")
    public Result addUser(@RequestBody User user) {
        if (userService.insert(user)) {
            return Result.success(user);
        } else {
            return Result.failure("Failed to add user");
        }
    }

    /**
     * 删除
     */
    @DeleteMapping("/delete/{id}")
    public Result deleteUser(@PathVariable Integer id) {
        if (userService.delete(id)) {
            return Result.success("Deleted successfully");
        }
        return Result.failure("Failed to delete");
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
            return Result.success("Updated successfully");
        }
        return Result.failure("Failed to update");
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
        return Result.failure("Failed to query");
    }

    @GetMapping("/select/username/{username}")
    public Result selectByUsername(@PathVariable String username) {
        User user = userService.selectByUsername(username);
        if (user != null) {
            return Result.success(user);
        }
        return Result.failure("Failed to query");
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
            return Result.success(status == 2 ? "Suspended successfully" : "Activated successfully");
        }
        return Result.failure("Operation failed");
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
    public Result updateAvatar(@RequestParam("avatarFile") MultipartFile avatarFile,
                               @RequestParam(required = false) Integer targetUserId,
                               HttpServletRequest request) {
        try {
            // 获取当前发出请求的用户ID (从Token中)
            Integer requestingUserId = TokenUtils.getUserIdByRequest(request);
            if (requestingUserId == null) {
                return Result.error(ResultCodeEnum.TOKEN_INVALID_ERROR.code, "User not logged in or authentication invalid");
            }

            // 确定最终要更新头像的用户ID
            Integer userIdToUpdate = requestingUserId; // Default to the requesting user

            // 如果请求中提供了 targetUserId (通常由管理员添加新用户时提供)
            if (targetUserId != null) {
                // 检查发出请求的用户是否是管理员
                Admin requestingAdmin = adminMapper.selectById(requestingUserId); // Check if the requester is in the admin table
                if (requestingAdmin != null && RoleEnum.ADMIN.name().equals(requestingAdmin.getRole())) {
                    // 如果请求者是管理员，则允许更新目标用户的头像
                    userIdToUpdate = targetUserId;
                    System.out.println("Admin (ID: " + requestingUserId + ") updating avatar for target user ID: " + targetUserId);
                } else {
                    // 如果请求者不是管理员，但提供了 targetUserId，这是一个非法操作
                    System.err.println("Warning: Non-admin user (ID: " + requestingUserId + ") attempted to update avatar for target user ID: " + targetUserId);
                    //可以选择抛出权限错误，或者忽略 targetUserId 并继续更新请求者自己的头像
                    // return Result.error("403", "Permission denied to update another user's avatar."); 
                    // 这里我们选择忽略 targetUserId，仅更新请求者自己的头像
                     userIdToUpdate = requestingUserId;
                }
            }
            
            // 调用服务更新头像
            String newAvatarUrl = userService.updateAvatar(avatarFile, userIdToUpdate);
            return Result.success(newAvatarUrl); // Return the new URL in the data field
        } catch (CustomException e) {
            // Log the custom exception maybe
            return Result.error(e.getCode(), e.getMessage());
        } catch (IOException e) {
            // Log the IO exception
            return Result.error(ResultCodeEnum.SYSTEM_ERROR.code, "File upload failed");
        } catch (Exception e) {
            // Log the generic exception
            return Result.error(ResultCodeEnum.SYSTEM_ERROR.code, "Unknown error occurred while updating avatar");
        }
    }
}
