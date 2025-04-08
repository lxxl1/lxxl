package com.cpt202.service;

import com.cpt202.domain.Tag;
import java.util.List;

public interface TagService {
    boolean createTag(Tag tag);
    boolean deleteTag(Integer id);
    boolean updateTag(Tag tag);
    Tag getTagById(Integer id);
    List<Tag> getUserTags(Integer userId);
    boolean addSongTags(Integer songId, List<Integer> tagIds);
    boolean removeSongTag(Integer songId, Integer tagId);
    List<Tag> getSongTags(Integer songId);
    List<Integer> getSongIdsByTag(Integer tagId);
} 