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
                          @RequestParam(name = "imageFile", required = false) MultipartFile imageFile,
                          @RequestParam(name = "files", required = false) MultipartFile mvFile) {
        try {
            // 获取前端传来的参数
            String userId = request.getParameter("userId").trim();
            String singerIdsParam = request.getParameter("singerIds");
            String name = request.getParameter("name").trim();
            String introduction = request.getParameter("introduction").trim();
            String lyric = request.getParameter("lyric").trim();
            // Default picture path
            String pic = "/img/songPic/tubiao.jpg";
            String categoryIdsParam = request.getParameter("categoryIds");
            String tagIdsParam = request.getParameter("tagIds");

            // 检查音乐文件是否为空
            if (mpFile == null || mpFile.isEmpty()) {
                return Result.failure("Song file cannot be empty");
            }

            // Upload image file to OSS if present
            if (imageFile != null && !imageFile.isEmpty()) {
                try {
                    String imageUrl = ossUtil.uploadFile(imageFile, "img/songPic/");
                    if (StringUtils.hasText(imageUrl)) {
                        pic = imageUrl; // Update pic with the uploaded image URL
                        log.info("Successfully uploaded cover image for song: {}", name);
                    } else {
                        log.warn("Cover image upload failed for song: {}, using default.", name);
                        // Keep the default pic if upload failed but file was present
                    }
                } catch (IOException e) {
                     log.error("IO Error during cover image upload for song: {}", name, e);
                     // Decide if this should be a fatal error or just use default pic
                     // return Result.failure("封面图片上传过程中发生IO错误: " + e.getMessage()); // Option 1: Fail request
                     log.warn("IO Error during cover image upload, continuing with default pic."); // Option 2: Continue with default
                }
            } else {
                 log.info("No cover image provided for song: {}, using default.", name);
            }


            // 上传音乐文件到OSS
            String musicUrl = ossUtil.uploadFile(mpFile, "song/");
            if (musicUrl == null) {
                return Result.failure("Song file upload failed");
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
                     return Result.failure("Invalid singer ID format");
                 }
            }
             if (CollectionUtils.isEmpty(singerIdList)) {
                 log.warn("No valid singer IDs provided for song: {}", name);
             }

            // 创建歌曲对象 (pic is now potentially the uploaded image URL)
            Song song = new Song();
            song.setUserId(Integer.parseInt(userId));
            song.setName(name);
            song.setIntroduction(introduction);
            song.setPic(pic);
            song.setLyric(lyric);
            song.setUrl(musicUrl);
            song.setStatus(0);

            // 1. 保存歌曲信息和歌手关联 (Call updated service method)
            boolean songInsertSuccess = songService.insert(song, singerIdList);
            if (!songInsertSuccess) {
                return Result.failure("Failed to save song info or associate singers");
            }

            Integer newSongId = song.getId();
            if (newSongId == null) {
                 log.error("Error: Failed to retrieve generated song ID after insert service call for song: {}", name);
                 return Result.failure("Failed to get new song ID, subsequent associations failed");
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

            return Result.success("Song added and associations processed successfully. URL: " + musicUrl);

        } catch (NumberFormatException e) {
             log.error("Error parsing number in addSong: {}", e.getMessage());
             return Result.failure("Invalid format for User ID, Category ID, or Tag ID");
        } catch (IOException e) {
            log.error("IO Error during music file upload in addSong", e);
            return Result.failure("IO error occurred during music file upload: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unknown error in addSong", e);
            return Result.failure("Unknown error occurred while adding song: " + e.getMessage());
        }
    }

    /**
     * 根据歌手id查询歌曲列表 (Call updated service method)
     */
    @RequestMapping(value = "/singer/detail",method = RequestMethod.GET)
    public Result getSongsBySingerId(HttpServletRequest request){
        String singerIdStr = request.getParameter("singerId");
        if (!StringUtils.hasText(singerIdStr)) {
            return Result.failure("Singer ID cannot be empty");
        }
        try {
             Integer singerId = Integer.parseInt(singerIdStr.trim());
             List<Song> songs = songService.getSongsBySingerId(singerId);
             return Result.success(songs);
        } catch (NumberFormatException e) {
             log.error("Invalid singerId format: {}", singerIdStr);
             return Result.failure("Invalid singer ID format");
        } catch (Exception e) {
            log.error("Error fetching songs by singer ID: {}", singerIdStr, e);
            return Result.failure("Failed to query singer's songs");
        }
    }

    /**
     * 修改歌曲信息和歌手关联
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateSong(HttpServletRequest request){
         String idStr = null; // Declare idStr outside try block
         Integer songId = null; // Declare songId outside try block
         try {
             //主键
            idStr = request.getParameter("id").trim();
             //歌名
            String name = request.getParameter("name").trim();
             //专辑
            String introduction = request.getParameter("introduction").trim();
             //歌词
            String lyric = request.getParameter("lyric").trim();
             // Expecting comma-separated string
            String singerIdsParam = request.getParameter("singerIds");

            songId = Integer.parseInt(idStr); // Assign value inside try

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
                return Result.success("Song info and singer associations updated successfully");
            }
            // Service layer should throw exception on error or return false meaningfully
            return Result.failure("Update failed");
        } catch (NumberFormatException e) {
            log.error("Error parsing number in updateSong (ID='{}'): {}", idStr, e.getMessage()); // Log idStr here
            return Result.failure("Invalid format for Song ID or Singer ID"); // Combined message
        } catch (Exception e) {
            // Log both songId (if parsed) and original idStr for better debugging
            log.error("Error updating song (ID={}, RawID='{}'): {}", songId, idStr, e.getMessage(), e);
            return Result.failure("Error occurred while updating song: " + e.getMessage());
        }
    }

    /**
     * 删除歌曲（改名为deleteSong）
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Result deleteSong(HttpServletRequest request){ // Renamed method for clarity
        String idStr = request.getParameter("id");
         if (!StringUtils.hasText(idStr)) {
            return Result.failure("Song ID cannot be empty");
        }
        try {
            Integer id = Integer.parseInt(idStr.trim());
            boolean flag = songService.delete(id);
            return flag ? Result.success("Deleted successfully") : Result.failure("Failed to delete or song not found");
        } catch (NumberFormatException e) {
            log.error("Invalid songId format for delete: {}", idStr);
            return Result.failure("Invalid Song ID format");
        } catch (Exception e) {
            log.error("Error deleting song with id: {}", idStr, e);
            return Result.failure("Error occurred while deleting song");
        }
    }

    /**
     * 更新歌曲图片
     */
    @RequestMapping(value = "/updateSongPic",method = RequestMethod.POST)
    public Result updateSongPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        String picUrl = null;
        try {
            picUrl = ossUtil.uploadFile(avatorFile, "img/songPic/");
            if (picUrl == null) {
                 return Result.failure("Image upload failed");
            }
        } catch (IOException e) {
            log.error("IO Error during song pic upload for ID: {}", id, e);
            return Result.failure("Image upload IO exception");
        }

        Song song = new Song();
        song.setId(id);
        song.setPic(picUrl);
        boolean flag = songService.updatePic(song); // Assuming service method exists
        if (flag) {
            return Result.success("Upload successful");
        } else {
            return Result.failure("Upload failed");
        }
    }

    /**
     * 更新歌曲文件
     */
    @RequestMapping(value = "/updateSongUrl",method = RequestMethod.POST)
    public Result updateSongUrl(@RequestParam("file") MultipartFile songFile, @RequestParam("id")int id){
        String songUrl = null;
        try {
            songUrl = ossUtil.uploadFile(songFile, "song/");
            if (songUrl == null) {
                return Result.failure("Song file upload failed");
            }
        } catch (IOException e) {
            log.error("IO Error during song file upload for ID: {}", id, e);
            return Result.failure("Song file upload IO exception");
        }

        Song song = new Song();
        song.setId(id);
        song.setUrl(songUrl);
        boolean flag = songService.updateUrl(song); // Assuming service method exists
        if (flag) {
            return Result.success("Upload successful");
        } else {
            return Result.failure("Upload failed");
        }
    }

    /**
     * 更新MV文件
     */
    @RequestMapping(value = "/updateMVUrl",method = RequestMethod.POST)
    public Result updateMVUrl(@RequestParam("file") MultipartFile mvFile, @RequestParam("id")int id){
        String mvUrl = null;
        try {
            mvUrl = ossUtil.uploadFile(mvFile, "mv/");
             if (mvUrl == null) {
                 return Result.failure("MV file upload failed");
            }
        } catch (IOException e) {
             log.error("IO Error during MV file upload for ID: {}", id, e);
             return Result.failure("MV file upload IO exception");
        }

        boolean flag = songService.updateMVUrl(id, mvUrl); // Assuming service method exists
        if (flag) {
             return Result.success("Upload successful");
        } else {
             return Result.failure("Upload failed");
        }
    }

    /**
     * 根据主键查询歌曲详情
     */
    @RequestMapping(value = "/detail",method = RequestMethod.GET)
    public Result detail(HttpServletRequest request){
        String songIdStr = request.getParameter("songId");
         if (!StringUtils.hasText(songIdStr)) {
            return Result.failure("Song ID cannot be empty");
        }
        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            // Use the service method with the correct name
            SongDetailDTO songDetail = songService.selectDetailByPrimaryKey(songId);
            if (songDetail != null) {
                 return Result.success(songDetail);
            } else {
                 return Result.failure("Specified song not found");
            }
        } catch (NumberFormatException e) {
             log.error("Invalid songId format for detail: {}", songIdStr);
             return Result.failure("Invalid Song ID format");
        } catch (Exception e) {
             log.error("Error fetching song detail for id: {}", songIdStr, e);
             return Result.failure("Failed to get song details");
        }
    }

    /**
     * 根据歌名精确查询歌曲
     */
    @RequestMapping(value = "/songOfSongName",method = RequestMethod.GET)
    public Result songOfSongName(HttpServletRequest request){
        String name = request.getParameter("name");
        if (!StringUtils.hasText(name)) {
            return Result.failure("Song name cannot be empty");
        }
        // Use the service method with the correct name
        return Result.success(songService.songOfName(name.trim()));
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
     * 审核歌曲 (Approve/Reject)
     */
    @RequestMapping(value = "/audit", method = RequestMethod.POST)
    public Result auditSong(HttpServletRequest request) {
        String songIdStr = request.getParameter("songId");
        String statusStr = request.getParameter("status");

        if (!StringUtils.hasText(songIdStr) || !StringUtils.hasText(statusStr)) {
            return Result.failure("Song ID and audit status cannot be empty");
        }

        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            Integer status = Integer.parseInt(statusStr.trim());

            if (status != 1 && status != 2) {
                 return Result.failure("Invalid audit status, must be 1 (Approved) or 2 (Rejected)");
            }

            // Use the service method with the correct name
            boolean success = songService.updateStatus(songId, status);
            if (success) {
                 return Result.success("Song audit status updated successfully");
            } else {
                 return Result.failure("Failed to update audit status or song not found");
            }
        } catch (NumberFormatException e) {
            log.error("Invalid songId or status format for audit: songId={}, status={}", songIdStr, statusStr);
            return Result.failure("Invalid format for Song ID or Status");
        } catch (Exception e) {
            log.error("Error auditing song with id: {}", songIdStr, e);
            return Result.failure("Error occurred while auditing song");
        }
    }

    /**
     * 获取待审核歌曲列表
     */
    @RequestMapping(value = "/pending", method = RequestMethod.GET)
    public Result getPendingSongs(HttpServletRequest request) {
        try {
            // Use the specific service method for pending songs
            List<SongDTO> pendingSongs = songService.getPendingSongs();
            return Result.success(pendingSongs);
        } catch (Exception e) {
            log.error("Error fetching pending songs", e);
            return Result.failure("Failed to get pending songs");
        }
    }

    /**
     * 获取已审核歌曲列表 (通过或拒绝)
     */
    @RequestMapping(value = "/audited", method = RequestMethod.GET)
    public Result getAuditedSongs(HttpServletRequest request) {
        String statusStr = request.getParameter("status"); // Expecting 1 (Approved) or 2 (Rejected)
         if (!StringUtils.hasText(statusStr)) {
             return Result.failure("Audit status parameter cannot be empty");
        }

        try {
            Integer status = Integer.parseInt(statusStr.trim());
            if (status != 1 && status != 2) {
                 return Result.failure("Invalid audit status");
            }
            // Use the specific service method for audited songs
            List<SongDTO> auditedSongs = songService.getAuditedSongs(status);
            return Result.success(auditedSongs);
        } catch (NumberFormatException e) {
            log.error("Invalid status format for audited songs: {}", statusStr);
            return Result.failure("Invalid Status format");
        } catch (Exception e) {
            log.error("Error fetching audited songs with status: {}", statusStr, e);
            return Result.failure("Failed to get audited songs");
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
     * 更新歌曲关联的类别
     */
    @RequestMapping(value = "/updateCategories", method = RequestMethod.POST)
    public Result updateSongCategories(HttpServletRequest request) {
        String songIdStr = request.getParameter("songId");
        String categoryIdsParam = request.getParameter("categoryIds"); // Comma-separated IDs

        if (!StringUtils.hasText(songIdStr)) {
            return Result.failure("Song ID cannot be empty");
        }
        // Handle empty category list (means remove all)
        List<Integer> categoryIdList = Collections.emptyList();
         if (StringUtils.hasText(categoryIdsParam)) {
            try {
                categoryIdList = Arrays.stream(categoryIdsParam.split(","))
                        .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::parseInt)
                        .collect(Collectors.toList());
            } catch (NumberFormatException e) {
                 log.warn("Invalid category IDs format for song ID: {}. Input: {}", songIdStr, categoryIdsParam, e);
                 return Result.failure("Invalid Category ID format");
            }
        }

        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            boolean success = songCategoryService.updateSongCategories(songId, categoryIdList);
            if (success) {
                return Result.success("Song category associations updated successfully");
            } else {
                 return Result.failure("Failed to update song category associations");
            }
        } catch (NumberFormatException e) {
            log.error("Invalid songId format for updateCategories: {}", songIdStr);
             return Result.failure("Invalid Song ID or Category ID format");
        } catch (Exception e) {
            log.error("Error updating categories for song ID: {}", songIdStr, e);
            return Result.failure("Error occurred while updating song category associations");
        }
    }

    /**
     * 获取歌曲关联的所有类别ID
     */
    @RequestMapping(value = "/categories", method = RequestMethod.GET)
    public Result getSongCategories(HttpServletRequest request) {
        String songIdStr = request.getParameter("songId");
         if (!StringUtils.hasText(songIdStr)) {
             return Result.failure("Song ID cannot be empty");
        }

        try {
            Integer songId = Integer.parseInt(songIdStr.trim());
            List<Integer> categoryIds = songCategoryService.getCategoryIdsBySongId(songId);
            return Result.success(categoryIds);
           // } catch (ServiceException e) {
           //     log.error("Service error getting categories for song {}: {}", songId, e.getMessage());
           //     return Result.failure("获取歌曲类别功能暂时不可用，请联系管理员");
        } catch (NumberFormatException e) {
             log.error("Invalid songId format for getCategories: {}", songIdStr);
             return Result.failure("Invalid Song ID format");
        } catch (Exception e) {
            log.error("Error getting categories for song ID: {}", songIdStr, e);
            return Result.failure("Failed to get song categories");
        }
    }

    /**
     * 根据类别ID获取歌曲列表
     */
    @RequestMapping(value = "/categorySongs", method = RequestMethod.GET)
    public Result getCategorySongs(HttpServletRequest request) {
        String categoryIdStr = request.getParameter("categoryId");
        if (!StringUtils.hasText(categoryIdStr)) {
            return Result.failure("Category ID cannot be empty");
        }

        try {
             Integer categoryId = Integer.parseInt(categoryIdStr.trim());
             // This needs a service method implementation
             List<SongDTO> songs = songService.getSongsByCategoryId(categoryId); // Placeholder
             if (songs != null) {
                 return Result.success(songs);
             } else {
                 // Consider if null means not implemented or no songs found
                 return Result.failure("Function to get songs by category is not fully implemented");
             }
        } catch (NumberFormatException e) {
            log.error("Invalid categoryId format: {}", categoryIdStr);
            return Result.failure("Invalid Category ID format");
        } catch (Exception e) {
             log.error("Error fetching songs by category ID: {}", categoryIdStr, e);
             return Result.failure("Failed to get category songs");
        }
    }

    /**
     * 获取指定用户在指定分类下的歌曲列表
     */
    @GetMapping("/user/{userId}/category/{categoryId}")
    public Result getUserSongsByCategory(@PathVariable Integer userId, @PathVariable Integer categoryId) {
        try {
            List<SongDTO> songs = songService.getUserSongsByCategory(userId, categoryId);
            return Result.success(songs);
        } catch (Exception e) {
            log.error("Error fetching user {} songs in category {}: {}", userId, categoryId, e.getMessage());
            return Result.failure("Failed to get user categorized songs");
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




















