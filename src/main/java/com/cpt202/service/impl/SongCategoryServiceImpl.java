package com.cpt202.service.impl;

import com.cpt202.domain.SongCategory;
import com.cpt202.mapper.SongCategoryMapper;
import com.cpt202.service.SongCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * 歌曲类别关联Service实现类
 */
@Service
public class SongCategoryServiceImpl implements SongCategoryService {

    private static final Logger log = LoggerFactory.getLogger(SongCategoryServiceImpl.class);

    @Autowired
    private SongCategoryMapper songCategoryMapper;

    /**
     * 添加单个歌曲类别关联
     */
    @Override
    public boolean addSongCategory(Integer songId, Integer categoryId) {
        SongCategory songCategory = new SongCategory();
        songCategory.setSongId(songId);
        songCategory.setCategoryId(categoryId);
        return songCategoryMapper.insert(songCategory) > 0;
    }

    /**
     * 批量添加歌曲类别关联
     */
    @Override
    @Transactional
    public boolean addSongCategories(Integer songId, List<Integer> categoryIds) {
        // 先删除歌曲现有的类别关联
        songCategoryMapper.deleteBySongId(songId);
        
        // 添加新的类别关联
        for (Integer categoryId : categoryIds) {
            SongCategory songCategory = new SongCategory();
            songCategory.setSongId(songId);
            songCategory.setCategoryId(categoryId);
            songCategoryMapper.insert(songCategory);
        }
        return true;
    }

    /**
     * 移除歌曲与指定类别的关联
     */
    @Override
    public boolean removeSongCategory(Integer songId, Integer categoryId) {
        return songCategoryMapper.deleteBySongAndCategory(songId, categoryId) > 0;
    }

    /**
     * 移除歌曲的所有类别关联
     */
    @Override
    public boolean removeAllSongCategories(Integer songId) {
        return songCategoryMapper.deleteBySongId(songId) > 0;
    }

    /**
     * 获取歌曲所属的所有类别ID
     */
    @Override
    public List<Integer> getSongCategories(Integer songId) {
        return songCategoryMapper.selectCategoryIdsBySongId(songId);
    }

    /**
     * 获取类别下的所有歌曲ID
     */
    @Override
    public List<Integer> getCategorySongs(Integer categoryId) {
        return songCategoryMapper.selectSongIdsByCategoryId(categoryId);
    }

    /**
     * 更新歌曲的类别关联（先删除旧关联，再添加新关联）
     * This effectively replaces the logic previously in addSongCategories if the goal is update.
     */
    @Override
    @Transactional
    public boolean updateSongCategories(Integer songId, List<Integer> categoryIds) {
        try {
            // 1. Delete existing categories for the song
            songCategoryMapper.deleteBySongId(songId);
            log.info("Deleted existing categories for song ID: {}", songId);

            // 2. Insert new categories if the list is not empty
            if (!CollectionUtils.isEmpty(categoryIds)) {
                // Consider using insertBatch if available in mapper for efficiency
                songCategoryMapper.insertBatch(songId, categoryIds); // Assuming insertBatch exists
                log.info("Inserted new categories {} for song ID: {}", categoryIds, songId);
            }
            return true;
        } catch (Exception e) {
            log.error("Error updating categories for song ID {}: {}", songId, e.getMessage(), e);
            // Propagate exception to ensure transaction rollback
            throw new RuntimeException("Failed to update song categories for song ID: " + songId, e);
        }
    }

    /**
     * 获取歌曲关联的所有类别ID (Alias for getSongCategories)
     */
    @Override
    public List<Integer> getCategoryIdsBySongId(Integer songId) {
        // This simply calls the existing method that does the same thing.
        return getSongCategories(songId);
        // Or directly call mapper: return songCategoryMapper.selectCategoryIdsBySongId(songId);
    }
} 