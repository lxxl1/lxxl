package com.cpt202.domain;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;
import java.util.Date;

/**
 * 歌曲
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Song implements Serializable {
    /*主键*/
    private Integer id;
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
    /*歌曲MV地址 - REMOVED*/
    // private String mvurl;
    /*歌曲播放次数 - REMOVED*/
    // private Integer nums;
    /*是否是vip才能听的歌曲 - REMOVED*/
    // private Boolean isVip;
    /*审核状态：0-待审核，1-审核通过，2-审核不通过*/
    private Integer status;
    private Integer userId;
}
