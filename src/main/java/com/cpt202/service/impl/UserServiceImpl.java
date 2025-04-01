package com.cpt202.service.impl;

import cn.hutool.core.util.ObjectUtil;
import com.cpt202.common.Constants;
import com.cpt202.common.ErrorCode;
import com.cpt202.common.enums.ResultCodeEnum;
import com.cpt202.domain.Account;
import com.cpt202.domain.User;
import com.cpt202.mapper.UserMapper;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import static com.cpt202.common.enums.RoleEnum.USER;

/**
 * 用户业务处理
 **/
@Service
public class UserServiceImpl implements UserService {

    //设置盐
    private final String SALT = "lxxl";


    @Resource
    private UserMapper userMapper;

    /**
     * 注册
     */
    public Long register(Account account) {
        String username = account.getUsername();

        String password = account.getPassword();

        String name = account.getName();

        String avatar = account.getAvatar();


        if (StringUtils.isAnyBlank(username,password)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        if (account.getUsername().length() < 4) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户账号过短");
        }
        if (account.getPassword().length() < 8 ) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户密码过短");
        }

        // 账户不能包含特殊字符
        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】‘；：”“’。，、？]";
        Matcher matcher = Pattern.compile(validPattern).matcher(username);
        if (matcher.find()) {
            return -1L;
        }

        // 账户不能重复
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userName", username);
        long count = userMapper.selectCount(queryWrapper);
        if (count > 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号重复");
        }

        //邮箱验证码
        String emailcode = userMapper.selectEmail(account.getEmail());
        if (!Objects.equals(emailcode, account.getCode())){
            throw new BusinessException(ErrorCode.CODE_ERROR, "验证码错误");

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
        String validPattern = "[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】‘；：”“’。，、？]";
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
        if (!account.getPassword().equals(dbUser.getPassword())) {
            throw new CustomException(ResultCodeEnum.PARAM_PASSWORD_ERROR);
        }
        dbUser.setPassword(account.getNewPassword());
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
    public void updateById(User user) {

        userMapper.updateById(user);
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
}
