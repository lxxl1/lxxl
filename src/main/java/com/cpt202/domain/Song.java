package com.cpt202.domain;

import lombok.Data;
import java.io.Serializable;
import java.util.Date;

/**
 * 歌曲
 */
@Data
public class Song implements Serializable {
    private static final long serialVersionUID = 1L;
    /*主键*/
    private Integer id;
    /*用户id*/
    private Integer userId;
    /*歌名*/
    private String name;
    /*简介*/
    private String introduction;
    /*创建时间*/
    private Date createTime;
    /*更新时间*/
    private Date updateTime;
    /*歌曲图片*/
    private String pic;
    /*歌词*/
    private String lyric;
    /*歌曲地址*/
    private String url;
    /*歌曲播放次数*/
    private Integer nums;
    /*审核状态：0-待审核，1-审核通过，2-审核不通过*/
    private Integer status;
}
