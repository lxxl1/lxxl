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
        if (emailMapper.selectEmail(email) > 0){
            return true;
        }
        else {
            return false;
        }

    }

    @Override
    public void save(Mail mail) {
        emailMapper.insert(mail);
    }
}

