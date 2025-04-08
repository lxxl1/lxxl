package com.cpt202.domain;

import lombok.Data;
import java.util.Date;

@Data
public class SongTag {
    private Integer songId;
    private Integer tagId;
    private Date createTime;
} 