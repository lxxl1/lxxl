package com.cpt202.service.impl;

import cn.hutool.core.util.ObjectUtil;
import com.cpt202.common.Constants;
import com.cpt202.common.ErrorCode;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.domain.Account;
import com.cpt202.domain.User;
import com.cpt202.mapper.UserMapper;
import com.cpt202.mapper.EmailMapper;
import com.cpt202.service.UserService;
import com.cpt202.utils.TokenUtils;
import com.cpt202.utils.exception.BusinessException;
import com.cpt202.utils.exception.CustomException;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;
import javax.annotation.Resource;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import static com.cpt202.common.enums.RoleEnum.USER;
import java.util.ArrayList;
import java.util.List;
import com.cpt202.utils.OssUtil;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import com.cpt202.dto.UserStatsDTO;
import com.cpt202.mapper.SongMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
/**
 * 用户业务处理
 **/
@Service
public class UserServiceImpl implements UserService {

    //设置盐
    private final String SALT = "lxxl";


    @Resource
    private UserMapper userMapper;

    @Resource
    private EmailMapper emailMapper;

    @Resource
    private OssUtil ossUtil;

    @Autowired
    private SongMapper songMapper;

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
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userName", username);
        long count = userMapper.selectCount(queryWrapper);
        if (count > 0) {
            throw new CustomException(ResultCodeEnum.ACCOUNT_ALREADY_EXIST_ERROR);
        }

        //邮箱验证码
        String emailcode = userMapper.selectEmail(account.getEmail());
        if (!Objects.equals(emailcode, account.getCode())){
            throw new CustomException(ResultCodeEnum.EMAIL_CODE_MISMATCH_ERROR);

        }
        // 2. 加密
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + password).getBytes());

//      //3.文件上传
//        CommonController file = new CommonController();
//        if (!avatar.isEmpty()) {
//            String avatarUrl = file.uploadAvatar(avatar);  // 调用下面创建的上传方法
//            if (avatarUrl == null) {
//                throw new BusinessException(ErrorCode.UPLOAD_ERROR, "头像上传失败");
//            }
//            account.setAvatar(avatarUrl);
//        }
        // 3. 插入数据
        User user = new User();
        user.setUsername(username);
        user.setPassword(encryptPassword);
        user.setName(name);
        user.setEmail(account.getEmail());
        user.setRole(String.valueOf(USER));
        user.setAccount(0.0);
        user.setPhone(account.getPhone());
        user.setGender(account.getGender());
        int saveResult = userMapper.insert(user);
        if (saveResult == 0) {
            return -1L;
        }
        return 1L;
    }
    /**
     * 登录
     */
    public Account login(Account account) {
        //加密
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + account.getPassword()).getBytes());

        account.setPassword(encryptPassword);

        Account dbUser = userMapper.selectByUsername(account.getUsername());

        if (ObjectUtil.isNull(dbUser)) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }
        if (!encryptPassword.equals(dbUser.getPassword())) {
            throw new CustomException(ResultCodeEnum.USER_ACCOUNT_ERROR);
        }
        
        // Check user status before generating token
        // Fetch the full User object to check status
        User fullUser = userMapper.selectById(dbUser.getId());
        if (fullUser == null) { // Should not happen if dbUser exists, but safety check
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }

        // Status: 0=Active, 1=Inactive(if used), 2=Suspended/Banned
        if (fullUser.getStatus() == null || fullUser.getStatus() != 0) { // Check status from User object
            throw new CustomException(ResultCodeEnum.ACCOUNT_BANNED_ERROR); // Throw specific ban error
        }

        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】'；：'。，、？]";
        Matcher matcher = Pattern.compile(validPattern).matcher(account.getUsername());
        if (matcher.find()) {
            return null;
        }

        // 生成token
        String tokenData = dbUser.getId() + "-" + USER.name();
        String token = TokenUtils.createToken(tokenData, dbUser.getPassword());
        dbUser.setToken(token);
        return dbUser;
    }

    /**
     * 修改密码
     */
    public void updatePassword(Account account) {
        User dbUser = userMapper.selectByUsername(account.getUsername());
        if (ObjectUtil.isNull(dbUser)) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }
        
        // Encrypt the current password provided by the user for comparison
        String currentPasswordEncrypted = DigestUtils.md5DigestAsHex((SALT + account.getPassword()).getBytes());

        // Compare the encrypted input with the encrypted password from the database
        if (!currentPasswordEncrypted.equals(dbUser.getPassword())) {
            // Throw error with specific English message
            throw new CustomException(ResultCodeEnum.PARAM_PASSWORD_ERROR.name(), "Incorrect current password provided."); 
        }
        
        // Encrypt the new password before saving
        String newPasswordEncrypted = DigestUtils.md5DigestAsHex((SALT + account.getNewPassword()).getBytes());
        dbUser.setPassword(newPasswordEncrypted);
        
        userMapper.updateById(dbUser);
    }

    /**
     * 新增
     */
    public void add(User user) {
        User dbUser = userMapper.selectByUsername(user.getUsername());
        if (ObjectUtil.isNotNull(dbUser)) {
            throw new CustomException(ResultCodeEnum.USER_EXIST_ERROR);
        }
        if (ObjectUtil.isEmpty(user.getPassword())) {
            user.setPassword(Constants.USER_DEFAULT_PASSWORD);
        }
        if (ObjectUtil.isEmpty(user.getName())) {
            user.setName(user.getUsername());
        }

        //密码加密
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + user.getPassword()).getBytes());

        user.setPassword(encryptPassword);
        user.setRole(USER.name());
        userMapper.insert(user);
    }

    /**
     * 删除
     */
    public void deleteById(Integer id) {

        userMapper.deleteById(id);
    }

    /**
     * 批量删除
     */
    public void deleteBatch(List<Integer> ids) {
        for (Integer id : ids) {
            userMapper.deleteById(id);
        }
    }

    /**
     * 修改
     */
    @Override
    public boolean updateById(User user) {
        return userMapper.updateById(user) > 0;
    }

    /**
     * 根据ID查询
     */
    public User selectById(Integer id) {
        User dbUser = userMapper.selectById(id);
        String tokenData = dbUser.getId() + "-" + USER.name();
        String token = TokenUtils.createToken(tokenData, dbUser.getPassword());
        dbUser.setToken(token);
        return dbUser;
    }

    /**
     * 查询所有
     */
    public List<User> selectAll(User user) {
        return userMapper.selectAll(user);
    }



    /**
     * 分页查询
     */
    public PageInfo<User> selectPage(User user, Integer pageNum, Integer pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<User> list = userMapper.selectAll(user);
        return PageInfo.of(list);
    }




    public User selectByUserName(String userName) {
        User user2 = userMapper.selectByUsername(userName);
        return user2;
    }


    public int getUserCount() {
        return userMapper.selectUserCount();
    }

    @Override
    public boolean insert(User user) {
        return userMapper.insert(user) > 0;
    }

    @Override
    public boolean update(User user) {
        // Revert back to the original call
        return userMapper.updateById(user) > 0;
    }

    @Override
    public boolean delete(Integer id) {
        return userMapper.deleteById(id) > 0;
    }

    @Override
    public boolean updateStatus(Integer id, Byte status) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        return userMapper.updateById(user) > 0;
    }

    @Override
    public User selectByUsername(String username) {
        return userMapper.selectByUsername(username);
    }

    /**
     * 更新用户头像
     *
     * @param avatarFile 上传的头像文件
     * @param userId 用户ID 
     * @return 更新后的头像URL
     * @throws IOException 文件上传或处理时可能发生IO异常
     */
    @Override
    @Transactional // Add transaction management
    public String updateAvatar(MultipartFile avatarFile, Integer userId) throws IOException {
        // 1. Validate the uploaded file
        if (avatarFile == null || avatarFile.isEmpty()) {
            throw new CustomException(ResultCodeEnum.PARAM_ERROR.code, "上传的头像文件不能为空");
        }

        // Optional: Add more validation like file type and size check
        String contentType = avatarFile.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
             throw new CustomException(ResultCodeEnum.UPLOAD_ERROR.code, "Please upload an image file.");
        }
        // Example size check (e.g., 5MB)
        long maxSize = 5 * 1024 * 1024;
        if (avatarFile.getSize() > maxSize) {
            throw new CustomException(ResultCodeEnum.UPLOAD_ERROR.code, "Avatar file size cannot exceed 5MB.");
        }

        // 2. Check if user exists - RESTORED
        User user = userMapper.selectById(userId);
        if (user == null) {
            // This check might fail immediately after user creation due to transaction timing.
            // Assuming the userId passed in this context (especially after creation) is valid.
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }

        // 3. Upload file to OSS
        String folderPath = "avatar/"; // Define the folder in OSS for avatars
        String avatarUrl = ossUtil.uploadFile(avatarFile, folderPath);

        // 4. Update avatar URL in the database
        userMapper.updateUrl(avatarUrl, userId); // Reusing the existing updateUrl method

        // 5. Return the new avatar URL
        return avatarUrl;
    }

    /**
     * 获取用户统计信息
     * @param userId 用户ID
     * @return UserStatsDTO
     */
    @Override
    public UserStatsDTO getUserStats(Integer userId) {
        if (userId == null) {
            return null; 
        }

        UserStatsDTO stats = new UserStatsDTO();

        // Get total songs
        Long totalSongs = songMapper.countTotalSongsByUserId(userId);
        stats.setTotalSongs(totalSongs != null ? totalSongs : 0);

        // Get approved songs (status = 1)
        Long approvedSongs = songMapper.countSongsByUserIdAndStatus(userId, 1);
        stats.setApprovedSongs(approvedSongs != null ? approvedSongs : 0);

        // Get pending songs (status = 0)
        Long pendingSongs = songMapper.countSongsByUserIdAndStatus(userId, 0);
        stats.setPendingSongs(pendingSongs != null ? pendingSongs : 0);

        return stats;
    }

    /**
     * 根据邮箱查询用户
     */
    @Override
    public Account selectByEmail(String email) {
        // Need to ensure UserMapper has selectByEmail method
        return userMapper.selectByEmail(email);
    }

    /**
     * 使用验证码重置密码
     */
    @Override
    public boolean resetPasswordWithCode(String email, String code, String newPassword) {
        // 1. Verify the code
        String storedCode = emailMapper.selectCodeByEmail(email);
        if (storedCode == null || !storedCode.equals(code)) {
            throw new CustomException(ResultCodeEnum.EMAIL_CODE_MISMATCH_ERROR);
        }

        // 2. Find the user by email
        User user = userMapper.selectByEmail(email);
        if (user == null) {
            throw new CustomException(ResultCodeEnum.USER_NOT_EXIST_ERROR);
        }

        // 3. Hash the new password
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + newPassword).getBytes());

        // 4. Update the password
        user.setPassword(encryptPassword);
        int updatedRows = userMapper.updateById(user);

        // Optionally: Invalidate the code after successful use
        // emailMapper.updateCodeByEmail(email, null);

        return updatedRows > 0;
    }
}
