package com.cpt202.controller;

import com.cpt202.common.Result;
import com.cpt202.domain.Song;
import com.cpt202.dto.SongDetailDTO;
import com.cpt202.service.SongService;
import com.cpt202.service.SongCategoryService;
import com.cpt202.service.TagService;
import com.cpt202.utils.Consts;
import com.cpt202.utils.OssUtil;
import com.cpt202.dto.SongDTO;
import com.cpt202.dto.UpdateSongCategoryRequest;
import com.github.pagehelper.PageInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 歌曲管理controller
 */
@RestController
@RequestMapping("/song")
@Slf4j
public class SongController {

    @Autowired
    private SongService songService;

    @Autowired
    private SongCategoryService songCategoryService;

    @Autowired
    private OssUtil ossUtil; // 注入OssUtil

    @Autowired
    private TagService tagService; // Inject TagService

    /**
     * 添加歌曲，文件存储到OSS，并关联类别、标签、歌手
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Result addSong(HttpServletRequest request,
                          @RequestParam("file") MultipartFile mpFile,
                          @RequestParam(name = "files", required = false) MultipartFile mvFile) {
        try {
            // 获取前端传来的参数
            String userId = request.getParameter("userId").trim();
            // String singerId = request.getParameter("singerId").trim(); // REMOVED
            // Expecting comma-separated string e.g., "1,2,3"
            String singerIdsParam = request.getParameter("singerIds");
            String name = request.getParameter("name").trim();
            String introduction = request.getParameter("introduction").trim();
            String lyric = request.getParameter("lyric").trim();
            // Consider making this configurable or optional
            String pic = "/img/songPic/tubiao.jpg";
            // 类别 IDs
            String categoryIdsParam = request.getParameter("categoryIds");
            // 标签 IDs
            String tagIdsParam = request.getParameter("tagIds");

            // 检查音乐文件是否为空
            if (mpFile == null || mpFile.isEmpty()) {
                return Result.failure("歌曲文件不能为空");
            }

            // 上传音乐文件到OSS
            String musicUrl = ossUtil.uploadFile(mpFile, "song/");
            if (musicUrl == null) {
                return Result.failure("歌曲文件上传失败");
            }

            // 如果有MV文件，上传MV文件到OSS
            String mvUrl = null;
            if (mvFile != null && !mvFile.isEmpty()) {
                mvUrl = ossUtil.uploadFile(mvFile, "mv/");
                if (mvUrl == null) {
                    log.warn("MV file upload failed for song: {}", name);
                }
            }

            // 解析歌手ID列表
            List<Integer> singerIdList = Collections.emptyList();
            // Use StringUtils for better null/empty check
            if (StringUtils.hasText(singerIdsParam)) {
                 try {
                     singerIdList = Arrays.stream(singerIdsParam.split(","))
                             .map(String::trim)
                             .filter(s -> !s.isEmpty())
                             .map(Integer::parseInt)
                             .distinct()
                             .collect(Collectors.toList());
                 } catch (NumberFormatException e) {
                     log.warn("Invalid singer IDs format: {}. Input: {}", e.getMessage(), singerIdsParam);
                     return Result.failure("歌手ID格式错误");
                 }
            }
             if (CollectionUtils.isEmpty(singerIdList)) {
                 log.warn("No valid singer IDs provided for song: {}", name);
                 // Decide if this is an error or allowed
                 // return Result.failure("必须至少关联一个歌手");
             }

            // 创建歌曲对象 (removed singerId)
            Song song = new Song();
            song.setUserId(Integer.parseInt(userId));
            // song.setSingerId(Integer.parseInt(singerId)); // REMOVED
            song.setName(name);
            song.setIntroduction(introduction);
            song.setPic(pic);
            song.setLyric(lyric);
            song.setUrl(musicUrl);
            // 设置初始状态为待审核
            song.setStatus(0);

            // 1. 保存歌曲信息和歌手关联 (Call updated service method)
            boolean songInsertSuccess = songService.insert(song, singerIdList);
            if (!songInsertSuccess) {
                // Song insertion itself might have failed, or association failed but was logged
                // Check service impl logic for exact failure condition
                return Result.failure("歌曲信息保存失败或歌手关联失败");
            }

            // ID should be populated by service
            Integer newSongId = song.getId();
            if (newSongId == null) {
                 log.error("Error: Failed to retrieve generated song ID after insert service call for song: {}", name);
                 return Result.failure("无法获取新歌曲ID，后续关联失败");
            }
            log.info("Successfully processed song insertion '{}' with ID: {}", name, newSongId);

            // 2. 处理类别关联
            if (StringUtils.hasText(categoryIdsParam)) {
                try {
                    List<Integer> categoryIdList = Arrays.stream(categoryIdsParam.split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::parseInt)
                            .collect(Collectors.toList());
                    if (!CollectionUtils.isEmpty(categoryIdList)) {
                        boolean categoriesUpdateSuccess = songCategoryService.addSongCategories(newSongId, categoryIdList);
                        if (!categoriesUpdateSuccess) {
                            log.warn("Failed to associate categories for song ID: {}", newSongId);
                        }
                    }
                } catch (NumberFormatException e) {
                    log.warn("Invalid category IDs format for song ID: {}. Input: {}", newSongId, categoryIdsParam, e);
                    // Don't fail the whole request, just log the warning
                }
            }

            // 3. 处理标签关联
             if (StringUtils.hasText(tagIdsParam)) {
                 try {
                     List<Integer> tagIdList = Arrays.stream(tagIdsParam.split(","))
                             .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::parseInt).distinct()
                             .collect(Collectors.toList());
                     if (!CollectionUtils.isEmpty(tagIdList)) {
                         boolean tagsUpdateSuccess = tagService.addSongTags(newSongId, tagIdList);
                         if (!tagsUpdateSuccess) {
                             log.warn("Failed to associate tags for song ID: {}", newSongId);
                         } else {
                              log.info("Successfully associated tags for song ID: {}", newSongId);
                         }
                     }
                 } catch (NumberFormatException e) {
                     log.warn("Invalid tag IDs format for song ID: {}. Input: {}", newSongId, tagIdsParam, e);
                     // Don't fail the whole request, just log the warning
                 }
             } else {
                 // Ensure no tags if none provided
                 tagService.addSongTags(newSongId, Collections.emptyList());
             }

            return Result.success("歌曲添加成功并已处理关联。URL: " + musicUrl);

        } catch (NumberFormatException e) {
             log.error("Error parsing number in addSong: {}", e.getMessage());
             // Updated error message
             return Result.failure("用户ID、类别ID或标签ID格式错误");
        } catch (IOException e) {
            log.error("IO Error during file upload in addSong", e);
            return Result.failure("文件上传过程中发生IO错误: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unknown error in addSong", e);
            return Result.failure("添加歌曲时发生未知错误: " + e.getMessage());
        }
    }

    /**
     * 根据歌手id查询歌曲列表 (Call updated service method)
     */
    @RequestMapping(value = "/singer/detail",method = RequestMethod.GET)
    public Result getSongsBySingerId(HttpServletRequest request){
        String singerIdStr = request.getParameter("singerId");
        if (!StringUtils.hasText(singerIdStr)) {
            return Result.failure("歌手ID不能为空");
        }
        try {
             Integer singerId = Integer.parseInt(singerIdStr.trim());
             // Call the new service method
             List<Song> songs = songService.getSongsBySingerId(singerId);
             return Result.success(songs);
        } catch (NumberFormatException e) {
             log.error("Invalid singerId format: {}", singerIdStr);
             return Result.failure("歌手ID格式错误");
        } catch (Exception e) {
            log.error("Error fetching songs by singer ID: {}", singerIdStr, e);
            return Result.failure("查询歌手歌曲失败");
        }
    }

    /**
     * 修改歌曲信息和歌手关联
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateSong(HttpServletRequest request){
         try {
             //主键
            String idStr = request.getParameter("id").trim();
             //歌名
            String name = request.getParameter("name").trim();
             //专辑
            String introduction = request.getParameter("introduction").trim();
             //歌词
            String lyric = request.getParameter("lyric").trim();
             // Expecting comma-separated string
            String singerIdsParam = request.getParameter("singerIds");

            Integer songId = Integer.parseInt(idStr);

            // 解析歌手ID列表
            List<Integer> singerIdList = Collections.emptyList();
             if (StringUtils.hasText(singerIdsParam)) {
                 singerIdList = Arrays.stream(singerIdsParam.split(","))
                         .map(String::trim)
                         .filter(s -> !s.isEmpty())
                         .map(Integer::parseInt)
                         .distinct()
                         .collect(Collectors.toList());
            }
             // Decide if empty singers list is allowed for update
             // if (CollectionUtils.isEmpty(singerIdList)) {
             //     return Result.failure("必须至少关联一个歌手");
             // }

            //保存到歌曲的对象中 (ID is essential)
            Song song = new Song();
            song.setId(songId);
            song.setName(name);
            song.setIntroduction(introduction);
            song.setLyric(lyric);
            // Note: pic, url, mvurl, status etc. are not updated here. Add if needed.

             // Call updated service method
            boolean flag = songService.update(song, singerIdList);
            if(flag){   //保存成功
                return Result.success("歌曲信息及歌手关联更新成功");
            }
            // Service layer should throw exception on error or return false meaningfully
            return Result.failure("修改失败");
        } catch (NumberFormatException e) {
            log.error("Error parsing number in updateSong: {}", e.getMessage());
            return Result.failure("歌曲ID或歌手ID格式错误");
        } catch (Exception e) {
            log.error("Error updating song: {}", e.getMessage(), e);
            return Result.failure("更新歌曲时发生错误: " + e.getMessage());
        }
    }

    /**
     * 删除歌曲
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Result deleteSong(HttpServletRequest request){ // Renamed method for clarity
        String idStr = request.getParameter("id");
         if (!StringUtils.hasText(idStr)) {
            return Result.failure("歌曲ID不能为空");
        }
        try {
            Integer id = Integer.parseInt(idStr.trim());
            boolean flag = songService.delete(id);
            return flag ? Result.success("删除成功") : Result.failure("删除失败或歌曲不存在");
        } catch (NumberFormatException e) {
            log.error("Invalid songId format for delete: {}", idStr);
            return Result.failure("歌曲ID格式错误");
        } catch (Exception e) {
            log.error("Error deleting song ID: {}", idStr, e);
            return Result.failure("删除歌曲时发生错误");
        }
    }

    /**
     * 更新歌曲图片 (Pass null for singerIds in update)
     */
    @RequestMapping(value = "/updateSongPic",method = RequestMethod.POST)
    public Result updateSongPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        String storeAvatorPath = "";
        try {
            // Use OSS Util
            storeAvatorPath = ossUtil.uploadFile(avatorFile, "img/songPic/");
            if(!StringUtils.hasText(storeAvatorPath)){
                 return Result.failure("图片上传失败");
            }
        } catch (IOException e) {
             log.error("IO Exception during song pic upload for id {}: {}", id, e.getMessage());
             return Result.failure("图片上传IO异常");
        }

        Song song = new Song();
        song.setId(id);
        song.setPic(storeAvatorPath);
        // Pass null or empty list for singerIds as we only update pic
        boolean flag = songService.update(song, Collections.emptyList());
        if(flag){
            // Return only success message for consistency
            return Result.success("上传成功");
        }
        return Result.failure("上传失败");
    }

    /**
     * 更新歌曲文件 (Pass null for singerIds in update)
     */
    @RequestMapping(value = "/updateSongUrl",method = RequestMethod.POST)
    public Result updateSongUrl(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
         if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        String storeAvatorPath = "";
        try {
            // Use OSS Util
            storeAvatorPath = ossUtil.uploadFile(avatorFile, "song/");
             if(!StringUtils.hasText(storeAvatorPath)){
                 return Result.failure("歌曲文件上传失败");
            }
        } catch (IOException e) {
             log.error("IO Exception during song file upload for id {}: {}", id, e.getMessage());
             return Result.failure("歌曲文件上传IO异常");
        }

        Song song = new Song();
        song.setId(id);
        song.setUrl(storeAvatorPath);
         // Pass null or empty list for singerIds
        boolean flag = songService.update(song, Collections.emptyList());
        if(flag){
             // Return only success message for consistency
            return Result.success("上传成功");
        }
        return Result.failure("上传失败");
    }

    /**
     * 更新歌曲MV文件 (Pass null for singerIds in update)
     */
    @RequestMapping(value = "/updateMVUrl",method = RequestMethod.POST)
    public Result updateMVUrl(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
         if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        String storeAvatorPath = "";
        try {
            // Use OSS Util
            storeAvatorPath = ossUtil.uploadFile(avatorFile, "mv/");
              if(!StringUtils.hasText(storeAvatorPath)){
                 return Result.failure("MV文件上传失败");
            }
        } catch (IOException e) {
             log.error("IO Exception during MV file upload for id {}: {}", id, e.getMessage());
             return Result.failure("MV文件上传IO异常");
        }
        Song song = new Song();
        song.setId(id);
        // song.setMvurl(storeAvatorPath); // REMOVED as mvurl field is deleted
          // Pass null or empty list for singerIds as we only updated a file path (now removed)
         boolean flag = songService.update(song, Collections.emptyList());
        if(flag){
             // Return only success message for consistency
            return Result.success("上传成功");
        }
        return Result.failure("上传失败");
    }

    /**
     * 返回指定歌曲ID的详细信息 (包含歌手列表)
     */
    @RequestMapping(value = "/detail",method = RequestMethod.GET)
    public Result detail(HttpServletRequest request){
        String songIdStr = request.getParameter("songId");
         if (!StringUtils.hasText(songIdStr)) {
            return Result.failure("歌曲ID不能为空");
        }
        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            // Call the new service method returning DTO
            SongDetailDTO songDetail = songService.selectDetailByPrimaryKey(songId);
            if (songDetail != null) {
                 return Result.success(songDetail);
            } else {
                 return Result.failure("未找到指定歌曲");
            }
        } catch (NumberFormatException e) {
            log.error("Invalid songId format for detail: {}", songIdStr);
            return Result.failure("歌曲ID格式错误");
        } catch (Exception e) {
            log.error("Error fetching song detail for ID: {}", songIdStr, e);
            return Result.failure("获取歌曲详情失败");
        }
    }

    /**
     * 根据歌名精确查询歌曲 (No change needed, returns basic info)
     */
    @RequestMapping(value = "/songOfSongName",method = RequestMethod.GET)
    public Result songOfSongName(HttpServletRequest request){
        String songName = request.getParameter("songName");
        if (!StringUtils.hasText(songName)) {
            return Result.failure("歌曲名称不能为空");
        }
        // Service method may need review depending on desired output (basic or DTO)
        return Result.success(songService.songOfName(songName.trim()));
    }

    /**
     * 根据歌名模糊查询歌曲 (No change needed, returns basic info)
     */
    @RequestMapping(value = "/likeSongOfName",method = RequestMethod.GET)
    public Result likeSongOfName(HttpServletRequest request){
        String songName = request.getParameter("songName");
         if (!StringUtils.hasText(songName)) {
            // Return empty list or specific result for empty query?
            return Result.success(Collections.emptyList());
        }
        // Service method may need review
        return Result.success(songService.likeSongOfName(songName.trim()));
    }

    /**
     * 查询所有歌曲 (No change needed, returns basic info)
     */
    @RequestMapping(value = "/allSong",method = RequestMethod.GET)
    public Result allSong(HttpServletRequest request){
        // Service method may need review
        return Result.success(songService.allSong());
    }

    /**
     * 查询播放次数排前列的歌曲 (No change needed, returns basic info)
     */
    @RequestMapping(value = "/topSong",method = RequestMethod.GET)
    public Result topSong(HttpServletRequest request){
         // Service method may need review
        return Result.success(songService.topSong());
    }

    /**
     * 审核歌曲 (No change needed)
     */
    @RequestMapping(value = "/audit", method = RequestMethod.POST)
    public Result auditSong(HttpServletRequest request) {
        String songIdStr = request.getParameter("songId");
        String statusStr = request.getParameter("status");

        if (!StringUtils.hasText(songIdStr) || !StringUtils.hasText(statusStr)) {
            return Result.failure("歌曲ID和审核状态不能为空");
        }

        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            Integer status = Integer.parseInt(statusStr.trim());

            // Validate status (e.g., must be 1 or 2 for approval/rejection)
            if (status != 1 && status != 2) {
                return Result.failure("无效的审核状态，必须是 1 (通过) 或 2 (不通过)");
            }

            boolean success = songService.updateStatus(songId, status);
            if (success) {
                return Result.success("歌曲审核状态更新成功");
            } else {
                return Result.failure("歌曲审核状态更新失败或歌曲不存在");
            }
        } catch (NumberFormatException e) {
            log.error("Invalid songId or status format during audit. SongId: {}, Status: {}", songIdStr, statusStr);
            return Result.failure("歌曲ID或状态格式错误");
        } catch (Exception e) {
            log.error("Error auditing song ID: {}", songIdStr, e);
            return Result.failure("审核歌曲时发生错误");
        }
    }

    /**
     * 获取待审核歌曲列表 (No change needed)
     */
    @RequestMapping(value = "/pending", method = RequestMethod.GET)
    public Result getPendingSongs(HttpServletRequest request) {
         try {
             // Service method may need review
             return Result.success(songService.getPendingSongs());
         } catch (Exception e) {
             log.error("Error fetching pending songs", e);
             return Result.failure("获取待审核歌曲失败");
         }
    }

    /**
     * 获取已审核歌曲列表 (No change needed)
     */
    @RequestMapping(value = "/audited", method = RequestMethod.GET)
    public Result getAuditedSongs(HttpServletRequest request) {
        String statusStr = request.getParameter("status");
         if (!StringUtils.hasText(statusStr)) {
            return Result.failure("审核状态参数不能为空");
        }
        try {
            Integer status = Integer.parseInt(statusStr.trim());
             // Optionally validate status (e.g., should be 1 or 2)
             if (status != 1 && status != 2) {
                 return Result.failure("无效的审核状态");
             }
              // Service method may need review
             return Result.success(songService.getAuditedSongs(status));
        } catch (NumberFormatException e) {
             log.error("Invalid status format for getAuditedSongs: {}", statusStr);
             return Result.failure("审核状态格式错误");
        } catch (Exception e) {
             log.error("Error fetching audited songs with status: {}", statusStr, e);
             return Result.failure("获取已审核歌曲失败");
        }
    }

    /**
     * 根据用户id查询歌曲 (分页) - 基础版本
     */
    @GetMapping("/selectbyuser") // Kept original endpoint for basic fetch if needed
    public Result songOfUserIdBasic(@RequestParam Integer userId,
                                    @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
                                    @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {
        // Simplified original logic without filters
        if (userId == null) {
            return Result.failure("User ID cannot be null");
        }
        if (pageNum <= 0 || pageSize <= 0) {
             return Result.failure("Page number and page size must be positive.");
        }
        try {
            PageInfo<SongDTO> pageInfo = songService.songOfUserId(userId, pageNum, pageSize); // Assumes original service method still exists
            // Handle empty result properly 
            if (pageInfo == null || CollectionUtils.isEmpty(pageInfo.getList())) {
                 PageInfo<SongDTO> emptyPageInfo = new PageInfo<>(Collections.emptyList());
                 emptyPageInfo.setPageNum(pageNum);
                 emptyPageInfo.setPageSize(pageSize);
                 emptyPageInfo.setTotal(0);
                 emptyPageInfo.setPages(0);
                 // Return empty PageInfo object directly
                 return Result.success(emptyPageInfo); 
            }
            return Result.success(pageInfo);
        } catch (Exception e) {
            log.error("Error fetching basic songs for user ID: {} on page: {}, size: {}", userId, pageNum, pageSize, e);
            return Result.failure("Error fetching songs: " + e.getMessage());
        }
    }

    /**
     * 根据用户ID、分类、状态、搜索词查询歌曲 (分页) - 新增接口
     */
    @GetMapping("/user/search")
    public Result searchUserSongs(
            @RequestParam Integer userId,
            @RequestParam(value = "categoryId", required = false) Integer categoryId, // Optional
            @RequestParam(value = "status", required = false) Integer status,         // Optional
            @RequestParam(value = "searchTerm", required = false) String searchTerm,   // Optional
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {

        if (userId == null) {
            return Result.failure("User ID cannot be null");
        }
        if (pageNum <= 0 || pageSize <= 0) {
             return Result.failure("Page number and page size must be positive.");
        }

        try {
            // Call the new service method
            PageInfo<SongDTO> pageInfo = songService.searchUserSongs(
                    userId, categoryId, status, searchTerm, pageNum, pageSize
            );

            // Handle empty results consistently
            if (pageInfo == null || CollectionUtils.isEmpty(pageInfo.getList())) {
                 PageInfo<SongDTO> emptyPageInfo = new PageInfo<>(Collections.emptyList());
                 emptyPageInfo.setPageNum(pageNum);
                 emptyPageInfo.setPageSize(pageSize);
                 // pageInfo might still contain total count even if list is empty for this page
                 emptyPageInfo.setTotal(pageInfo != null ? pageInfo.getTotal() : 0); 
                 emptyPageInfo.setPages(pageInfo != null ? pageInfo.getPages() : 0);
                 return Result.success(emptyPageInfo);
            }
            
            log.info("Searched songs for user {}, page {}, size {}, category {}, status {}, term '{}'. Found: {} total.", 
                    userId, pageNum, pageSize, categoryId, status, searchTerm, pageInfo.getTotal());
            return Result.success(pageInfo);

        } catch (Exception e) {
            log.error("Error searching songs for user ID: {} with params: [cat={}, status={}, term='{}', page={}, size={}]", 
                      userId, categoryId, status, searchTerm, pageNum, pageSize, e);
            return Result.failure("Error searching songs: " + e.getMessage());
        }
    }

    /**
     * 更新歌曲的类别关联 (No change needed)
     */
    @RequestMapping(value = "/updateCategories", method = RequestMethod.POST)
    public Result updateSongCategories(HttpServletRequest request) {
         String songIdStr = request.getParameter("songId");
         // Expecting comma-separated string
         String categoryIdsParam = request.getParameter("categoryIds");

         if (!StringUtils.hasText(songIdStr)) {
             return Result.failure("歌曲ID不能为空");
         }

         try {
             Integer songId = Integer.parseInt(songIdStr.trim());
             List<Integer> categoryIdList = Collections.emptyList();

             if (StringUtils.hasText(categoryIdsParam)) {
                 categoryIdList = Arrays.stream(categoryIdsParam.split(","))
                         .map(String::trim)
                         .filter(s -> !s.isEmpty())
                         .map(Integer::parseInt)
                         .collect(Collectors.toList());
             }
             // Note: Allowing empty list to remove all categories

             boolean success = songService.updateSongCategories(songId, categoryIdList);
             if (success) {
                 return Result.success("歌曲类别关联更新成功");
             } else {
                 // Service layer should throw exception on error
                 return Result.failure("更新歌曲类别关联失败");
             }
         } catch (NumberFormatException e) {
              log.error("Invalid songId or categoryIds format for updateCategories. SongId: {}, CategoryIds: {}", songIdStr, categoryIdsParam);
              return Result.failure("歌曲ID或类别ID格式错误");
         } catch (Exception e) {
              log.error("Error updating categories for song ID: {}", songIdStr, e);
              return Result.failure("更新歌曲类别关联时发生错误");
         }
    }

    /**
     * 获取指定歌曲的类别ID (No change needed)
     */
    @RequestMapping(value = "/categories", method = RequestMethod.GET)
    public Result getSongCategories(HttpServletRequest request) {
        String songIdStr = request.getParameter("songId");
         if (!StringUtils.hasText(songIdStr)) {
            return Result.failure("歌曲ID不能为空");
        }
        try {
             Integer songId = Integer.parseInt(songIdStr.trim());
             // Use the correct method name found in SongCategoryService
             List<Integer> categoryIds = songCategoryService.getSongCategories(songId); 
             return Result.success(categoryIds);
             // log.warn("Endpoint /categories called, but the method to get category IDs by song ID in SongCategoryService needs correction.");
             // return Result.failure("获取歌曲类别功能暂时不可用，请联系管理员"); 
         } catch (NumberFormatException e) {
             log.error("Invalid songId format for getSongCategories: {}", songIdStr);
             return Result.failure("歌曲ID格式错误");
         } catch (Exception e) {
             log.error("Error fetching categories for song ID: {}", songIdStr, e);
             return Result.failure("获取歌曲类别失败");
         }
    }

    /**
     * 根据类别ID获取歌曲列表 (No change needed, but implementation was placeholder)
     */
    @RequestMapping(value = "/categorySongs", method = RequestMethod.GET)
    public Result getCategorySongs(HttpServletRequest request) {
         String categoryIdStr = request.getParameter("categoryId");
         if (!StringUtils.hasText(categoryIdStr)) {
             return Result.failure("类别ID不能为空");
         }
         try {
             Integer categoryId = Integer.parseInt(categoryIdStr.trim());
             // Assuming a method exists to get songs by category, e.g., in SongService or a dedicated CategoryService
             // List<Song> songs = songService.getSongsByCategoryId(categoryId);
             // return Result.success(songs);
             // Placeholder - Implement this logic based on your service structure
             log.warn("Endpoint /categorySongs is not fully implemented yet.");
             return Result.failure("按类别获取歌曲的功能尚未完全实现");
         } catch (NumberFormatException e) {
             log.error("Invalid categoryId format for getCategorySongs: {}", categoryIdStr);
             return Result.failure("类别ID格式错误");
         } catch (Exception e) {
             log.error("Error fetching songs for category ID: {}", categoryIdStr, e);
             return Result.failure("获取类别歌曲失败");
         }
    }

    /**
     * 根据用户ID和类别ID查询歌曲列表 (Returns DTO with category/singer info)
     */
    @GetMapping("/user/{userId}/category/{categoryId}")
    public Result getUserSongsByCategory(@PathVariable Integer userId, @PathVariable Integer categoryId) {
        try {
            // Service method now returns DTO including singer info
            List<SongDTO> songs = songService.getUserSongsByCategory(userId, categoryId);
            return Result.success(songs);
        } catch (Exception e) {
            log.error("Error fetching songs for user {} and category {}: {}", userId, categoryId, e.getMessage(), e);
            return Result.failure("获取用户分类歌曲失败");
        }
    }

    /**
     * 供管理员更新歌曲类别 (No change needed)
     */
    @PutMapping("/updateCategory") // 使用 PUT 方法
     // 使用 @RequestBody 和 DTO
    public Result updateCategory(@RequestBody UpdateSongCategoryRequest request) {
        try {
            boolean success = songService.updateSongCategories(request.getSongId(), request.getCategoryIds());
            if (success) {
                return Result.success("歌曲类别更新成功");
            } else {
                 // Service should ideally throw
                return Result.failure("更新歌曲类别失败");
            }
        } catch (Exception e) {
            log.error("Error in updateCategory endpoint for song ID {}: {}", request.getSongId(), e.getMessage(), e);
            return Result.failure("更新歌曲类别时发生服务器内部错误");
        }
    }

    // TODO: Add endpoints for managing song-tag associations if needed
    // TODO: Add endpoints for managing song-singer associations if needed (e.g., add/remove a singer from a song)
}




















