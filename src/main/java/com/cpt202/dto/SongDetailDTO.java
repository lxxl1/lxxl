package com.cpt202.dto;

import com.cpt202.domain.Song;
import com.cpt202.domain.Singer; // Assuming Singer domain exists
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class SongDetailDTO extends Song {
    private String categoryNames; // 类别名称，逗号分隔
    private List<Integer> tagIds; // 标签ID列表
    private String tagNames;      // 标签名称，逗号分隔
    private List<Integer> singerIds; // 歌手ID列表
    private String singerNames;   // 歌手名称，逗号分隔

    private List<SingerInfo> singers;
    // You might want to add other detailed info here if needed

    @Data
    public static class SingerInfo {
        private Integer id;
        private String name;
        // Add other singer fields if needed, e.g., pic
        // private String pic;
    }
} 