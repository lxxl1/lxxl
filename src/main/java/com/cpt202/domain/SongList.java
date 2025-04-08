package com.cpt202.domain;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;

/**
 * 歌单
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongList implements Serializable {
    /*主键*/
    private Integer id;
    /*歌单标题*/
    private String title;
    /*歌单图片*/
    private String pic;
    /*简介*/
    private String introduction;
    /*风格*/
    private String style;
}
