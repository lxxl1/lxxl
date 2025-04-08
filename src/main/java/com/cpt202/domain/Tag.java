package com.cpt202.domain;

import lombok.Data;
import java.util.Date;

@Data
public class Tag {
    private Integer id;
    private String name;
    private Integer userId;
    private Date createTime;
    private Date updateTime;
} 