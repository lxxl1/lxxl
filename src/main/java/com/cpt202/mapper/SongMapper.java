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
     * 根据歌手id查询 (方法已在XML中移除，此处也应移除或修改)
     */
    // public List<Song> songOfSingerId(Integer singerId);

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

    @Update("UPDATE song SET status = #{status} WHERE id = #{songId}")
    int updateSongAuditStatus(@Param("songId") Integer songId,
                            @Param("status") Integer status);

    /**
     * 根据用户ID和类别ID查询歌曲列表
     */
    List<Song> selectUserSongsByCategory(@Param("userId") Integer userId, @Param("categoryId") Integer categoryId);

    /**
     * 根据用户ID、分类、状态、搜索词查询歌曲 (分页前的查询) - 新增
     * 注意：这里的参数名（userId, categoryId, status, searchTerm）需要与XML中的`<if>`测试条件匹配。
     * @param userId 用户ID (必须)
     * @param categoryId 类别ID (可选)
     * @param status 状态 (可选)
     * @param searchTerm 搜索词 (可选，已包含 %)
     * @return 匹配的歌曲列表
     */
    List<Song> searchUserSongs(@Param("userId") Integer userId,
                               @Param("categoryId") Integer categoryId,
                               @Param("status") Integer status,
                               @Param("searchTerm") String searchTerm);

    /**
     * 计算指定用户的总歌曲数
     */
    Long countTotalSongsByUserId(@Param("userId") Integer userId);

    /**
     * 计算指定用户特定状态的歌曲数
     */
    Long countSongsByUserIdAndStatus(@Param("userId") Integer userId, @Param("status") Integer status);

    /**
     * 计算指定用户所有歌曲的总播放量 (如果没有任何歌曲，SUM可能返回NULL) - REMOVED
     */
    // Long sumTotalPlaysByUserId(@Param("userId") Integer userId);
}
















