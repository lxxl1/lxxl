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
            return false;
        }
        return tagMapper.insert(tag) > 0;
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
        songTagMapper.deleteBySongId(songId);
        if (!tagIds.isEmpty()) {
            return songTagMapper.batchInsert(songId, tagIds) > 0;
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
        if (tagIds.isEmpty()) {
            return Collections.emptyList();
        }
        return tagMapper.selectByIds(tagIds);
    }
    
    @Override
    public List<Integer> getSongIdsByTag(Integer tagId) {
        return songTagMapper.selectSongIdsByTagId(tagId);
    }
} 