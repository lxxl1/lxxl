package com.cpt202.service.impl;

import com.cpt202.mapper.ListSongMapper;
import com.cpt202.domain.ListSong;
import com.cpt202.service.ListSongService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 歌单里面的歌曲service实现类
 */
@Service
public class ListSongServiceImpl implements ListSongService {
    @Autowired
    private ListSongMapper listSongMapper;

    /**
     * 增加
     *
     * @param listSong
     */
    @Override
    public boolean insert(ListSong listSong) {
        return listSongMapper.insert(listSong) > 0;
    }

    /**
     * 修改
     *
     * @param listSong
     */
    @Override
    public boolean update(ListSong listSong) {
        return listSongMapper.update(listSong) > 0;
    }

    /**
     * 删除
     *
     * @param id
     */
    @Override
    public boolean delete(Integer id) {
        return listSongMapper.delete(id) > 0;
    }

    /**
     * 根据歌曲id和歌单id删除
     */
    @Override
    public boolean deleteBySongIdAndSongListId(Integer songId, Integer songListId) {
        return listSongMapper.deleteBySongIdAndSongListId(songId, songListId) > 0;
    }

    /**
     * 根据主键查询整个对象
     *
     * @param id
     */
    @Override
    public ListSong selectByPrimaryKey(Integer id) {
        return listSongMapper.selectByPrimaryKey(id);
    }

    /**
     * 查询所有歌单里面的歌曲
     */
    @Override
    public List<ListSong> allListSong() {
        return listSongMapper.allListSong();
    }

    /**
     * 根据歌单id查询所有的歌曲
     *
     * @param songListId
     */
    @Override
    public List<ListSong> listSongOfSongListId(Integer songListId) {
        return listSongMapper.listSongOfSongListId(songListId);
    }

    /**
     * 根据 id 修改歌曲vip状态
     *
     * @param id:
     * @return int
     * @since 2023/3/3 10:59
     */
    @Override
    public int updVipStatusById(String id, Boolean isVip) {
        return listSongMapper.updVipStatusById(id, isVip);
    }
}
