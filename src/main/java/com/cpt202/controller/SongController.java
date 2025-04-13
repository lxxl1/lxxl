package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Song;
import com.cpt202.service.SongService;
import com.cpt202.service.SongCategoryService;
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
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 歌曲管理controller
 */
@RestController
@RequestMapping("/song")
public class SongController {

    @Autowired
    private SongService songService;

    @Autowired
    private SongCategoryService songCategoryService;

    @Autowired
    private OssUtil ossUtil; // 注入OssUtil

    /**
     * 添加歌曲，文件存储到OSS，并关联类别
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Result addSong(HttpServletRequest request, @RequestParam("file") MultipartFile mpFile, @RequestParam(name = "files", required = false) MultipartFile mvFile) {
        try {
            // 获取前端传来的参数
            String userId = request.getParameter("userId").trim();      // 用户id
            String singerId = request.getParameter("singerId").trim();  // 所属歌手id
            String name = request.getParameter("name").trim();          // 歌名
            String introduction = request.getParameter("introduction").trim();  // 简介
            String lyric = request.getParameter("lyric").trim();                // 歌词
            String pic = "/img/songPic/tubiao.jpg";                             // 默认图片
            String categoryIdsParam = request.getParameter("categoryIds");      // 类别ID列表 (例如 "1,2,3")

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
            song.setUserId(Integer.parseInt(userId));
            song.setSingerId(Integer.parseInt(singerId));
            song.setName(name);
            song.setIntroduction(introduction);
            song.setPic(pic);
            song.setLyric(lyric);
            song.setUrl(musicUrl);
            song.setStatus(0); // 设置初始状态为待审核

            // 如果有MV文件，上传MV文件到OSS
            if (mvFile != null && !mvFile.isEmpty()) {
                String mvUrl = ossUtil.uploadFile(mvFile, "mv/");
                if (mvUrl != null) {
                    song.setMvurl(mvUrl);
                } else {
                    System.out.println("Warning: MV file upload failed for song: " + name);
                }
            }

            // 1. 保存歌曲信息到数据库 (MyBatis会回填ID到song对象)
            boolean songInsertSuccess = songService.insert(song);
            if (!songInsertSuccess) {
                // 如果歌曲信息保存失败，可以考虑删除已上传的文件（可选）
                // ossUtil.deleteFile(musicUrl); // 需要实现删除逻辑
                // if (song.getMvurl() != null) ossUtil.deleteFile(song.getMvurl());
                return Result.failure("歌曲信息保存失败");
            }
            
            // 2. 获取新插入歌曲的ID
            Integer newSongId = song.getId(); // 确保SongMapper.xml中的insert语句配置了useGeneratedKeys="true" keyProperty="id"
            if (newSongId == null) {
                 // 如果ID未回填，可能需要额外查询或记录错误
                 System.err.println("Error: Failed to retrieve generated song ID after insert.");
                 return Result.failure("无法获取新歌曲ID，类别关联失败");
            }

            // 3. 处理类别关联
            if (categoryIdsParam != null && !categoryIdsParam.trim().isEmpty()) {
                try {
                    List<Integer> categoryIdList = Arrays.stream(categoryIdsParam.split(","))
                            .map(String::trim) // 去除可能的多余空格
                            .filter(s -> !s.isEmpty()) // 过滤空字符串
                            .map(Integer::parseInt)
                            .collect(Collectors.toList());

                    if (!categoryIdList.isEmpty()) {
                        // 4. 调用服务更新song_category表
                        boolean categoriesUpdateSuccess = songCategoryService.addSongCategories(newSongId, categoryIdList);
                        if (!categoriesUpdateSuccess) {
                            // 关联失败的处理，可以记录日志，或返回部分成功信息
                             System.out.println("Warning: Failed to associate categories for song ID: " + newSongId);
                             // 可以考虑是否要回滚歌曲的插入，但这会增加复杂性
                        }
                    } else {
                        System.out.println("Info: No valid category IDs provided after parsing for song ID: " + newSongId);
                    }
                } catch (NumberFormatException e) {
                    System.out.println("Warning: Invalid category IDs format for song ID: " + newSongId + ". Input: " + categoryIdsParam);
                    // 返回成功信息，但提示类别格式错误
                    return Result.success("歌曲添加成功，但类别ID格式无效或为空，未关联类别。URL: " + musicUrl);
                }
            } else {
                 System.out.println("Info: No category IDs provided for song ID: " + newSongId);
            }

            return Result.success("歌曲添加成功并已处理类别关联。URL: " + musicUrl);

        } catch (IOException e) {
            e.printStackTrace();
            return Result.failure("文件上传过程中发生IO错误: " + e.getMessage());
        } catch (NumberFormatException e) {
             // 区分是用户ID/歌手ID错误还是类别ID错误
             // 简单的判断，更精确的判断需要检查 e.getMessage()
             return Result.failure("用户ID、歌手ID或类别ID格式错误");
        } catch (Exception e) {
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

    /**
     * 根据用户ID查询歌曲
     */
    @RequestMapping(value = "/selectbyuser", method = RequestMethod.GET)
    public Result songOfUserId(HttpServletRequest request) {
        String userId = request.getParameter("userId");
        List<Song> songs = songService.songOfUserId(Integer.parseInt(userId));
        return Result.success(songs);
    }

    /**
     * 更新歌曲所属类别
     */
    @RequestMapping(value = "/updateCategories", method = RequestMethod.POST)
    public Result updateSongCategories(HttpServletRequest request) {
        try {
            String songId = request.getParameter("songId").trim();
            String categoryIds = request.getParameter("categoryIds").trim(); // 格式如 "1,2,3"
            
            List<Integer> categoryIdList = Arrays.stream(categoryIds.split(","))
                    .map(Integer::parseInt)
                    .collect(Collectors.toList());
                    
            boolean success = songCategoryService.addSongCategories(Integer.parseInt(songId), categoryIdList);
            
            if (success) {
                return Result.success();
            } else {
                return Result.failure("更新歌曲类别失败");
            }
        } catch (Exception e) {
            return Result.failure("处理请求时发生错误: " + e.getMessage());
        }
    }
    
    /**
     * 获取歌曲所属类别
     */
    @RequestMapping(value = "/categories", method = RequestMethod.GET)
    public Result getSongCategories(HttpServletRequest request) {
        try {
            String songId = request.getParameter("songId").trim();
            List<Integer> categoryIds = songCategoryService.getSongCategories(Integer.parseInt(songId));
            return Result.success(categoryIds);
        } catch (Exception e) {
            return Result.failure("获取歌曲类别失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取类别下的所有歌曲
     */
    @RequestMapping(value = "/categorySongs", method = RequestMethod.GET)
    public Result getCategorySongs(HttpServletRequest request) {
        try {
            String categoryId = request.getParameter("categoryId").trim();
            List<Integer> songIds = songCategoryService.getCategorySongs(Integer.parseInt(categoryId));
            
            // 如果需要返回完整的歌曲信息，可以通过songIds查询歌曲详情
            List<Song> songs = songIds.stream()
                    .map(id -> songService.selectByPrimaryKey(id))
                    .collect(Collectors.toList());
                    
            return Result.success(songs);
        } catch (Exception e) {
            return Result.failure("获取类别歌曲失败: " + e.getMessage());
        }
    }
}




















