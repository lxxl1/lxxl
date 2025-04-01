package com.cpt202.service;

import com.cpt202.domain.Mail;

import javax.mail.MessagingException;

public interface EmailService {
    void sendMail(String to, String subject, String content) throws MessagingException;

    boolean selectByEmail(String email);

    void save(Mail mail);
}
