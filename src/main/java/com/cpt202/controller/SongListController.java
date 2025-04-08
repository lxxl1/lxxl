package com.cpt202.controller;

import com.alibaba.fastjson.JSONObject;
import com.cpt202.common.Result;
import com.cpt202.domain.SongList;
import com.cpt202.service.SongListService;
import com.cpt202.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;

/**
 * 歌单控制类
 */
@RestController
@RequestMapping("/songList")
public class SongListController {

    @Autowired
    private SongListService songListService;

    /**
     * 添加歌单
     */
    @RequestMapping(value = "/add",method = RequestMethod.POST)
    public Result addSongList(HttpServletRequest request){
        String title = request.getParameter("title").trim();
        String pic = request.getParameter("pic").trim();
        String introduction = request.getParameter("introduction").trim();
        String style = request.getParameter("style").trim();

        SongList songList = new SongList();
        songList.setTitle(title);
        songList.setPic(pic);
        songList.setIntroduction(introduction);
        songList.setStyle(style);
        boolean flag = songListService.insert(songList);
        if(flag){
            return Result.success();
        }
        return Result.failure("添加失败");
    }

    /**
     * 修改歌单
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateSongList(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        String title = request.getParameter("title").trim();
        String introduction = request.getParameter("introduction").trim();
        String style = request.getParameter("style").trim();

        SongList songList = new SongList();
        songList.setId(Integer.parseInt(id));
        songList.setTitle(title);
        songList.setIntroduction(introduction);
        songList.setStyle(style);
        boolean flag = songListService.update(songList);
        if(flag){
            return Result.success();
        }
        return Result.failure("修改失败");
    }

    /**
     * 删除歌单
     */
    @RequestMapping(value = "/delete",method = RequestMethod.GET)
    public Result deleteSongList(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        boolean flag = songListService.delete(Integer.parseInt(id));
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
        return Result.success(songListService.selectByPrimaryKey(Integer.parseInt(id)));
    }

    /**
     * 查询所有歌单
     */
    @RequestMapping(value = "/allSongList",method = RequestMethod.GET)
    public Result allSongList(HttpServletRequest request){
        return Result.success(songListService.allSongList());
    }

    /**
     * 根据标题精确查询歌单列表
     */
    @RequestMapping(value = "/songListOfTitle",method = RequestMethod.GET)
    public Result songListOfTitle(HttpServletRequest request){
        String title = request.getParameter("title").trim();
        return Result.success(songListService.songListOfTitle(title));
    }

    /**
     * 根据标题模糊查询歌单列表
     */
    @RequestMapping(value = "/likeTitle",method = RequestMethod.GET)
    public Result likeTitle(HttpServletRequest request){
        String title = request.getParameter("title").trim();
        return Result.success(songListService.likeTitle("%"+title+"%"));
    }

    /**
     * 根据风格模糊查询歌单列表
     */
    @RequestMapping(value = "/likeStyle",method = RequestMethod.GET)
    public Result likeStyle(HttpServletRequest request){
        String style = request.getParameter("style").trim();
        return Result.success(songListService.likeStyle("%"+style+"%"));
    }

    /**
     * 更新歌单图片
     */
    @RequestMapping(value = "/updateSongListPic",method = RequestMethod.POST)
    public Result updateSongListPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis()+avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir")+System.getProperty("file.separator")+"img"
                +System.getProperty("file.separator")+"songListPic";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if(!file1.exists()){
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath+System.getProperty("file.separator")+fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/img/songListPic/"+fileName;
        try {
            avatorFile.transferTo(dest);
            SongList songList = new SongList();
            songList.setId(id);
            songList.setPic(storeAvatorPath);
            boolean flag = songListService.update(songList);
            if(flag){
                return Result.success(storeAvatorPath);
            }
            return Result.failure("上传失败");
        } catch (IOException e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }
}






















