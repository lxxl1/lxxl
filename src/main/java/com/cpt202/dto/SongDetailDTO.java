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
public class SongDetailDTO extends SongDTO { // Inherits fields from SongDTO

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