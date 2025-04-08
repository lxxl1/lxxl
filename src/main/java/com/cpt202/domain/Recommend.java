package com.cpt202.domain;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;

/**
 * 推荐
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Recommend implements Serializable {
    private Long userId; //用户id
    private Long songId; //歌曲id
    private Integer commend; //收藏数
}
