package com.cpt202.service.impl;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.cpt202.common.Constants;
import com.cpt202.common.ErrorCode;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.common.enums.RoleEnum;
import com.cpt202.domain.Account;
import com.cpt202.domain.Admin;
import com.cpt202.domain.User;
import com.cpt202.domain.Song;
import com.cpt202.utils.exception.BusinessException;
import com.cpt202.utils.exception.CustomException;
import com.cpt202.mapper.AdminMapper;
import com.cpt202.mapper.UserMapper;
import com.cpt202.mapper.SongMapper;
import com.cpt202.mapper.EmailMapper;
import com.cpt202.service.AdminService;
import com.cpt202.utils.TokenUtils;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import javax.annotation.Resource;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.cpt202.common.enums.RoleEnum.ADMIN;

/**
 * 管理员业务处理
 **/
@Service
public class AdminServiceImpl implements AdminService {

    @Resource
    private AdminMapper adminMapper;

    @Resource
    private UserMapper userMapper;

    @Resource
    private SongMapper songMapper;

    @Resource
    private EmailMapper emailMapper;

    private final String SALT = "lxxl";

    /**
     * 新增
     */
    public void add(Admin admin) {
        Admin dbAdmin = adminMapper.selectByUsername(admin.getUsername());
        if (ObjectUtil.isNotNull(dbAdmin)) {
            throw new CustomException(ResultCodeEnum.USER_EXIST_ERROR);
        }
        if (ObjectUtil.isEmpty(admin.getPassword())) {
            admin.setPassword(Constants.USER_DEFAULT_PASSWORD);
        }
        if (ObjectUtil.isEmpty(admin.getName())) {
            admin.setName(admin.getUsername());
        }
        admin.setRole(RoleEnum.ADMIN.name());
        adminMapper.insert(admin);
    }

    /**
     * 删除
     */
    public void deleteById(Integer id) {
        adminMapper.deleteById(id);
    }

    /**
     * 批量删除
     */
    public void deleteBatch(List<Integer> ids) {
        for (Integer id : ids) {
            adminMapper.deleteById(id);
        }
    }

    /**
     * 修改
     */
    public void updateById(Admin admin) {
        adminMapper.updateById(admin);
    }

    /**
     * 根据ID查询
     */
    public Admin selectById(Integer id) {
        return adminMapper.selectById(id);
    }

    /**
     * 查询所有
     */
    public List<Admin> selectAll(Admin admin) {
        return adminMapper.selectAll(admin);
    }

    /**
     * 分页查询
     */
    public PageInfo<Admin> selectPage(Admin admin, Integer pageNum, Integer pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<Admin> list = adminMapper.selectAll(admin);
        return PageInfo.of(list);
    }

    /**
     * 登录
     */
    public Account login(Account account) {
        //加密
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + account.getPassword()).getBytes());

        Account dbAdmin = adminMapper.selectByUsername(account.getUsername());

        // 用户不存在
        if (ObjectUtil.isNull(dbAdmin)) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }
        
        // 密码错误
        if (!encryptPassword.equals(dbAdmin.getPassword())) {
            throw new CustomException(ResultCodeEnum.USER_ACCOUNT_ERROR);
        }
        
        // 检查用户名是否包含特殊字符
        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】'；：'。，、？]";
        Matcher matcher = Pattern.compile(validPattern).matcher(account.getUsername());
        if (matcher.find()) {
            throw new CustomException(ResultCodeEnum.ACCOUNT_INVALID_CHARACTER_ERROR);
        }

        // 生成token
        String tokenData = dbAdmin.getId() + "-" + RoleEnum.ADMIN.name();
        String token = TokenUtils.createToken(tokenData, dbAdmin.getPassword());
        dbAdmin.setToken(token);
        return dbAdmin;
    }

    /**
     * 注册
     */
    public Long register(Account account) {
        String username = account.getUsername();

        String password = account.getPassword();

        String name = account.getName();

        String avatar = account.getAvatar();

        if (StringUtils.isAnyBlank(username,password)) {
            throw new CustomException(ResultCodeEnum.PARAM_NULL_ERROR);
        }
        if (account.getUsername().length() < 4) {
            throw new CustomException(ResultCodeEnum.USERNAME_TOO_SHORT_ERROR);
        }
        if (account.getPassword().length() < 8 ) {
            throw new CustomException(ResultCodeEnum.PASSWORD_TOO_SHORT_ERROR);
        }

        // 账户不能包含特殊字符
        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】'；：'。，、？]";
        Matcher matcher = Pattern.compile(validPattern).matcher(username);
        if (matcher.find()) {
            throw new CustomException(ResultCodeEnum.ACCOUNT_INVALID_CHARACTER_ERROR);
        }

        // 账户不能重复
        QueryWrapper<Admin> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userName", username);
        long count = adminMapper.selectCount(queryWrapper);
        if (count > 0) {
            throw new CustomException(ResultCodeEnum.ACCOUNT_ALREADY_EXIST_ERROR);
        }
        // 2. 加密
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + password).getBytes());
        // 3. 插入数据
        Admin admin = new Admin();
        admin.setUsername(username);
        admin.setPassword(encryptPassword);
        admin.setName(name);
        admin.setEmail(account.getEmail());
        admin.setRole(String.valueOf(ADMIN));
        admin.setPhone(account.getPhone());
        int saveResult = adminMapper.insert(admin);
        if (saveResult == 0) {
            throw new CustomException(ResultCodeEnum.SYSTEM_ERROR);
        }
        return 1L;
    }

    /**
     * 修改密码
     */
    public void updatePassword(Account account) {
        Admin dbAdmin = adminMapper.selectByUsername(account.getUsername());
        if (ObjectUtil.isNull(dbAdmin)) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }
        String currentPasswordEncrypted = DigestUtils.md5DigestAsHex((SALT + account.getPassword()).getBytes());
        if (!currentPasswordEncrypted.equals(dbAdmin.getPassword())) {
            throw new CustomException(ResultCodeEnum.PARAM_PASSWORD_ERROR.name(), "Incorrect current password provided.");
        }
        // Encrypt new password before saving
        String newPasswordEncrypted = DigestUtils.md5DigestAsHex((SALT + account.getNewPassword()).getBytes());
        dbAdmin.setPassword(newPasswordEncrypted);
        adminMapper.updateById(dbAdmin);
    }

    @Override
    public void updateUserStatus(Integer userId, Integer status) {
        User user = new User();
        user.setId(userId);
        user.setStatus(status.byteValue());
        userMapper.updateById(user);
    }

    @Override
    public Integer getUserStatus(Integer userId) {
        User user = userMapper.selectById(userId);
        return user != null ? user.getStatus().intValue() : null;
    }

    @Override
    public List<Song> getPendingAuditSongs() {
        return songMapper.selectPendingAuditSongs();
    }

    @Override
    public List<Song> getAuditedSongs(Integer status) {
        return songMapper.selectAuditedSongs(status);
    }

    @Override
    public void auditSong(Integer songId, Integer status, String reason, Integer auditorId) {
        songMapper.updateSongAuditStatus(songId, status);
    }

    /**
     * 根据邮箱查询管理员
     */
    @Override
    public Account selectByEmail(String email) {
         // Need to ensure AdminMapper has selectByEmail method
         return adminMapper.selectByEmail(email);
    }

    /**
     * 使用验证码重置密码
     */
    @Override
    public boolean resetPasswordWithCode(String email, String code, String newPassword) {
        // 1. Verify the code
        String storedCode = emailMapper.selectCodeByEmail(email); // Need selectCodeByEmail in EmailMapper
        if (storedCode == null || !storedCode.equals(code)) {
             // Optionally add expiration check here if timestamps are stored with codes
             // TODO: Add a specific VERIFICATION_CODE_ERROR enum
            throw new CustomException(ResultCodeEnum.PARAM_PASSWORD_ERROR); // Using existing error as placeholder
        }

        // 2. Find the admin by email
        Admin admin = adminMapper.selectByEmail(email);
        if (admin == null) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }

        // 3. Hash the new password
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + newPassword).getBytes());

        // 4. Update the password
        admin.setPassword(encryptPassword);
        int updatedRows = adminMapper.updateById(admin);

        // Optionally: Invalidate the code after successful use (e.g., set code to null or remove row)
        // emailMapper.updateCodeByEmail(email, null); 

        return updatedRows > 0;
    }

    // Ensure reviewSong and getPendingSongs methods are implemented correctly if they exist
    @Override
    public void reviewSong(Integer songId, Integer status, String reason, Integer auditorId) {
        // Implementation needed based on your logic and UserMapper methods
        int updated = userMapper.updateSongAuditStatus(songId, status, reason, auditorId);
         if (updated == 0) {
             throw new CustomException("500", "Failed to update song status.");
         }
    }

    @Override
    public PageInfo<Song> getPendingSongs(Integer pageNum, Integer pageSize) {
        // Implementation needed based on your logic and SongMapper methods
         PageHelper.startPage(pageNum, pageSize);
         // TODO: Implement SongMapper.selectPendingSongs() if needed
         // List<Song> list = songMapper.selectPendingSongs(); // Assuming this method exists
         List<Song> list = new java.util.ArrayList<>(); // Temporary empty list
         return PageInfo.of(list);
    }

}