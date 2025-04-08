package com.cpt202.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongTag {
    private Integer songId;
    private Integer tagId;
    private Date createTime;
} 