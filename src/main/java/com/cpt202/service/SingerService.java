package com.cpt202.service;

import com.cpt202.domain.Singer;

import java.util.List;

/**
 * 歌手service接口
 */
public interface SingerService {
    /**
     * 增加歌手，插入成功后，传入的 singer 对象的 ID 会被更新为数据库生成的主键。
     * @param singer 要添加的歌手对象 (ID 应为 null 或不设置)
     * @return 如果插入成功（影响行数 > 0）返回 true，否则 false。
     */
    public boolean addSinger(Singer singer);

    /**
     *修改
     */
    public boolean update(Singer singer);

    /**
     * 删除
     */
    public boolean delete(Integer id);

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
     * 根据歌手名字精确查询（忽略大小写）
     * @param name 歌手名
     * @return 匹配的Singer对象，如果没有找到则返回null
     */
    Singer findByNameIgnoreCase(String name);
}
