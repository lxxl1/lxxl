package com.cpt202.dto;

import lombok.Data;

/**
 * DTO for returning user statistics.
 */
@Data
public class UserStatsDTO {
    private long totalSongs = 0;      // 总歌曲数
    private long approvedSongs = 0; // 已批准歌曲数
    private long pendingSongs = 0;  // 待审核歌曲数
    // 可以根据需要添加其他统计数据，例如 rejectedSongs
} 