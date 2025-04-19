package com.cpt202.dto;

import com.cpt202.domain.Song;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

/**
 * Data Transfer Object for Song, including category and tag names/IDs.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SongDTO extends Song implements Serializable {

    private static final long serialVersionUID = 1L;

    // Remove redundant fields inherited from Song (Lombok should handle this)
    // private Integer id;
    // private Integer singerId; // REMOVE THIS
    // private String name;
    // ... other redundant fields ...

    private Integer singerId; // Or maybe singerName if needed?
    private String introduction;
    private Date createTime;
    private Date updateTime;
    private String pic;
    // Skip lyric for list view?
    private String url;
    // private String mvurl; // REMOVED
    // private Integer nums; // REMOVED
    // private Boolean isVip; // REMOVED
    private Integer status;
    private Integer userId;
    
    // Additional field for category names
    private String categoryNames;
    private List<Integer> categoryIds; // List of associated category IDs

    // Additional fields for tags
    private String tagNames; // Comma-separated tag names
    private List<Integer> tagIds; // List of associated tag IDs

    // Additional fields for singers
    private String singerNames; // Comma-separated singer names
    private List<Integer> singerIds; // List of associated singer IDs

    // Explicitly define getter/setter for isVip if needed (Lombok might handle it)
    /*
    @Override
    public Boolean getIsVip() {
        return super.getIsVip();
    }

    @Override
    public void setIsVip(Boolean isVip) {
        super.setIsVip(isVip);
    }
    */
} 