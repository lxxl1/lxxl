package com.cpt202.dto;

import java.util.List;

public class UpdateSongCategoryRequest {
    private Integer songId;
    private List<Integer> categoryIds;

    // Standard Getters and Setters
    public Integer getSongId() {
        return songId;
    }

    public void setSongId(Integer songId) {
        this.songId = songId;
    }

    public List<Integer> getCategoryIds() {
        return categoryIds;
    }

    public void setCategoryIds(List<Integer> categoryIds) {
        this.categoryIds = categoryIds;
    }

    @Override
    public String toString() {
        return "UpdateSongCategoryRequest{" +
               "songId=" + songId +
               ", categoryIds=" + categoryIds +
               '}';
    }
} 