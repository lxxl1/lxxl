package com.cpt202.mapper;

import com.cpt202.domain.Song;
import org.springframework.stereotype.Repository;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 歌手Dao
 */
@Repository
public interface SongMapper {
     /**
      * 根据用户id查询歌曲
      */
     public List<Song> songOfUserId(Integer userId);
    /**
     *增加
     */
    public int insert(Song song);

    /**
     *修改
     */
    public int update(Song song);

    /**
     * 删除
     */
    public int delete(Integer id);

    /**
     * 根据主键查询整个对象
     */
    public Song selectByPrimaryKey(Integer id);

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
     * 增加歌曲播放次数
     */
	public boolean addNums(Integer id);

	/**
     * 查询播放次数排前列的歌曲
     */
	public List<Song> topSong();

    /**
     * 更新歌曲审核状态
     */
    @Update("UPDATE song SET status = #{status} WHERE id = #{songId}")
    public int updateStatus(@Param("songId") Integer songId, @Param("status") Integer status);

    /**
     * 获取待审核歌曲列表
     */
    @Select("SELECT * FROM song WHERE status = 0 OR status IS NULL")
    public List<Song> getPendingSongs();

    /**
     * 获取已审核歌曲列表
     */
    @Select("SELECT * FROM song WHERE status = #{status}")
    public List<Song> getAuditedSongs(@Param("status") Integer status);

    @Select("SELECT * FROM song WHERE status = 0")
    List<Song> selectPendingAuditSongs();

    @Select("SELECT * FROM song WHERE status = #{status}")
    List<Song> selectAuditedSongs(@Param("status") Integer status);

    @Update("UPDATE song SET status = #{status}, audit_reason = #{reason}, " +
            "audit_time = NOW(), auditor_id = #{auditorId} WHERE id = #{songId}")
    int updateSongAuditStatus(@Param("songId") Integer songId,
                            @Param("status") Integer status,
                            @Param("reason") String reason,
                            @Param("auditorId") Integer auditorId);
}
















