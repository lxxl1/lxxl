package com.cpt202.service;

import com.cpt202.domain.Song;

import java.util.List;

/**
 * 歌曲service接口
 */
public interface SongService {
    /**
     *增加
     */
    public boolean insert(Song song);

    /**
     *修改
     */
    public boolean update(Song song);

    /**
     * 删除
     */
    public boolean delete(Integer id);

    /**
     * 根据主键查询整个对象
     */
    public Song selectByPrimaryKey(Integer id);
    
    /**
     *增加播放次数
     */
    public boolean addNums(Integer id);

    /**
     * 查询所有歌曲
     */
    public List<Song> allSong();

    /**
     * 根据歌名精确查询列表
     */
    public List<Song> songOfName(String name);

    /**
     * 根据歌名模糊查询列表
     */
    public List<Song> likeSongOfName(String name);

    /**
     * 根据歌手id查询
     */
    public List<Song> songOfSingerId(Integer singerId);

    /**
     * 查询播放次数排前列的歌曲
     */
	public List<Song> topSong();

    /**
     * 更新歌曲审核状态
     */
    public boolean updateStatus(Integer songId, Integer status);

    /**
     * 获取待审核歌曲列表
     */
    public List<Song> getPendingSongs();

    /**
     * 获取已审核歌曲列表
     */
    public List<Song> getAuditedSongs(Integer status);
    /**
     * 根据用户id查询歌曲
     */
    public List<Song> songOfUserId(Integer userId);
}
