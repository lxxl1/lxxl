package com.cpt202.service;

import java.util.List;

/**
 * 歌曲类别关联Service接口
 */
public interface SongCategoryService {
    /**
     * 添加单个歌曲类别关联
     */
    boolean addSongCategory(Integer songId, Integer categoryId);
    
    /**
     * 批量添加歌曲类别关联（先删除现有关联，再添加新关联）
     */
    boolean addSongCategories(Integer songId, List<Integer> categoryIds);
    
    /**
     * 移除歌曲与指定类别的关联
     */
    boolean removeSongCategory(Integer songId, Integer categoryId);
    
    /**
     * 移除歌曲的所有类别关联
     */
    boolean removeAllSongCategories(Integer songId);
    
    /**
     * 获取歌曲所属的所有类别ID
     */
    List<Integer> getSongCategories(Integer songId);
    
    /**
     * 获取类别下的所有歌曲ID
     */
    List<Integer> getCategorySongs(Integer categoryId);
} 