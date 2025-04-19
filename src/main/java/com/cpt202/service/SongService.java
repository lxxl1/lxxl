package com.cpt202.service;

import com.cpt202.domain.Song;
import com.cpt202.dto.SongDTO;
import com.cpt202.dto.SongDetailDTO;
import com.github.pagehelper.PageInfo;

import java.util.List;
import java.util.Map;

/**
 * 歌曲service接口
 */
public interface SongService {
    /**
     * 增加歌曲，并关联歌手
     * @param song 歌曲基本信息
     * @param singerIds 关联的歌手ID列表
     * @return 是否成功
     */
    boolean insert(Song song, List<Integer> singerIds);

    /**
     * 修改歌曲，并更新歌手关联
     * @param song 歌曲基本信息
     * @param singerIds 新的歌手ID列表
     * @return 是否成功
     */
    boolean update(Song song, List<Integer> singerIds);

    /**
     * 删除歌曲（会自动删除歌曲-歌手关联）
     */
    boolean delete(Integer id);

    /**
     * 根据主键查询歌曲详细信息（包含歌手列表）
     * @param id 歌曲ID
     * @return SongDetailDTO 或 null (如果未找到)
     */
    SongDetailDTO selectDetailByPrimaryKey(Integer id);

    /**
     * 查询所有歌曲 (返回包含歌手、类别、标签等信息的DTO列表)
     */
    List<SongDTO> allSong();

    /**
     * 根据歌名精确查询列表 (返回DTO列表)
     */
    List<SongDTO> songOfName(String name);

    /**
     * 根据歌名模糊查询列表 (返回DTO列表)
     */
    List<SongDTO> likeSongOfName(String name);

    /**
     * 根据歌手id查询其所有歌曲 (返回基本Song对象列表 - 保持不变，因为重点是歌曲本身)
     * @param singerId 歌手ID
     * @return 歌曲列表
     */
    List<Song> getSongsBySingerId(Integer singerId);

    /**
     * 查询播放次数排前列的歌曲 (返回DTO列表)
     */
    List<SongDTO> topSong();

    /**
     * 更新歌曲审核状态
     */
    boolean updateStatus(Integer songId, Integer status);

    /**
     * 获取待审核歌曲列表 (返回DTO列表)
     */
    List<SongDTO> getPendingSongs();

    /**
     * 获取已审核歌曲列表 (返回DTO列表)
     */
    List<SongDTO> getAuditedSongs(Integer status);

    /**
     * 根据用户id查询歌曲 (返回包含类别、标签、歌手信息的分页DTO列表) - 基础版本
     * @param userId 用户ID
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 包含歌曲信息和分页详情的PageInfo对象
     */
    PageInfo<SongDTO> songOfUserId(Integer userId, int pageNum, int pageSize);

    /**
     * 根据用户ID、分类、状态、搜索词查询歌曲 (返回分页DTO列表) - 新增
     * @param userId 用户ID
     * @param categoryId 类别ID (null表示不过滤)
     * @param status 状态 (null表示不过滤, 0:待审核, 1:通过, 2:不通过)
     * @param searchTerm 搜索词 (null或空表示不搜索，按歌名搜索)
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 包含歌曲信息和分页详情的PageInfo对象
     */
    PageInfo<SongDTO> searchUserSongs(Integer userId, Integer categoryId, Integer status, String searchTerm, int pageNum, int pageSize);

    /**
     * 根据用户ID和类别ID查询歌曲列表 (返回包含当前所有类别ID的DTO列表)
     * // TODO: Update the return type and implementation if needed
     */
    List<SongDTO> getUserSongsByCategory(Integer userId, Integer categoryId);

    /**
     * 更新歌曲的类别关联
     */
    boolean updateSongCategories(Integer songId, List<Integer> categoryIds);
}
