package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Mail;
import com.cpt202.service.EmailService;
import com.cpt202.utils.VerificationCodeUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.mail.MessagingException;


@RestController
public class EmailController {
    @Autowired
    private EmailService emailService;


    @PostMapping("/sendEmail")
    public Result sendEmail(@RequestBody Mail mail) throws MessagingException {

        // 检查邮箱是否已被注册
//        if (emailService.selectByEmail(mail.getEmail())) {
//            return Result.error("40003", "该邮箱已被注册，请使用其他邮箱注册或进行密码找回。");
//        }


        // 生成验证码
        String code = VerificationCodeUtils.generateCode(6);

        // 发送邮件
        String subject = "注册验证码";
        String content = "尊敬的用户，您的验证码为：" + code;
        emailService.sendMail(mail.getEmail(), subject, content);

        // 保存验证码
        mail.setCode(code);
        mail.setEmail(mail.getEmail());
        emailService.save(mail);


        return Result.success();
    }


}
