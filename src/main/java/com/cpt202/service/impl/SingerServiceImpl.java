package com.cpt202.service.impl;

import com.cpt202.mapper.SingerMapper;
import com.cpt202.domain.Singer;
import com.cpt202.service.SingerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 歌手service实现类
 */
@Service
@Slf4j
public class SingerServiceImpl implements SingerService {

    @Autowired
    private SingerMapper singerMapper;

    /**
     * 增加歌手，插入成功后，传入的 singer 对象的 ID 会被更新为数据库生成的主键。
     * @param singer 要添加的歌手对象 (ID 应为 null 或不设置)
     * @return 如果插入成功（影响行数 > 0）返回 true，否则 false。
     */
    @Override
    public boolean addSinger(Singer singer) {
        if (singer == null || !StringUtils.hasText(singer.getName())) {
            log.warn("Attempted to add singer with null object or empty name.");
            return false;
        }
        singer.setId(null);
        try {
            int affectedRows = singerMapper.insert(singer);
            if (affectedRows > 0) {
                log.info("Successfully added singer: ID={}, Name='{}'", singer.getId(), singer.getName());
                return true;
            } else {
                log.warn("Singer insert operation affected 0 rows for name: {}", singer.getName());
                return false;
            }
        } catch (Exception e) {
            log.error("Error adding singer with name '{}': {}", singer.getName(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 修改
     *
     * @param singer
     */
    @Override
    public boolean update(Singer singer) {
        if (singer == null || singer.getId() == null) {
            log.warn("Attempted to update singer with null object or null ID.");
            return false;
        }
        try {
            return singerMapper.update(singer) > 0;
        } catch (Exception e) {
            log.error("Error updating singer with ID {}: {}", singer.getId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 删除
     *
     * @param id
     */
    @Override
    public boolean delete(Integer id) {
        if (id == null) {
            log.warn("Attempted to delete singer with null ID.");
            return false;
        }
        try {
            return singerMapper.delete(id) > 0;
        } catch (Exception e) {
            log.error("Error deleting singer with ID {}: {}", id, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 根据主键查询整个对象
     *
     * @param id
     */
    @Override
    public Singer selectByPrimaryKey(Integer id) {
        if (id == null) {
            log.warn("Attempted to select singer by null ID.");
            return null;
        }
        try {
            return singerMapper.selectByPrimaryKey(id);
        } catch (Exception e) {
            log.error("Error selecting singer by ID {}: {}", id, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 查询所有歌手
     */
    @Override
    public List<Singer> allSinger() {
        try {
            return singerMapper.allSinger();
        } catch (Exception e) {
            log.error("Error fetching all singers: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 根据歌手名字模糊查询列表
     *
     * @param name
     */
    @Override
    public List<Singer> singerOfName(String name) {
        if (!StringUtils.hasText(name)) {
            log.debug("singerOfName called with empty name, returning all singers.");
            return allSinger();
        }
        try {
            return singerMapper.singerOfName(name.trim());
        } catch (Exception e) {
            log.error("Error searching singers by name like '{}': {}", name, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 根据性别查询
     *
     * @param sex
     */
    @Override
    public List<Singer> singerOfSex(Integer sex) {
        if (sex == null) {
            log.warn("Attempted to select singer by null sex.");
            return List.of();
        }
        try {
            return singerMapper.singerOfSex(sex);
        } catch (Exception e) {
            log.error("Error selecting singers by sex {}: {}", sex, e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * 根据歌手名字精确查询（忽略大小写）
     * @param name 歌手名
     * @return 匹配的Singer对象，如果没有找到则返回null
     */
    @Override
    public Singer findByNameIgnoreCase(String name) {
        if (!StringUtils.hasText(name)) {
            log.debug("findByNameIgnoreCase called with empty name.");
            return null;
        }
        try {
            return singerMapper.findByNameIgnoreCase(name.trim());
        } catch (Exception e) {
            log.error("Error finding singer by name ignoring case '{}': {}", name, e.getMessage(), e);
            return null;
        }
    }
}
