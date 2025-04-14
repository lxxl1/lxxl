package com.cpt202.dto;

import lombok.Data;
import java.io.Serializable;
import java.util.Date;

/**
 * Data Transfer Object for Song, including category names.
 */
@Data
public class SongDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer singerId; // Or maybe singerName if needed?
    private String name;
    private String introduction;
    private Date createTime;
    private Date updateTime;
    private String pic;
    // Skip lyric for list view?
    private String url;
    private String mvurl;
    private Integer nums;
    private Byte isVip;
    private Integer status;
    private Integer userId;
    
    // Additional field for category names
    private String categoryNames; 
} 