package com.cpt202.mapper;

import com.cpt202.domain.SongTag;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface SongTagMapper {
    int insert(SongTag songTag);
    int delete(Integer id);
    int deleteBySongIdAndTagId(Integer songId, Integer tagId);
    List<SongTag> selectBySongId(Integer songId);
    List<SongTag> selectByTagId(Integer tagId);
    List<Integer> selectSongIdsByTagId(Integer tagId);
} 