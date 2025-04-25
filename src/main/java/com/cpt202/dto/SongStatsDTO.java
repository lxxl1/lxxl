package com.cpt202.dto;

import lombok.Data;

@Data
public class SongStatsDTO {
    private long totalSongs;
    private long pendingSongs;
    private long approvedSongs;
    private long rejectedSongs;
} 