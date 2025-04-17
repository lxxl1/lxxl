package com.cpt202.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SongSingerMapper {

    /**
     * 插入单条歌曲-歌手关联
     * @param songId 歌曲ID
     * @param singerId 歌手ID
     * @return 影响行数
     */
    int insert(@Param("songId") Integer songId, @Param("singerId") Integer singerId);

    /**
     * 批量插入歌曲-歌手关联
     * @param songId 歌曲ID
     * @param singerIds 歌手ID列表
     * @return 影响行数
     */
    int insertBatch(@Param("songId") Integer songId, @Param("singerIds") List<Integer> singerIds);

    /**
     * 根据歌曲ID删除关联
     * @param songId 歌曲ID
     * @return 影响行数
     */
    int deleteBySongId(@Param("songId") Integer songId);

    /**
     * 根据歌手ID删除关联
     * @param singerId 歌手ID
     * @return 影响行数
     */
    int deleteBySingerId(@Param("singerId") Integer singerId);

    /**
     * 根据歌曲ID查询关联的歌手ID列表
     * @param songId 歌曲ID
     * @return 歌手ID列表
     */
    List<Integer> selectSingerIdsBySongId(@Param("songId") Integer songId);

    /**
     * 根据歌手ID查询关联的歌曲ID列表
     * @param singerId 歌手ID
     * @return 歌曲ID列表
     */
    List<Integer> selectSongIdsBySingerId(@Param("singerId") Integer singerId);
} 