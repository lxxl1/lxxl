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
import com.cpt202.domain.Singer;
import com.cpt202.dto.SongMetadataDTO;
import com.cpt202.service.SingerService;
import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import com.github.pagehelper.PageInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import com.cpt202.dto.SongStatsDTO;

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

    @Autowired
    private SingerService singerService;

    @PostMapping("/process-metadata")
    public Result processSongMetadata(@RequestParam("file") MultipartFile mpFile) {
        if (mpFile == null || mpFile.isEmpty()) {
            return Result.failure("No file provided");
        }

        String originalFilename = mpFile.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".mp3")) {
             log.warn("Processing metadata for non-MP3 file: {}", originalFilename);
        }

        File tempFile = null;
        try {
            String prefix = "metadata_" + System.currentTimeMillis() + "_";
            String suffix = (originalFilename != null && originalFilename.contains("."))
                            ? originalFilename.substring(originalFilename.lastIndexOf("."))
                            : ".tmp";
            tempFile = File.createTempFile(prefix, suffix);
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(mpFile.getBytes());
            }
            log.debug("Temporary file created at: {}", tempFile.getAbsolutePath());

            AudioFile audioFile = AudioFileIO.read(tempFile);
            Tag tag = audioFile.getTag();

            String title = "";
            String artist = "";
            String album = "";

             if (tag != null) {
                 title = tag.getFirst(FieldKey.TITLE);
                 artist = tag.getFirst(FieldKey.ARTIST);
                 album = tag.getFirst(FieldKey.ALBUM);
                 title = (title == null) ? "" : title.trim();
                 artist = (artist == null) ? "" : artist.trim();
                 album = (album == null) ? "" : album.trim();
            } else {
                log.warn("No metadata tag found in file: {}", originalFilename);
            }


            log.info("Extracted Metadata - Title: '{}', Artist: '{}', Album: '{}'", title, artist, album);

            Integer singerId = null;
            String processedArtistName = artist;

            if (!processedArtistName.isEmpty()) {
                Singer existingSinger = null;
                try {
                     existingSinger = singerService.findByNameIgnoreCase(processedArtistName);
                } catch (Exception serviceEx) {
                    log.error("Error finding singer by name '{}': {}", processedArtistName, serviceEx.getMessage(), serviceEx);
                }


                if (existingSinger != null) {
                    singerId = existingSinger.getId();
                    log.info("Found existing singer: ID={}, Name='{}'", singerId, existingSinger.getName());
                } else {
                    log.info("Singer '{}' not found, attempting to create.", processedArtistName);
                    Singer newSinger = new Singer();
                    newSinger.setName(processedArtistName);

                    boolean created = false;
                    try {
                        created = singerService.addSinger(newSinger);
                    } catch(Exception addEx) {
                         log.error("Error adding new singer '{}': {}", processedArtistName, addEx.getMessage(), addEx);
                    }

                    if (created && newSinger.getId() != null) {
                        singerId = newSinger.getId();
                        log.info("Created new singer: ID={}, Name='{}'", singerId, newSinger.getName());
                    } else {
                        log.error("Failed to create new singer or retrieve ID for name: {}. 'created' flag: {}", processedArtistName, created);
                    }
                }
            } else {
                log.warn("No artist metadata found in the file: {}", originalFilename);
            }

            SongMetadataDTO metadataDTO = new SongMetadataDTO();
            metadataDTO.setTitle(title);
            metadataDTO.setAlbum(album);
            metadataDTO.setSingerId(singerId);
            metadataDTO.setRecognizedArtistName(processedArtistName);

            log.info("Returning metadata DTO: {}", metadataDTO);
            return Result.success(metadataDTO);

        } catch (Exception e) {
            log.error("Error processing song metadata for file: {}", originalFilename, e);
            return Result.failure("Error extracting metadata. Please check the file format. Details: " + e.getMessage());
        } finally {
            if (tempFile != null && tempFile.exists()) {
                log.debug("Deleting temporary file: {}", tempFile.getAbsolutePath());
                if (!tempFile.delete()) {
                    log.warn("Could not delete temporary file: {}", tempFile.getAbsolutePath());
                }
            }
        }
    }

    /**
     * 添加歌曲 (最终提交) - Modified to receive album
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Result addSong(HttpServletRequest request,
                          @RequestParam("file") MultipartFile mpFile,
                          @RequestParam(name = "imageFile", required = false) MultipartFile imageFile,
                          @RequestParam(name = "album", required = false) String albumParam) {
        try {
            String userId = request.getParameter("userId").trim();
            String singerIdsParam = request.getParameter("singerIds");
            String name = request.getParameter("name").trim();
            String introduction = request.getParameter("introduction").trim();
            String lyric = request.getParameter("lyric").trim();
            String pic = "/img/songPic/tubiao.jpg";
            String categoryIdsParam = request.getParameter("categoryIds");
            String tagIdsParam = request.getParameter("tagIds");
            String album = (albumParam != null) ? albumParam.trim() : "";

            if (mpFile == null || mpFile.isEmpty()) {
                return Result.failure("Song file cannot be empty");
            }

            if (imageFile != null && !imageFile.isEmpty()) {
                try {
                    String imageUrl = ossUtil.uploadFile(imageFile, "img/songPic/");
                    if (StringUtils.hasText(imageUrl)) {
                        pic = imageUrl;
                        log.info("Successfully uploaded cover image for song: {}", name);
                    } else {
                        log.warn("Cover image upload failed for song: {}, using default.", name);
                    }
                } catch (IOException e) {
                     log.error("IO Error during cover image upload for song: {}", name, e);
                     log.warn("IO Error during cover image upload, continuing with default pic.");
                }
            } else {
                 log.info("No cover image provided for song: {}, using default.", name);
            }


            String musicUrl = ossUtil.uploadFile(mpFile, "song/");
            if (musicUrl == null) {
                return Result.failure("Song file final upload failed");
            }

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
                     log.warn("Invalid final singer IDs format: {}. Input: {}", e.getMessage(), singerIdsParam);
                     ossUtil.deleteFile(musicUrl);
                     if (StringUtils.hasText(pic) && !pic.equals("/img/songPic/tubiao.jpg")) {
                         ossUtil.deleteFile(pic);
                     }
                     return Result.failure("Invalid singer ID format in final submission");
                 }
            }
             if (CollectionUtils.isEmpty(singerIdList)) {
                 log.warn("No valid singer IDs provided in final submission for song: {}", name);
             }

            Song song = new Song();
            song.setUserId(Integer.parseInt(userId));
            song.setName(name);
            song.setIntroduction(introduction);
            song.setPic(pic);
            song.setLyric(lyric);
            song.setUrl(musicUrl);
            song.setStatus(0);
            song.setAlbum(album);

            boolean songInsertSuccess = songService.insert(song, singerIdList);
            if (!songInsertSuccess) {
                ossUtil.deleteFile(musicUrl);
                if (StringUtils.hasText(pic) && !pic.equals("/img/songPic/tubiao.jpg")) {
                     ossUtil.deleteFile(pic);
                }
                return Result.failure("Failed to save song info or associate singers");
            }

            Integer newSongId = song.getId();
            if (newSongId == null) {
                 log.error("CRITICAL: Failed to retrieve generated song ID after insert service call for song: {}", name);
                 return Result.failure("Failed to get new song ID, subsequent associations failed. Please contact support.");
            }
            log.info("Successfully processed song insertion '{}' with ID: {}", name, newSongId);

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
                }
            }

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
                 }
             } else {
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
    public Result updateSong(@RequestParam("id") Integer id,
                             @RequestParam("name") String name,
                             @RequestParam(name = "album", required = false) String album,
                             @RequestParam(name = "introduction", required = false) String introduction,
                             @RequestParam(name = "lyric", required = false) String lyric,
                             @RequestParam(name = "singerIds", required = false) String singerIdsParam,
                             @RequestParam(name = "categoryIds", required = false) String categoryIdsParam
    ) {
        try {
            List<Integer> singerIdList = Collections.emptyList();
             if (StringUtils.hasText(singerIdsParam)) {
                try {
                 singerIdList = Arrays.stream(singerIdsParam.split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::parseInt).distinct()
                         .collect(Collectors.toList());
                } catch (NumberFormatException e) {
                    log.warn("Invalid singer IDs format for song ID {}: {}", id, singerIdsParam, e);
                    return Result.failure("Invalid singer ID format.");
                }
            }

            List<Integer> categoryIdList = Collections.emptyList();
            if (StringUtils.hasText(categoryIdsParam)) {
                try {
                    categoryIdList = Arrays.stream(categoryIdsParam.split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).map(Integer::parseInt).distinct()
                            .collect(Collectors.toList());
                } catch (NumberFormatException e) {
                    log.warn("Invalid category IDs format for song ID {}: {}", id, categoryIdsParam, e);
                    return Result.failure("Invalid category ID format.");
                }
            }

            Song songToUpdate = new Song();
            songToUpdate.setId(id);
            songToUpdate.setName(name != null ? name.trim() : null);
            if (album != null) songToUpdate.setAlbum(album.trim());
            if (introduction != null) songToUpdate.setIntroduction(introduction.trim());
            if (lyric != null) songToUpdate.setLyric(lyric.trim());

            boolean flag = songService.update(songToUpdate, singerIdList, categoryIdList);

            if (flag) {
                return Result.success("Song updated successfully");
            } else {
                return Result.failure("Update failed (service layer returned false or no changes detected)");
            }
        } catch (NumberFormatException e) {
            log.error("Error parsing number in updateSong (ID='{}'): {}", id, e.getMessage());
            return Result.failure("Invalid format for Song ID, Singer ID, or Category ID");
        } catch (Exception e) {
            log.error("Error updating song (ID={}): {}", id, e.getMessage(), e);
            return Result.failure("Error occurred while updating song: " + e.getMessage());
        }
    }

    /**
     * 删除歌曲（改名为deleteSong）
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Result deleteSong(HttpServletRequest request){
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
     * 更新歌曲图片 (模仿 /add 逻辑)
     */
    @RequestMapping(value = "/updateSongPic",method = RequestMethod.POST)
    public Result updateSongPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        String oldPicUrl = null;
        String newPicUrl = null;
        Song existingSong = null;

        // 1. 检查文件是否为空
        if (avatorFile == null || avatorFile.isEmpty()) {
             return Result.failure("Image file cannot be empty");
        }

        try {
            // 2. 获取旧的图片URL，并检查歌曲是否存在
            existingSong = songService.selectDetailByPrimaryKey(id); // 使用 selectDetailByPrimaryKey 更安全
            if (existingSong == null) {
                return Result.failure("Song not found with ID: " + id);
            }
            oldPicUrl = existingSong.getPic();
            log.info("Updating picture for song ID: {}, Old Pic URL: {}", id, oldPicUrl);

            // 3. 上传新图片到OSS
            log.info("Attempting to upload new cover image for song ID: {}", id);
            newPicUrl = ossUtil.uploadFile(avatorFile, "img/songPic/");
            if (newPicUrl == null) {
                 log.error("New image upload failed for song ID: {}", id);
                 return Result.failure("Image upload failed (OSS returned null)");
            }
            log.info("New cover image uploaded successfully for song ID {}: {}", id, newPicUrl);

            // 4. 更新数据库中的图片路径
            Song songToUpdate = new Song();
            songToUpdate.setId(id);
            songToUpdate.setPic(newPicUrl);
            boolean flag = songService.updatePic(songToUpdate); // Service层方法仅更新Pic字段

            if (flag) {
                log.info("Database pic URL updated successfully for song ID: {}", id);
                // 5. 数据库更新成功后，删除旧图片 (如果存在且非默认)
                if (StringUtils.hasText(oldPicUrl) && !oldPicUrl.contains("tubiao.jpg") && !oldPicUrl.equals(newPicUrl)) {
                    try {
                        log.info("Attempting to delete old cover file for song ID {}: {}", id, oldPicUrl);
                        ossUtil.deleteFile(oldPicUrl);
                        log.info("Successfully deleted old cover file: {}", oldPicUrl);
                    } catch (Exception e) {
                        log.error("Failed to delete old cover file {} for song ID {}: {}", oldPicUrl, id, e.getMessage());
                        // 记录错误，但不影响接口的成功返回
                    }
                }
                return Result.success(newPicUrl); // 返回新的URL作为数据
            } else {
                log.error("Failed to update database pic URL for song ID: {}", id);
                // 6. 数据库更新失败，删除刚刚上传的新图片
                if (newPicUrl != null) {
                    try {
                        log.warn("Database update failed for song ID {}, attempting to delete newly uploaded pic file: {}", id, newPicUrl);
                        ossUtil.deleteFile(newPicUrl);
                        log.warn("Successfully deleted newly uploaded pic file due to DB update failure: {}", newPicUrl);
                    } catch (Exception e) {
                        log.error("Failed to delete newly uploaded pic file {} after DB failure for song ID {}: {}", newPicUrl, id, e.getMessage());
                    }
                }
                return Result.failure("Update failed (database update failed)");
            }
        } catch (IOException e) {
            log.error("IO Error during song pic upload for ID: {}", id, e);
            // 如果发生IO错误，新图片可能已上传也可能未上传，尝试删除以防万一
            if (newPicUrl != null) {
                 try { ossUtil.deleteFile(newPicUrl); } catch (Exception cleanEx) { log.error("Cleanup failed for pic {} after IO Exception", newPicUrl); }
            }
            return Result.failure("Image upload IO exception: " + e.getMessage());
        } catch (Exception e) {
             log.error("Unexpected error during song pic update for ID: {}", id, e);
             // 同样，尝试删除可能已上传的新文件
             if (newPicUrl != null) {
                 try { ossUtil.deleteFile(newPicUrl); } catch (Exception cleanEx) { log.error("Cleanup failed for pic {} after generic Exception", newPicUrl); }
             }
             return Result.failure("Unexpected error during picture update: " + e.getMessage());
        }
    }

    /**
     * 更新歌曲文件 (模仿 /add 逻辑)
     */
    @RequestMapping(value = "/updateSongUrl",method = RequestMethod.POST)
    public Result updateSongUrl(@RequestParam("file") MultipartFile songFile, @RequestParam("id")int id){
        String oldSongUrl = null;
        String newSongUrl = null;
        Song existingSong = null;

        // 1. 检查文件是否为空
        if (songFile == null || songFile.isEmpty()) {
             return Result.failure("Song file cannot be empty");
        }

        try {
             // 2. 获取旧的歌曲URL，并检查歌曲是否存在
            existingSong = songService.selectDetailByPrimaryKey(id); // 使用 selectDetailByPrimaryKey 更安全
            if (existingSong == null) {
                return Result.failure("Song not found with ID: " + id);
            }
            oldSongUrl = existingSong.getUrl();
            log.info("Updating music file for song ID: {}, Old Song URL: {}", id, oldSongUrl);


            // 3. 上传新歌曲文件到OSS
            log.info("Attempting to upload new music file for song ID: {}", id);
            newSongUrl = ossUtil.uploadFile(songFile, "song/");
            if (newSongUrl == null) {
                log.error("New music file upload failed for song ID: {}", id);
                return Result.failure("Song file upload failed (OSS returned null)");
            }
             log.info("New music file uploaded successfully for song ID {}: {}", id, newSongUrl);

            // 4. 更新数据库中的歌曲文件路径
            Song songToUpdate = new Song();
            songToUpdate.setId(id);
            songToUpdate.setUrl(newSongUrl);
            boolean flag = songService.updateUrl(songToUpdate); // Service层方法仅更新Url字段

            if (flag) {
                 log.info("Database song URL updated successfully for song ID: {}", id);
                // 5. 数据库更新成功后，删除旧歌曲文件 (如果存在)
                if (StringUtils.hasText(oldSongUrl) && !oldSongUrl.equals(newSongUrl)) {
                    try {
                         log.info("Attempting to delete old music file for song ID {}: {}", id, oldSongUrl);
                        ossUtil.deleteFile(oldSongUrl);
                         log.info("Successfully deleted old music file: {}", oldSongUrl);
                    } catch (Exception e) {
                        log.error("Failed to delete old music file {} for song ID {}: {}", oldSongUrl, id, e.getMessage());
                        // 记录错误，但不影响接口的成功返回
                    }
                }
                return Result.success(newSongUrl); // 返回新的URL作为数据
            } else {
                 log.error("Failed to update database song URL for song ID: {}", id);
                // 6. 数据库更新失败，删除刚刚上传的新歌曲文件
                if (newSongUrl != null) {
                    try {
                        log.warn("Database update failed for song ID {}, attempting to delete newly uploaded song file: {}", id, newSongUrl);
                        ossUtil.deleteFile(newSongUrl);
                        log.warn("Successfully deleted newly uploaded song file due to DB update failure: {}", newSongUrl);
                    } catch (Exception e) {
                        log.error("Failed to delete newly uploaded song file {} after DB failure for song ID {}: {}", newSongUrl, id, e.getMessage());
                    }
                }
                return Result.failure("Update failed (database update failed)");
            }
        } catch (IOException e) {
            log.error("IO Error during song file upload for ID: {}", id, e);
             // 如果发生IO错误，新文件可能已上传也可能未上传，尝试删除以防万一
            if (newSongUrl != null) {
                 try { ossUtil.deleteFile(newSongUrl); } catch (Exception cleanEx) { log.error("Cleanup failed for song {} after IO Exception", newSongUrl); }
            }
            return Result.failure("Song file upload IO exception: " + e.getMessage());
        } catch (Exception e) {
             log.error("Unexpected error during song file update for ID: {}", id, e);
              // 同样，尝试删除可能已上传的新文件
             if (newSongUrl != null) {
                 try { ossUtil.deleteFile(newSongUrl); } catch (Exception cleanEx) { log.error("Cleanup failed for song {} after generic Exception", newSongUrl); }
             }
            return Result.failure("Unexpected error during song file update: " + e.getMessage());
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
        return Result.success(songService.songOfName(name.trim()));
    }

    /**
     * 根据歌名模糊查询歌曲 (No change needed, returns basic info)
     */
    @RequestMapping(value = "/likeSongOfName",method = RequestMethod.GET)
    public Result likeSongOfName(HttpServletRequest request){
        String songName = request.getParameter("songName");
         if (!StringUtils.hasText(songName)) {
            return Result.success(Collections.emptyList());
        }
        return Result.success(songService.likeSongOfName(songName.trim()));
    }

    /**
     * 查询所有歌曲 (No change needed, returns basic info)
     * Added /selectAll mapping to handle frontend call
     */
    @RequestMapping(value = {"/allSong", "/selectAll"}, method = RequestMethod.GET)
    public Result allSong(HttpServletRequest request){
        return Result.success(songService.allSong());
    }

    /**
     * 查询播放次数排前列的歌曲 (No change needed, returns basic info)
     */
//    @RequestMapping(value = "/topSong",method = RequestMethod.GET)
//    public Result topSong(HttpServletRequest request){
//        return Result.success(songService.topSong());
//    }

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
        String statusStr = request.getParameter("status");
         if (!StringUtils.hasText(statusStr)) {
             return Result.failure("Audit status parameter cannot be empty");
        }

        try {
            Integer status = Integer.parseInt(statusStr.trim());
            if (status != 1 && status != 2) {
                 return Result.failure("Invalid audit status");
            }
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
    @GetMapping("/selectbyuser")
    public Result songOfUserIdBasic(@RequestParam Integer userId,
                                    @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
                                    @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {
        if (userId == null) {
            return Result.failure("User ID cannot be null");
        }
        if (pageNum <= 0 || pageSize <= 0) {
             return Result.failure("Page number and page size must be positive.");
        }
        try {
            PageInfo<SongDTO> pageInfo = songService.songOfUserId(userId, pageNum, pageSize);
            if (pageInfo == null || CollectionUtils.isEmpty(pageInfo.getList())) {
                 PageInfo<SongDTO> emptyPageInfo = new PageInfo<>(Collections.emptyList());
                 emptyPageInfo.setPageNum(pageNum);
                 emptyPageInfo.setPageSize(pageSize);
                 emptyPageInfo.setTotal(0);
                 emptyPageInfo.setPages(0);
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
            @RequestParam(required = false) Integer userId,
            @RequestParam(value = "categoryId", required = false) Integer categoryId,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "searchTerm", required = false) String searchTerm,
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") int pageSize) {

        if (pageNum <= 0 || pageSize <= 0) {
             return Result.failure("Page number and page size must be positive.");
        }

        try {
            PageInfo<SongDTO> pageInfo = songService.searchUserSongs(
                    userId, categoryId, status, searchTerm, pageNum, pageSize
            );

            if (pageInfo == null || CollectionUtils.isEmpty(pageInfo.getList())) {
                 PageInfo<SongDTO> emptyPageInfo = new PageInfo<>(Collections.emptyList());
                 emptyPageInfo.setPageNum(pageNum);
                 emptyPageInfo.setPageSize(pageSize);
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
        String categoryIdsParam = request.getParameter("categoryIds");

        if (!StringUtils.hasText(songIdStr)) {
            return Result.failure("Song ID cannot be empty");
        }
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
             List<SongDTO> songs = songService.getSongsByCategoryId(categoryId);
             if (songs != null) {
                 return Result.success(songs);
             } else {
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
    @PutMapping("/updateCategory")
    public Result updateCategory(@RequestBody UpdateSongCategoryRequest request) {
        try {
            boolean success = songService.updateSongCategories(request.getSongId(), request.getCategoryIds());
            if (success) {
                return Result.success("歌曲类别更新成功");
            } else {
                return Result.failure("更新歌曲类别失败");
            }
        } catch (Exception e) {
            log.error("Error in updateCategory endpoint for song ID {}: {}", request.getSongId(), e.getMessage(), e);
            return Result.failure("更新歌曲类别时发生服务器内部错误");
        }
    }

    /**
     * 获取歌曲统计信息
     */
    @GetMapping("/stats")
    public Result getSongStats() {
        try {
            SongStatsDTO stats = songService.getSongStatistics();
            return Result.success(stats);
        } catch (Exception e) {
            log.error("Error retrieving song statistics", e);
            return Result.failure("Failed to retrieve song statistics: " + e.getMessage());
        }
    }
}




















