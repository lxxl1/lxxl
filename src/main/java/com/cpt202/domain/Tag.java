package com.cpt202.domain;

import lombok.Data;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tag {
    private Integer id;
    private String name;
    private Integer userId;
    private Date createTime;
    private Date updateTime;
} 