package com.cpt202.service.impl;

import com.cpt202.domain.Tag;
import com.cpt202.mapper.TagMapper;
import com.cpt202.mapper.SongTagMapper;
import com.cpt202.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Collections;
import java.sql.Timestamp;
import java.time.LocalDateTime;

@Service
public class TagServiceImpl implements TagService {
    @Autowired
    private TagMapper tagMapper;
    
    @Autowired
    private SongTagMapper songTagMapper;
    
    @Override
    public boolean createTag(Tag tag) {
        Tag existingTag = tagMapper.selectByNameAndUserId(tag.getName(), tag.getUserId());
        if (existingTag != null) {
            System.out.println("Tag with name '" + tag.getName() + "' already exists for user " + tag.getUserId());
            return false;
        }
        if (tag.getCreateTime() == null) {
            tag.setCreateTime(Timestamp.valueOf(LocalDateTime.now()));
        }
        if (tag.getUpdateTime() == null) {
            tag.setUpdateTime(Timestamp.valueOf(LocalDateTime.now()));
        }
        int result = tagMapper.insert(tag);
        return result > 0;
    }
    
    @Override
    public boolean addTag(String name, Integer userId) {
        Tag existingTag = tagMapper.selectByNameAndUserId(name, userId);
        if (existingTag != null) {
            System.out.println("Tag with name '" + name + "' already exists for user " + userId);
            return false;
        }

        Tag newTag = new Tag();
        newTag.setName(name);
        newTag.setUserId(userId);
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        newTag.setCreateTime(now);
        newTag.setUpdateTime(now);
        
        try {
            int result = tagMapper.insert(newTag);
            return result > 0;
        } catch (Exception e) {
            System.err.println("Database error adding tag: " + e.getMessage());
            return false;
        }
    }
    
    @Override
    public boolean deleteTag(Integer id) {
        return tagMapper.delete(id) > 0;
    }
    
    @Override
    public boolean updateTag(Tag tag) {
        return tagMapper.update(tag) > 0;
    }
    
    @Override
    public Tag getTagById(Integer id) {
        return tagMapper.selectById(id);
    }
    
    @Override
    public List<Tag> getUserTags(Integer userId) {
        return tagMapper.selectByUserId(userId);
    }
    
    @Override
    @Transactional
    public boolean addSongTags(Integer songId, List<Integer> tagIds) {
        try {
            songTagMapper.deleteBySongId(songId);
        } catch (Exception e) {
            System.err.println("Error deleting old tags for song " + songId + ": " + e.getMessage());
        }
        if (tagIds != null && !tagIds.isEmpty()) {
            try {
                int insertedRows = songTagMapper.batchInsert(songId, tagIds);
                return insertedRows > 0;
            } catch (Exception e) {
                System.err.println("Error batch inserting tags for song " + songId + ": " + e.getMessage());
                return false;
            }
        }
        return true;
    }
    
    @Override
    public boolean removeSongTag(Integer songId, Integer tagId) {
        return songTagMapper.deleteBySongIdAndTagId(songId, tagId) > 0;
    }
    
    @Override
    public List<Tag> getSongTags(Integer songId) {
        List<Integer> tagIds = songTagMapper.selectTagIdsBySongId(songId);
        if (tagIds == null || tagIds.isEmpty()) {
            return Collections.emptyList();
        }
        return tagMapper.selectByIds(tagIds);
    }
    
    @Override
    public List<Integer> getSongIdsByTag(Integer tagId) {
        return songTagMapper.selectSongIdsByTagId(tagId);
    }
} 