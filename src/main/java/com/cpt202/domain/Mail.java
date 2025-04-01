package com.cpt202.domain;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor
public class Mail {
    private String email;
    private String code;


}
