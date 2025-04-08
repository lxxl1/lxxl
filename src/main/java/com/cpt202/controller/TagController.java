package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Tag;
import com.cpt202.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 标签管理controller
 */
@RestController
@RequestMapping("/tag")
public class TagController {

    @Autowired
    private TagService tagService;

    /**
     * 创建标签
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Result createTag(HttpServletRequest request) {
        String name = request.getParameter("name").trim();
        String userId = request.getParameter("userId").trim();

        Tag tag = new Tag();
        tag.setName(name);
        tag.setUserId(Integer.parseInt(userId));

        boolean flag = tagService.createTag(tag);
        if (flag) {
            return Result.success();
        }
        return Result.failure("创建标签失败");
    }

    /**
     * 删除标签
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Result deleteTag(HttpServletRequest request) {
        String id = request.getParameter("id").trim();
        boolean flag = tagService.deleteTag(Integer.parseInt(id));
        if (flag) {
            return Result.success();
        }
        return Result.failure("删除标签失败");
    }

    /**
     * 更新标签
     */
    @RequestMapping(value = "/update", method = RequestMethod.POST)
    public Result updateTag(HttpServletRequest request) {
        String id = request.getParameter("id").trim();
        String name = request.getParameter("name").trim();

        Tag tag = new Tag();
        tag.setId(Integer.parseInt(id));
        tag.setName(name);

        boolean flag = tagService.updateTag(tag);
        if (flag) {
            return Result.success();
        }
        return Result.failure("更新标签失败");
    }

    /**
     * 获取用户的所有标签
     */
    @RequestMapping(value = "/user", method = RequestMethod.GET)
    public Result getUserTags(HttpServletRequest request) {
        String userId = request.getParameter("userId");
        return Result.success(tagService.getUserTags(Integer.parseInt(userId)));
    }

    /**
     * 为歌曲添加标签
     */
    @RequestMapping(value = "/song/add", method = RequestMethod.POST)
    public Result addSongTags(HttpServletRequest request) {
        String songId = request.getParameter("songId").trim();
        String tagIds = request.getParameter("tagIds").trim();
        
        // 将逗号分隔的tagIds转换为List
        List<Integer> tagIdList = Arrays.stream(tagIds.split(","))
                .map(Integer::parseInt)
                .collect(Collectors.toList());

        boolean flag = tagService.addSongTags(Integer.parseInt(songId), tagIdList);
        if (flag) {
            return Result.success();
        }
        return Result.failure("添加标签失败");
    }

    /**
     * 移除歌曲标签
     */
    @RequestMapping(value = "/song/delete", method = RequestMethod.GET)
    public Result removeSongTag(HttpServletRequest request) {
        String songId = request.getParameter("songId").trim();
        String tagId = request.getParameter("tagId").trim();

        boolean flag = tagService.removeSongTag(
            Integer.parseInt(songId), 
            Integer.parseInt(tagId)
        );
        if (flag) {
            return Result.success();
        }
        return Result.failure("移除标签失败");
    }

    /**
     * 获取歌曲的所有标签
     */
    @RequestMapping(value = "/song", method = RequestMethod.GET)
    public Result getSongTags(HttpServletRequest request) {
        String songId = request.getParameter("songId");
        return Result.success(tagService.getSongTags(Integer.parseInt(songId)));
    }

    /**
     * 获取标签下的所有歌曲
     */
    @RequestMapping(value = "/songs", method = RequestMethod.GET)
    public Result getSongsByTag(HttpServletRequest request) {
        String tagId = request.getParameter("tagId");
        return Result.success(tagService.getSongIdsByTag(Integer.parseInt(tagId)));
    }
} 