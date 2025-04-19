package com.cpt202.mapper;

import com.cpt202.domain.SongCategory;
import org.springframework.stereotype.Repository;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/**
 * 歌曲类别关联Mapper
 */
@Repository
public interface SongCategoryMapper {
    /**
     * 添加歌曲类别关联
     */
    int insert(SongCategory songCategory);
    
    /**
     * 删除歌曲与指定类别的关联
     */
    int deleteBySongAndCategory(@Param("songId") Integer songId, @Param("categoryId") Integer categoryId);
    
    /**
     * 删除歌曲的所有类别关联
     */
    int deleteBySongId(@Param("songId") Integer songId);
    
    /**
     * 查询歌曲所属的所有类别ID
     */
    List<Integer> selectCategoryIdsBySongId(@Param("songId") Integer songId);
    
    /**
     * 查询类别下的所有歌曲ID
     */
    List<Integer> selectSongIdsByCategoryId(@Param("categoryId") Integer categoryId);

    /**
     * 批量插入歌曲类别关联
     * @param songId 歌曲ID
     * @param categoryIds 类别ID列表
     * @return 影响行数
     */
    int insertBatch(@Param("songId") Integer songId, @Param("categoryIds") List<Integer> categoryIds);
} 