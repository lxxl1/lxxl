package com.cpt202.domain;

import lombok.Data;
import java.util.Date;

/**
 * 歌曲类别关联实体类
 */
@Data
public class SongCategory {
    private Integer id;
    private Integer songId;
    private Integer categoryId;
    private Date createTime;
} 