package com.cpt202.controller;

import com.alibaba.fastjson.JSONObject;
import com.cpt202.common.Result;
import com.cpt202.domain.Comment;
import com.cpt202.service.CommentService;
import com.cpt202.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.Date;

/**
 * 评论控制类
 */
@RestController
@RequestMapping("/comment")
public class CommentController {

    @Autowired
    private CommentService commentService;

    /**
     * 添加评论
     */
    @RequestMapping(value = "/add",method = RequestMethod.POST)
    public Result addComment(HttpServletRequest request){
        String userId = request.getParameter("userId");
        String type = request.getParameter("type");
        String songId = request.getParameter("songId");
        String songListId = request.getParameter("songListId");
        String content = request.getParameter("content").trim();

        Comment comment = new Comment();
        comment.setUserId(Integer.parseInt(userId));
        comment.setType(new Byte(type));
        if(new Byte(type) == 0){
            comment.setSongId(Integer.parseInt(songId));
        }else{
            comment.setSongListId(Integer.parseInt(songListId));
        }
        comment.setContent(content);
        comment.setCreateTime(new Date());
        boolean flag = commentService.insert(comment);
        if(flag){
            return Result.success();
        }
        return Result.failure("评论失败");
    }

    /**
     * 修改评论
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateComment(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        String userId = request.getParameter("userId").trim();
        String type = request.getParameter("type").trim();
        String songId = request.getParameter("songId").trim();
        String songListId = request.getParameter("songListId").trim();
        String content = request.getParameter("content").trim();

        Comment comment = new Comment();
        comment.setId(Integer.parseInt(id));
        comment.setUserId(Integer.parseInt(userId));
        comment.setType(new Byte(type));
        if(songId != null && songId.equals("")){
            comment.setSongId(Integer.parseInt(songId));
        }
        if(songListId != null && songListId.equals("")){
            comment.setSongListId(Integer.parseInt(songListId));
        }
        comment.setContent(content);
        boolean flag = commentService.update(comment);
        if(flag){
            return Result.success();
        }
        return Result.failure("修改失败");
    }

    /**
     * 删除评论
     */
    @RequestMapping(value = "/delete",method = RequestMethod.GET)
    public Result deleteComment(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        boolean flag = commentService.delete(Integer.parseInt(id));
        if(flag){
            return Result.success();
        }
        return Result.failure("删除失败");
    }

    /**
     * 根据主键查询整个对象
     */
    @RequestMapping(value = "/selectByPrimaryKey",method = RequestMethod.GET)
    public Result selectByPrimaryKey(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        return Result.success(commentService.selectByPrimaryKey(Integer.parseInt(id)));
    }

    /**
     * 查询所有评论
     */
    @RequestMapping(value = "/allComment",method = RequestMethod.GET)
    public Result allComment(HttpServletRequest request){
        return Result.success(commentService.allComment());
    }

    /**
     * 查询某个歌曲下的所有评论
     */
    @RequestMapping(value = "/commentOfSongId",method = RequestMethod.GET)
    public Result commentOfSongId(HttpServletRequest request){
        String songId = request.getParameter("songId");
        return Result.success(commentService.commentOfSongId(Integer.parseInt(songId)));
    }

    /**
     * 查询某个歌单下的所有评论
     */
    @RequestMapping(value = "/commentOfSongListId",method = RequestMethod.GET)
    public Result commentOfSongListId(HttpServletRequest request){
        String songListId = request.getParameter("songListId");
        return Result.success(commentService.commentOfSongListId(Integer.parseInt(songListId)));
    }

    /**
     * 给某个评论点赞
     */
    @RequestMapping(value = "/like",method = RequestMethod.POST)
    public Result like(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        String up = request.getParameter("up").trim();

        Comment comment = new Comment();
        comment.setId(Integer.parseInt(id));
        comment.setUp(Integer.parseInt(up));
        boolean flag = commentService.update(comment);
        if(flag){
            return Result.success();
        }
        return Result.failure("点赞失败");
    }
}






















