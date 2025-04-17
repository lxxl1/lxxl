package com.cpt202.mapper;

import com.cpt202.domain.Singer;
import org.springframework.stereotype.Repository;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 歌手Dao
 */
@Repository
public interface SingerMapper {
    /**
     *增加
     */
    public int insert(Singer singer);

    /**
     *修改
     */
    public int update(Singer singer);

    /**
     * 删除
     */
    public int delete(Integer id);

    /**
     * 根据主键查询整个对象
     */
    public Singer selectByPrimaryKey(Integer id);

    /**
     * 查询所有歌手
     */
    public List<Singer> allSinger();

    /**
     * 根据歌手名字模糊查询列表
     */
    public List<Singer> singerOfName(String name);

    /**
     * 根据性别查询
     */
    public List<Singer> singerOfSex(Integer sex);

    /**
     * 根据ID列表查询歌手姓名列表
     * @param ids 歌手ID列表
     * @return 歌手姓名列表
     */
    List<String> selectNamesByIds(@Param("ids") List<Integer> ids);

    /**
     * 根据ID列表查询歌手完整对象列表
     * @param ids 歌手ID列表
     * @return Singer对象列表
     */
    List<Singer> selectByIds(@Param("ids") List<Integer> ids);
}
















