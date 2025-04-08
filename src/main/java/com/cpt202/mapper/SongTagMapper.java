package com.cpt202.mapper;

import com.cpt202.domain.SongTag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface SongTagMapper {
    int insert(SongTag songTag);
    int delete(Integer id);
    int deleteBySongIdAndTagId(Integer songId, Integer tagId);
    int deleteBySongId(Integer songId);
    List<SongTag> selectBySongId(Integer songId);
    List<SongTag> selectByTagId(Integer tagId);
    List<Integer> selectSongIdsByTagId(Integer tagId);
    List<Integer> selectTagIdsBySongId(Integer songId);
    int batchInsert(@Param("songId") Integer songId, @Param("tagIds") List<Integer> tagIds);
} 