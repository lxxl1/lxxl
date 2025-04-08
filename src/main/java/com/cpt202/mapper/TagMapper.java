package com.cpt202.mapper;

import com.cpt202.domain.Tag;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface TagMapper {
    int insert(Tag tag);
    int delete(Integer id);
    int update(Tag tag);
    Tag selectById(Integer id);
    Tag selectByNameAndUserId(String name, Integer userId);
    List<Tag> selectByUserId(Integer userId);
    List<Tag> selectByIds(List<Integer> ids);
} 