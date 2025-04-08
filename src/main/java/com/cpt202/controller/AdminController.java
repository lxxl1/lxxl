package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Admin;
import com.cpt202.domain.Song;
import com.cpt202.service.AdminService;
import com.cpt202.utils.TokenUtils;
import com.github.pagehelper.PageInfo;
import org.springframework.web.bind.annotation.*;
import javax.annotation.Resource;
import java.util.List;

/**
 * 管理员前端操作接口
 **/
@RestController
@RequestMapping("/admin")
public class AdminController {

    @Resource
    private AdminService adminService;

    /**
     * 新增
     */
    @PostMapping("/add")
    public Result add(@RequestBody Admin admin) {
        adminService.add(admin);
        return Result.success();
    }

    /**
     * 删除
     */
    @DeleteMapping("/delete/{id}")
    public Result deleteById(@PathVariable Integer id) {
        adminService.deleteById(id);
        return Result.success();
    }

    /**
     * 批量删除
     */
    @DeleteMapping("/delete/batch")
    public Result deleteBatch(@RequestBody List<Integer> ids) {
        adminService.deleteBatch(ids);
        return Result.success();
    }

    /**
     * 修改
     */
    @PutMapping("/update")
    public Result updateById(@RequestBody Admin admin) {
        adminService.updateById(admin);
        return Result.success();
    }

    /**
     * 根据ID查询
     */
    @GetMapping("/selectById/{id}")
    public Result selectById(@PathVariable Integer id) {
        Admin admin = adminService.selectById(id);
        return Result.success(admin);
    }

    /**
     * 查询所有
     */
    @GetMapping("/selectAll")
    public Result selectAll(Admin admin ) {
        List<Admin> list = adminService.selectAll(admin);
        return Result.success(list);
    }

    /**
     * 分页查询
     */
    @GetMapping("/selectPage")
    public Result selectPage(Admin admin,
                             @RequestParam(defaultValue = "1") Integer pageNum,
                             @RequestParam(defaultValue = "10") Integer pageSize) {
        PageInfo<Admin> page = adminService.selectPage(admin, pageNum, pageSize);
        return Result.success(page);
    }

    /**
     * 更新用户状态
     */
    @PutMapping("/user/status/{userId}")
    public Result updateUserStatus(@PathVariable Integer userId, @RequestParam Integer status) {
        adminService.updateUserStatus(userId, status);
        return Result.success();
    }

    /**
     * 获取用户状态
     */
    @GetMapping("/user/status/{userId}")
    public Result getUserStatus(@PathVariable Integer userId) {
        Integer status = adminService.getUserStatus(userId);
        return Result.success(status);
    }

    /**
     * 审核歌曲
     */
    @PutMapping("/song/audit/{songId}")
    public Result auditSong(@PathVariable Integer songId,
                          @RequestParam Integer status,
                          @RequestParam(required = false) String reason) {
        // 获取当前登录的管理员ID
        Admin admin = (Admin) TokenUtils.getCurrentUser();
        adminService.auditSong(songId, status, reason, admin.getId());
        return Result.success();
    }

    /**
     * 获取待审核歌曲列表
     */
    @GetMapping("/song/pending")
    public Result getPendingAuditSongs() {
        List<Song> songs = adminService.getPendingAuditSongs();
        return Result.success(songs);
    }

    /**
     * 获取已审核歌曲列表
     */
    @GetMapping("/song/audited")
    public Result getAuditedSongs(@RequestParam Integer status) {
        List<Song> songs = adminService.getAuditedSongs(status);
        return Result.success(songs);
    }
}