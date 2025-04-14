package com.cpt202.service.impl;

import com.cpt202.dto.SongDTO;
import com.cpt202.mapper.SongMapper;
import com.cpt202.domain.Song;
import com.cpt202.mapper.CategoryMapper;
import com.cpt202.mapper.SongCategoryMapper;
import com.cpt202.service.SongService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 歌曲service实现类
 */
@Service
@Slf4j
public class SongServiceImpl implements SongService {
    @Autowired
    private SongMapper songMapper;

    @Autowired
    private SongCategoryMapper songCategoryMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    /**
     * 增加
     *
     * @param song
     */
    @Override
    public boolean insert(Song song) {
        // 确保插入前清除可能存在的临时字段值
        // song.setCategoryNames(null); 
        return songMapper.insert(song) > 0;
    }

    /**
     * 修改
     *
     * @param song
     */
    @Override
    public boolean update(Song song) {
         // 确保更新前清除可能存在的临时字段值
        // song.setCategoryNames(null); 
        return songMapper.update(song) > 0;
    }

    /**
     * 删除
     *
     * @param id
     */
    @Override
    public boolean delete(Integer id) {
        // 删除歌曲前，先删除关联表中的记录 (虽然外键设置了级联删除，但显式删除更清晰)
        songCategoryMapper.deleteBySongId(id);
        return songMapper.delete(id) > 0;
    }

    /**
     * 根据主键查询整个对象
     *
     * @param id
     */
    @Override
    public Song selectByPrimaryKey(Integer id) {
        return songMapper.selectByPrimaryKey(id);
    }

    /**
     * 查询所有歌曲
     */
    @Override
    public List<Song> allSong() {
        return songMapper.allSong();
    }

    /**
     * 根据歌名精确查询列表
     *
     * @param name
     */
    @Override
    public List<Song> songOfName(String name) {
        return songMapper.songOfName(name);
    }

    /**
     * 根据歌名模糊查询列表
     *
     * @param name
     */
    @Override
    public List<Song> likeSongOfName(String name) {
        return songMapper.likeSongOfName("%" + name + "%");
    }
    
    /**
     * 根据用户id查询歌曲，并包含类别名称
     * 
     * @param userId
     * @return List of SongDTO
     */
    @Override
    public List<SongDTO> songOfUserId(Integer userId) {
        List<Song> songList = songMapper.songOfUserId(userId);
        if (songList == null || songList.isEmpty()) {
            return Collections.emptyList();
        }

        List<SongDTO> resultList = new ArrayList<>();
        for (Song song : songList) {
            SongDTO dto = new SongDTO();
            BeanUtils.copyProperties(song, dto); // 复制基础属性

            // 查询并设置类别名称
            List<Integer> categoryIds = songCategoryMapper.selectCategoryIdsBySongId(song.getId());
            if (categoryIds != null && !categoryIds.isEmpty()) {
                List<String> categoryNameList = categoryMapper.selectNamesByIds(categoryIds);
                if (categoryNameList != null && !categoryNameList.isEmpty()) {
                    dto.setCategoryNames(String.join(", ", categoryNameList));
                } else {
                    dto.setCategoryNames("N/A"); // Or empty string
                }
            } else {
                dto.setCategoryNames("N/A"); // Or empty string
            }
            
            resultList.add(dto);
        }
        return resultList;
    }
    
    /**
     * 根据歌手id查询
     *
     * @param singerId
     */
    @Override
    public List<Song> songOfSingerId(Integer singerId) {
        return songMapper.songOfSingerId(singerId);
    }

    @Override
    public boolean addNums(Integer id) {
        return songMapper.addNums(id);
    }

    @Override
    public List<Song> topSong() {
        return songMapper.topSong();
    }

    @Override
    public boolean updateStatus(Integer songId, Integer status) {
        return songMapper.updateStatus(songId, status) > 0;
    }

    @Override
    public List<Song> getPendingSongs() {
        return songMapper.getPendingSongs();
    }

    @Override
    public List<Song> getAuditedSongs(Integer status) {
        return songMapper.getAuditedSongs(status);
    }
}
