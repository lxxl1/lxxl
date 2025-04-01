package com.cpt202.utils;

import java.util.Random;

public class VerificationCodeUtils {

    public static String generateCode(int length) {
        StringBuilder s = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < length; i++) {
            int n = random.nextInt(10);
            s.append(n);
        }
        return s.toString();
    }
}

