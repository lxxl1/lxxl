package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Song;
import com.cpt202.service.SongService;
import com.cpt202.utils.Consts;
import com.cpt202.utils.OssUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;


import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 * 歌曲管理controller
 */
@RestController
@RequestMapping("/song")
public class SongController {

    @Autowired
    private SongService songService;

    @Autowired
    private OssUtil ossUtil; // 注入OssUtil

    /**
     * 添加歌曲，文件存储到OSS
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Result addSong(HttpServletRequest request, @RequestParam("file") MultipartFile mpFile, @RequestParam(name = "files", required = false) MultipartFile mvFile) {
        try {
            // 获取前端传来的参数
            String singerId = request.getParameter("singerId").trim();  // 所属歌手id
            String name = request.getParameter("name").trim();          // 歌名
            String introduction = request.getParameter("introduction").trim();  // 简介
            String lyric = request.getParameter("lyric").trim();     // 歌词
            String pic = "/img/songPic/tubiao.jpg";                  // 默认图片

            // 检查音乐文件是否为空
            if (mpFile == null || mpFile.isEmpty()) {
                return Result.failure("歌曲文件不能为空");
            }

            // 上传音乐文件到OSS
            String musicUrl = ossUtil.uploadFile(mpFile, "song/");
            if (musicUrl == null) {
                return Result.failure("歌曲文件上传失败");
            }

            // 创建歌曲对象
            Song song = new Song();
            song.setSingerId(Integer.parseInt(singerId));
            song.setName(name);
            song.setIntroduction(introduction);
            song.setPic(pic);
            song.setLyric(lyric);
            song.setUrl(musicUrl);
            song.setStatus(0);  // 设置初始状态为待审核

            // 如果有MV文件，上传MV文件到OSS
            if (mvFile != null && !mvFile.isEmpty()) {
                String mvUrl = ossUtil.uploadFile(mvFile, "mv/");
                if (mvUrl != null) {
                    song.setMvurl(mvUrl);
                } else {
                    // 可选：如果MV上传失败，可以记录日志或返回部分成功信息
                    System.out.println("Warning: MV file upload failed for song: " + name);
                }
            }

            // 保存歌曲信息到数据库
            boolean flag = songService.insert(song);
            if (flag) {
                return Result.success("歌曲添加成功，URL: " + musicUrl);
            }
            return Result.failure("歌曲信息保存失败");

        } catch (IOException e) {
            // 记录日志
            e.printStackTrace();
            return Result.failure("文件上传过程中发生IO错误: " + e.getMessage());
        } catch (NumberFormatException e) {
            return Result.failure("歌手ID格式错误");
        } catch (Exception e) {
            // 记录日志
            e.printStackTrace();
            return Result.failure("添加歌曲时发生未知错误: " + e.getMessage());
        }
    }

    /**
     * 根据歌手id查询歌曲
     */
    @RequestMapping(value = "/singer/detail",method = RequestMethod.GET)
    public Result songOfSingerId(HttpServletRequest request){
        String singerId = request.getParameter("singerId");
        return Result.success(songService.songOfSingerId(Integer.parseInt(singerId)));
    }

    /**
     * 修改歌曲
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateSong(HttpServletRequest request){
        String id = request.getParameter("id").trim();          //主键
        String name = request.getParameter("name").trim();      //歌名
        String introduction = request.getParameter("introduction").trim();//专辑
        String lyric = request.getParameter("lyric").trim();    //歌词

        //保存到歌手的对象中
        Song song = new Song();
        song.setId(Integer.parseInt(id));
        song.setName(name);
        song.setIntroduction(introduction);
        song.setLyric(lyric);
        boolean flag = songService.update(song);
        if(flag){   //保存成功
            return Result.success();
        }
        return Result.failure("修改失败");
    }

    /**
     * 删除歌曲
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Result deleteSinger(HttpServletRequest request){
        String id = request.getParameter("id").trim();          //主键
        boolean flag = songService.delete(Integer.parseInt(id));
        return flag ? Result.success() : Result.failure("删除失败");
    }

    /**
     * 更新歌曲图片
     */
    @RequestMapping(value = "/updateSongPic",method = RequestMethod.POST)
    public Result updateSongPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis()+avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir")+System.getProperty("file.separator")+"img"
                +System.getProperty("file.separator")+"songPic";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if(!file1.exists()){
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath+System.getProperty("file.separator")+fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/img/songPic/"+fileName;
        try {
            avatorFile.transferTo(dest);
            Song song = new Song();
            song.setId(id);
            song.setPic(storeAvatorPath);
            boolean flag = songService.update(song);
            if(flag){
                return Result.success(storeAvatorPath);
            }
            return Result.failure("上传失败");
        } catch (IOException e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }

    /**
     * 更新歌曲
     */
    @RequestMapping(value = "/updateSongUrl",method = RequestMethod.POST)
    public Result updateSongUrl(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis()+avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir")+System.getProperty("file.separator")+"song";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if(!file1.exists()){
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath+System.getProperty("file.separator")+fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/song/"+fileName;
        try {
            avatorFile.transferTo(dest);
            Song song = new Song();
            song.setId(id);
            song.setUrl(storeAvatorPath);
            boolean flag = songService.update(song);
            if(flag){
                return Result.success(storeAvatorPath);
            }
            return Result.failure("上传失败");
        } catch (IOException e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }

    /**
     * 更新歌曲MV
     */
    @RequestMapping(value = "/updateMVUrl",method = RequestMethod.POST)
    public Result updateMVUrl(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis()+avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir")+System.getProperty("file.separator")+"mv";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if(!file1.exists()){
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath+System.getProperty("file.separator")+fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/mv/"+fileName;
        try {
            avatorFile.transferTo(dest);
            Song song = new Song();
            song.setId(id);
            song.setMvurl(storeAvatorPath);
            boolean flag = songService.update(song);
            if(flag){
                return Result.success(storeAvatorPath);
            }
            return Result.failure("上传失败");
        } catch (IOException e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }

    /**
     * 根据歌曲id查询歌曲对象
     */
    @RequestMapping(value = "/detail",method = RequestMethod.GET)
    public Result detail(HttpServletRequest request){
        String songId = request.getParameter("songId");
        return Result.success(songService.selectByPrimaryKey(Integer.parseInt(songId)));
    }

    /**
     * 根据歌曲id增加歌曲播放次数
     */
    @RequestMapping(value = "/addNums",method = RequestMethod.GET)
    public Result addNums(HttpServletRequest request){
        String songId = request.getParameter("songId");
        return Result.success(songService.addNums(Integer.parseInt(songId)));
    }

    /**
     * 根据歌手名字精确查询歌曲
     */
    @RequestMapping(value = "/songOfSongName",method = RequestMethod.GET)
    public Result songOfSongName(HttpServletRequest request){
        String songName = request.getParameter("songName");
        return Result.success(songService.songOfName(songName));
    }

    /**
     * 根据歌手名字模糊查询歌曲
     */
    @RequestMapping(value = "/likeSongOfName",method = RequestMethod.GET)
    public Result likeSongOfName(HttpServletRequest request){
        String songName = request.getParameter("songName");
        return Result.success(songService.likeSongOfName(songName));
    }

    /**
     * 查询所有歌曲
     */
    @RequestMapping(value = "/allSong",method = RequestMethod.GET)
    public Result allSong(HttpServletRequest request){
        return Result.success(songService.allSong());
    }

    /**
     * 查询所有歌曲
     */
    @RequestMapping(value = "/topSong",method = RequestMethod.GET)
    public Result topSong(HttpServletRequest request){
        return Result.success(songService.topSong());
    }

    /**
     * 审核歌曲
     */
    @RequestMapping(value = "/audit", method = RequestMethod.POST)
    public Result auditSong(HttpServletRequest request) {
        String songId = request.getParameter("songId").trim();
        String status = request.getParameter("status").trim();

        // 参数验证
        if (!status.equals("1") && !status.equals("2")) {
            return Result.failure("无效的审核状态");
        }

        boolean flag = songService.updateStatus(Integer.parseInt(songId), Integer.parseInt(status));
        if (flag) {
            return Result.success();
        }
        return Result.failure("审核失败");
    }

    /**
     * 获取待审核歌曲列表
     */
    @RequestMapping(value = "/pending", method = RequestMethod.GET)
    public Result getPendingSongs(HttpServletRequest request) {
        List<Song> songs = songService.getPendingSongs();
        if (songs != null) {
            return Result.success(songs);
        }
        return Result.failure("查询失败");
    }

    /**
     * 获取已审核歌曲列表
     */
    @RequestMapping(value = "/audited", method = RequestMethod.GET)
    public Result getAuditedSongs(HttpServletRequest request) {
        String status = request.getParameter("status").trim();

        // 参数验证
        if (!status.equals("1") && !status.equals("2")) {
            return Result.failure("无效的审核状态");
        }

        List<Song> songs = songService.getAuditedSongs(Integer.parseInt(status));
        if (songs != null) {
            return Result.success(songs);
        }
        return Result.failure("查询失败");
    }
}




















