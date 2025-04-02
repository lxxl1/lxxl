package com.cpt202.service.impl;
import com.cpt202.domain.Mail;
import com.cpt202.mapper.EmailMapper;
import com.cpt202.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;

@Service
public class EmailServiceImpl implements EmailService{
    @Autowired
    private JavaMailSender mailSender;
    @Autowired
    private EmailMapper emailMapper;

    @Value("${spring.mail.username}")
    private String from;

    /**
     * 发送邮件
     *
     * @param to      收件人邮箱
     * @param subject 邮件主题
     * @param content 邮件内容
     */
    public void sendMail(String to, String subject, String content) throws MessagingException {
        // 创建邮件消息
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setFrom(from);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true);

        // 发送邮件
        mailSender.send(message);
    }

    @Override
    public boolean selectByEmail(String email) {
        return emailMapper.selectEmail(email) > 0;
    }

    @Override
    public void save(Mail mail) {
        // 检查邮箱是否已经存在
        if (selectByEmail(mail.getEmail())) {
            // 如果存在，更新验证码
            emailMapper.updateCodeByEmail(mail.getEmail(), mail.getCode());
        } else {
            // 如果不存在，插入新记录
            emailMapper.insert(mail);
        }
    }
}

