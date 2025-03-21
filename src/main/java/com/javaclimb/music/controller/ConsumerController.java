package com.javaclimb.music.controller;

import cn.dev33.satoken.secure.SaSecureUtil;
import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.util.SaResult;
import cn.hutool.core.util.ObjectUtil;
import com.alibaba.fastjson.JSONObject;
import com.javaclimb.music.domain.Consumer;
import com.javaclimb.music.service.ConsumerService;
import com.javaclimb.music.utils.CipherBean;
import com.javaclimb.music.utils.Consts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.File;
import java.io.IOException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * 前端用户控制类
 */
@RestController
@RequestMapping("/consumer")
@Slf4j
public class ConsumerController {
    @Autowired
    private CipherBean cipher;
    @Autowired
    private ConsumerService consumerService;


    /**
     * 添加前端用户
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Object addConsumer(HttpServletRequest request) {
        JSONObject jsonObject = new JSONObject();
        String username = request.getParameter("username").trim();     //账号
        String passwordFont = request.getParameter("password").trim();     //密码
        //加密
        String password = SaSecureUtil.aesEncrypt(cipher.getKey(), passwordFont); //存储加密后的密码
        String sex = request.getParameter("sex").trim();               //性别
        String phoneNum = request.getParameter("phoneNum").trim();     //手机号
        String email = request.getParameter("email").trim();           //电子邮箱
        String birth = request.getParameter("birth").trim();           //生日
        String introduction = request.getParameter("introduction").trim();//签名
        String location = request.getParameter("location").trim();      //地区
        String avator = request.getParameter("avator").trim();          //头像地址

        if (username == null || username.equals("")) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "用户名不能为空");
            return jsonObject;
        }

        Consumer consumer1 = consumerService.getByUsername(username);
        if (consumer1 != null) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "用户名已存在");
            return jsonObject;
        }

        if (password == null || password.equals("")) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "密码不能为空");
            return jsonObject;
        }

        //把生日转换成Date格式
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        Date birthDate = new Date();
        try {
            birthDate = dateFormat.parse(birth);
        } catch (ParseException e) {
            e.printStackTrace();
        }

        //保存到前端用户的对象中
        Consumer consumer = new Consumer();
        consumer.setUsername(username);
        consumer.setPassword(password);
        consumer.setSex(new Byte(sex));
        consumer.setPhoneNum(phoneNum);
        consumer.setEmail(email);
        consumer.setBirth(birthDate);
        consumer.setIntroduction(introduction);
        consumer.setLocation(location);
        consumer.setAvator(avator);
        boolean flag = consumerService.insert(consumer);
        if (flag) {   //保存成功
            jsonObject.put(Consts.CODE, 1);
            jsonObject.put(Consts.MSG, "添加成功");
            return jsonObject;
        }
        jsonObject.put(Consts.CODE, 0);
        jsonObject.put(Consts.MSG, "添加失败");
        return jsonObject;
    }

    /**
     * 修改前端用户
     */
    @RequestMapping(value = "/update", method = RequestMethod.POST)
    public Object updateConsumer(HttpServletRequest request) {
        JSONObject jsonObject = new JSONObject();
        String id = request.getParameter("id").trim();          //主键
        String username = request.getParameter("username").trim();     //账号
        String password = request.getParameter("password").trim();     //密码
        String sex = request.getParameter("sex").trim();               //性别
        String phoneNum = request.getParameter("phoneNum").trim();     //手机号
        String email = request.getParameter("email").trim();           //电子邮箱
        String birth = request.getParameter("birth").trim();           //生日
        String introduction = request.getParameter("introduction").trim();//签名
        String location = request.getParameter("location").trim();      //地区

        if (username == null || username.equals("")) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "用户名不能为空");
            return jsonObject;
        }
        if (password == null || password.equals("")) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "密码不能为空");
            return jsonObject;
        }
        //把生日转换成Date格式
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        Date birthDate = new Date();
        try {
            birthDate = dateFormat.parse(birth);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        //保存到前端用户的对象中
        Consumer consumer = new Consumer();
        consumer.setId(Integer.parseInt(id));
        consumer.setUsername(username);
        consumer.setPassword(password);
        consumer.setSex(new Byte(sex));
        consumer.setPhoneNum(phoneNum);
        consumer.setEmail(email);
        consumer.setBirth(birthDate);
        consumer.setIntroduction(introduction);
        consumer.setLocation(location);
        boolean flag = consumerService.update(consumer);
        if (flag) {   //保存成功
            jsonObject.put(Consts.CODE, 1);
            jsonObject.put(Consts.MSG, "修改成功");
            return jsonObject;
        }
        jsonObject.put(Consts.CODE, 0);
        jsonObject.put(Consts.MSG, "修改失败");
        return jsonObject;
    }


    /**
     * 删除前端用户
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Object deleteConsumer(HttpServletRequest request) {
        String id = request.getParameter("id").trim();          //主键
        boolean flag = consumerService.delete(Integer.parseInt(id));
        return flag;
    }

    /**
     * 根据主键查询整个对象
     */
    @RequestMapping(value = "/selectByPrimaryKey", method = RequestMethod.GET)
    public Object selectByPrimaryKey(HttpServletRequest request) {
        String id = request.getParameter("id").trim();          //主键
        return consumerService.selectByPrimaryKey(Integer.parseInt(id));
    }

    /**
     * 查询所有前端用户
     */
    @RequestMapping(value = "/allConsumer", method = RequestMethod.GET)
    public Object allConsumer(HttpServletRequest request) {
        return consumerService.allConsumer();
    }

    /**
     * 更新前端用户图片
     */
    @RequestMapping(value = "/updateConsumerPic", method = RequestMethod.POST)
    public Object updateConsumerPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id") int id) {
        JSONObject jsonObject = new JSONObject();
        if (avatorFile.isEmpty()) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "文件上传失败");
            return jsonObject;
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis() + avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir") + System.getProperty("file.separator") + "avatorImages";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if (!file1.exists()) {
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath + System.getProperty("file.separator") + fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/avatorImages/" + fileName;
        try {
            avatorFile.transferTo(dest);
            Consumer consumer = new Consumer();
            consumer.setId(id);
            consumer.setAvator(storeAvatorPath);
            boolean flag = consumerService.update(consumer);
            if (flag) {
                jsonObject.put(Consts.CODE, 1);
                jsonObject.put(Consts.MSG, "上传成功");
                jsonObject.put("avator", storeAvatorPath);
                return jsonObject;
            }
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "上传失败");
            return jsonObject;
        } catch (IOException e) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "上传失败" + e.getMessage());
        } finally {
            return jsonObject;
        }
    }

    /**
     * 前端用户登录
     */
    @RequestMapping(value = "/login", method = RequestMethod.POST)
    public SaResult login(HttpServletRequest request) {
        StpUtil.logout();
        String username = request.getParameter("username");     //账号
        String passwordFont = request.getParameter("password");
        //加密前端传入的 密码
        String realPassword = SaSecureUtil.aesEncrypt(cipher.getKey(), passwordFont);
        //根据用户名和密码获取数据库里面所有的信息
        Consumer user = consumerService.getUserWithAccount(username, realPassword);
        log.error("数据库中查到的user {}", user);
        //如果查到了用户
        if (ObjectUtil.isNotNull(user)) {
            log.error("=============查询到了user {}", user);
            user.setPassword("***");
            //设置登录状态
            StpUtil.login("user:" + user.getId());
            return SaResult.ok("登录成功").setData(user);
        }
        return SaResult.error("用户名或密码错误-服务端");
    }


    /**
     * 二维码手机登录
     *
     * @param phoneNum: 手机号码
     * @return cn.dev33.satoken.util.SaResult
     * @since 2023/3/2 23:12
     */
    @PostMapping("/{phoneNum}")
    public SaResult loginWithPhoneNum(@PathVariable("phoneNum") String phoneNum, HttpSession session) {
        //只要访问这个接口,就直接先给退出登录,清除cookie
        StpUtil.logout();
        Consumer user = consumerService.getUserWithPhoneNum(phoneNum);
        if (ObjectUtil.isNotNull(user)) {
            log.error("=============查询到了user {}", user);
            user.setPassword("***");
            //设置登录状态
            StpUtil.login("user:" + user.getId());
            return SaResult.ok("登录成功").setData(user);
        }
        return SaResult.error("手机号码对应的帐号不存在,请先绑定手机号码");
    }

    /**
     * 退出登录
     *
     * @param :
     * @return void
     * @since 2023/3/3 22:44
     */
    @PostMapping("/logout")
    public void logout() {
        System.out.println("===退出登录===");
        StpUtil.logout();
    }

    @PostMapping("/upd_vip_status/{id}/{isVipUser}")
    public SaResult updVipStatus(@PathVariable("id") String id, @PathVariable("isVipUser") Boolean isVipUser) {
        int rows = consumerService.updVipStatus(id, isVipUser);
        return rows != 0 ? SaResult.ok("用户身份已经设置为会员") : SaResult.error();
    }

}






















