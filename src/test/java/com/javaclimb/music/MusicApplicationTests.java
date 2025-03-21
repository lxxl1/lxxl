package com.javaclimb.music;

import cn.dev33.satoken.secure.SaSecureUtil;
import com.javaclimb.music.utils.CipherBean;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class MusicApplicationTests {
    @Autowired
    CipherBean cipher;

    @Test
    void contextLoads() {
        String key = cipher.getKey();
        String mima = "123456";
        String ciphertext = SaSecureUtil.aesEncrypt(key, mima);
        System.out.println("AES加密后：" + ciphertext);
        // 解密
        String text2 = SaSecureUtil.aesDecrypt(key, ciphertext);
        System.out.println("AES解密后：" + text2);
    }

}
