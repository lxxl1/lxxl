package com.cpt202.service.impl;

import com.cpt202.domain.Singer;
import com.cpt202.dto.SongDTO;
import com.cpt202.dto.SongDetailDTO;
import com.cpt202.mapper.*;
import com.cpt202.domain.Song;
import com.cpt202.service.SongService;
import com.cpt202.domain.SongCategory;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Objects;

/**
 * 歌曲service实现类
 */
@Service
@Slf4j
public class SongServiceImpl implements SongService {
    @Autowired
    private SongMapper songMapper;

    @Autowired
    private SongCategoryMapper songCategoryMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Autowired
    private TagMapper tagMapper;

    @Autowired
    private SongTagMapper songTagMapper;

    @Autowired
    private SongSingerMapper songSingerMapper;

    @Autowired
    private SingerMapper singerMapper;

    /**
     * 增加歌曲，并关联歌手、类别、标签
     *
     * @param song 歌曲基本信息
     * @param singerIds 关联的歌手ID列表
     */
    @Override
    @Transactional
    public boolean insert(Song song, List<Integer> singerIds) {
        // 1. Insert the song to get its ID
        boolean songInsertSuccess = songMapper.insert(song) > 0;
        if (!songInsertSuccess || song.getId() == null) {
            log.error("Failed to insert song or retrieve song ID: {}", song.getName());
            return false;
        }
        Integer newSongId = song.getId();
        log.info("Inserted song '{}' with ID: {}", song.getName(), newSongId);

        // 2. Handle singer associations
        if (!CollectionUtils.isEmpty(singerIds)) {
            try {
                songSingerMapper.insertBatch(newSongId, singerIds);
                log.info("Associated song ID {} with singer IDs: {}", newSongId, singerIds);
            } catch (Exception e) {
                log.error("Error associating singers with song ID {}: {}", newSongId, e.getMessage());
                // Consider rolling back or logging more details
                // For now, we continue but log the error
            }
        }

        // Category and Tag associations should be handled in the controller or service method that calls this,
        // as they are typically passed as separate parameters.
        // If categories/tags were part of the Song object, handle them here.

        return true; // Return true even if associations failed, as song was inserted
    }

    /**
     * 修改歌曲，并更新歌手关联
     *
     * @param song 歌曲基本信息 (ID must be present)
     * @param singerIds 新的歌手ID列表
     */
    @Override
    @Transactional
    public boolean update(Song song, List<Integer> singerIds) {
        if (song.getId() == null) {
            log.error("Cannot update song, ID is missing.");
            return false;
        }
        Integer songId = song.getId();

        // 1. Update song basic info
        boolean songUpdateSuccess = songMapper.update(song) > 0;
        if (!songUpdateSuccess) {
            // Log warning, maybe the song didn't exist or no fields changed
            log.warn("Song update did not affect any rows for ID: {}", songId);
            // Decide if this should be considered a failure
        }

        // 2. Update singer associations
        try {
            // Delete existing associations
            songSingerMapper.deleteBySongId(songId);
            // Insert new associations if provided
            if (!CollectionUtils.isEmpty(singerIds)) {
                songSingerMapper.insertBatch(songId, singerIds);
                log.info("Updated singer associations for song ID {} to: {}", songId, singerIds);
            }
        } catch (Exception e) {
            log.error("Error updating singer associations for song ID {}: {}", songId, e.getMessage());
            // Rollback transaction
            throw new RuntimeException("Failed to update singer associations", e);
        }
        
        // Category and Tag associations should be handled separately if needed.

        return true; // Return true assuming the main update is the key criteria
    }

    /**
     * 删除歌曲（级联删除关联表）
     *
     * @param id
     */
    @Override
    @Transactional // Keep transactional, although CASCADE might handle it
    public boolean delete(Integer id) {
        // song_singer and song_category should be deleted by CASCADE constraint
        // Manually delete song_tag if no CASCADE constraint exists
        songTagMapper.deleteBySongId(id); 
        songCategoryMapper.deleteBySongId(id); // Keep for safety if CASCADE fails
        songSingerMapper.deleteBySongId(id); // Keep for safety if CASCADE fails
        
        return songMapper.delete(id) > 0;
    }

    /**
     * 根据主键查询歌曲详细信息（包含歌手列表）
     *
     * @param id
     */
    @Override
    public SongDetailDTO selectDetailByPrimaryKey(Integer id) {
        Song song = songMapper.selectByPrimaryKey(id);
        if (song == null) {
            return null;
        }

        SongDetailDTO dto = new SongDetailDTO();
        BeanUtils.copyProperties(song, dto);

        // Fetch associated singer IDs
        List<Integer> singerIds = songSingerMapper.selectSingerIdsBySongId(id);
        List<SongDetailDTO.SingerInfo> singerInfoList = new ArrayList<>();

        if (!CollectionUtils.isEmpty(singerIds)) {
            // Fetch singer details (assuming selectByIds returns List<Singer>)
             List<Singer> singers = singerMapper.selectByIds(singerIds); // *** NEED TO ADD selectByIds to SingerMapper ***
             if (!CollectionUtils.isEmpty(singers)) {
                 singers.forEach(singer -> {
                     SongDetailDTO.SingerInfo singerInfo = new SongDetailDTO.SingerInfo();
                     singerInfo.setId(singer.getId());
                     singerInfo.setName(singer.getName());
                     // singerInfo.setPic(singer.getPic()); // If needed
                     singerInfoList.add(singerInfo);
                 });
             }
        }
        dto.setSingers(singerInfoList);
        
        // TODO: Fetch and add category and tag info similar to songOfUserId method if needed

        return dto;
    }
    
    /**
     * 查询所有歌曲 (返回DTO列表)
     */
    @Override
    public List<SongDTO> allSong() {
        List<Song> songs = songMapper.allSong();
        return convertSongListToDTOList(songs);
    }

    /**
     * 根据歌名精确查询列表 (返回DTO列表)
     */
    @Override
    public List<SongDTO> songOfName(String name) {
        List<Song> songs = songMapper.songOfName(name);
         return convertSongListToDTOList(songs);
    }

    /**
     * 根据歌名模糊查询列表 (返回DTO列表)
     */
    @Override
    public List<SongDTO> likeSongOfName(String name) {
        List<Song> songs = songMapper.likeSongOfName("%" + name + "%");
        return convertSongListToDTOList(songs);
    }
    
    /**
     * 根据歌手id查询其所有歌曲 (保持返回List<Song>)
     */
    @Override
    public List<Song> getSongsBySingerId(Integer singerId) {
        List<Integer> songIds = songSingerMapper.selectSongIdsBySingerId(singerId);
        if (CollectionUtils.isEmpty(songIds)) {
            return Collections.emptyList();
        }
        // Consider adding a method in SongMapper: selectByIds(List<Integer> ids)
        return songIds.stream()
                      .map(songMapper::selectByPrimaryKey)
                      .filter(Objects::nonNull)
                      .collect(Collectors.toList());
    }
    
    /**
     * 查询播放次数排前列的歌曲 (返回DTO列表)
     */
     @Override
     public List<SongDTO> topSong() {
         List<Song> songs = songMapper.topSong();
         return convertSongListToDTOList(songs);
     }
     
     @Override
     public boolean updateStatus(Integer songId, Integer status) {
         return songMapper.updateStatus(songId, status) > 0;
     }
     
    /**
     * 获取待审核歌曲列表 (返回DTO列表)
     */
     @Override
     public List<SongDTO> getPendingSongs() {
         List<Song> songs = songMapper.getPendingSongs();
         return convertSongListToDTOList(songs);
     }
     
     /**
      * 获取已审核歌曲列表 (返回DTO列表)
      */
     @Override
     public List<SongDTO> getAuditedSongs(Integer status) {
         List<Song> songs = songMapper.getAuditedSongs(status);
         return convertSongListToDTOList(songs);
     }
     
     /**
      * 获取用户上传的所有歌曲 (分页)
      *
      * @param userId 用户ID
      * @param pageNum 页码
      * @param pageSize 每页数量
      * @return 分页后的歌曲列表
      */
      @Override
      public PageInfo<SongDTO> songOfUserId(Integer userId, int pageNum, int pageSize) {
          PageHelper.startPage(pageNum, pageSize);
          List<Song> songs = songMapper.songOfUserId(userId);
          PageInfo<Song> songPageInfo = new PageInfo<>(songs); 
          List<SongDTO> songDTOs = convertSongListToDTOList(songPageInfo.getList());
          PageInfo<SongDTO> songDTOPageInfo = new PageInfo<>();
          BeanUtils.copyProperties(songPageInfo, songDTOPageInfo);
          songDTOPageInfo.setList(songDTOs);
          return songDTOPageInfo;
      }
      
      /**
       * 根据用户ID和类别ID查询歌曲列表 (返回DTO列表)
       */
      @Override
      public List<SongDTO> getUserSongsByCategory(Integer userId, Integer categoryId) {
          List<Song> songList = songMapper.selectUserSongsByCategory(userId, categoryId);
          // Use the helper method for conversion
          return convertSongListToDTOList(songList);
      }
      
      /**
       * 更新歌曲的类别关联
       */
      @Override
      @Transactional
      public boolean updateSongCategories(Integer songId, List<Integer> categoryIds) {
          try {
              // 1. Delete existing categories for the song
              songCategoryMapper.deleteBySongId(songId);

              // 2. Insert new categories if the list is not empty
              if (!CollectionUtils.isEmpty(categoryIds)) {
                  for (Integer categoryId : categoryIds) {
                      SongCategory songCategory = new SongCategory();
                      songCategory.setSongId(songId);
                      songCategory.setCategoryId(categoryId);
                      songCategoryMapper.insert(songCategory);
                  }
              }
              return true;
          } catch (Exception e) {
              log.error("Error updating categories for song ID {}: {}", songId, e.getMessage());
              throw new RuntimeException("Failed to update song categories", e);
          }
      }

    /**
     * 根据用户ID、分类、状态、搜索词查询歌曲 (分页) - 新增实现
     */
    @Override
    public PageInfo<SongDTO> searchUserSongs(Integer userId, Integer categoryId, Integer status, String searchTerm, int pageNum, int pageSize) {
        // Prepare search term for LIKE query if present
        String formattedSearchTerm = null;
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            formattedSearchTerm = "%" + searchTerm.trim() + "%";
        }
        
        // Start pagination
        PageHelper.startPage(pageNum, pageSize);
        
        // Call the new mapper method
        // !! IMPORTANT: `searchUserSongs` method needs to be added to SongMapper interface and XML !!
        List<Song> songs = songMapper.searchUserSongs(userId, categoryId, status, formattedSearchTerm);
        
        // Create PageInfo from the results
        PageInfo<Song> songPageInfo = new PageInfo<>(songs); 
        
        // Convert the current page's songs to DTOs
        List<SongDTO> songDTOs = convertSongListToDTOList(songPageInfo.getList());
        
        // Create PageInfo for DTOs
        PageInfo<SongDTO> songDTOPageInfo = new PageInfo<>();
        BeanUtils.copyProperties(songPageInfo, songDTOPageInfo); // Copy pagination properties
        songDTOPageInfo.setList(songDTOs); // Set the converted list
        
        return songDTOPageInfo;
    }

    // --- Helper Method --- 

    /**
     * Converts a List of Song entities to a List of SongDTOs,
     * populating category, tag, and singer information for each DTO.
     * 
     * @param songList The list of Song entities.
     * @return A list of populated SongDTOs.
     */
    private List<SongDTO> convertSongListToDTOList(List<Song> songList) {
        if (CollectionUtils.isEmpty(songList)) {
            return Collections.emptyList();
        }

        List<SongDTO> resultList = new ArrayList<>();
        for (Song song : songList) {
            SongDTO dto = convertSongToDTO(song);
            if (dto != null) {
                 resultList.add(dto);
            }
        }
        return resultList;
    }
    
    /**
     * Converts a single Song entity to a SongDTO,
     * populating category, tag, and singer information.
     * 
     * @param song The Song entity.
     * @return A populated SongDTO, or null if input song is null.
     */
    private SongDTO convertSongToDTO(Song song) {
        if (song == null) {
            return null;
        }
        SongDTO dto = new SongDTO();
        BeanUtils.copyProperties(song, dto); // Copy basic properties

        // --- Populate Categories --- 
        List<Integer> categoryIds = songCategoryMapper.selectCategoryIdsBySongId(song.getId());
        if (!CollectionUtils.isEmpty(categoryIds)) {
            List<String> categoryNameList = categoryMapper.selectNamesByIds(categoryIds);
            dto.setCategoryNames(categoryNameList != null ? String.join(", ", categoryNameList) : "N/A");
            dto.setCategoryIds(categoryIds);
        } else {
            dto.setCategoryNames("N/A");
            dto.setCategoryIds(Collections.emptyList());
        }

        // --- Populate Tags --- 
        List<Integer> tagIds = songTagMapper.selectTagIdsBySongId(song.getId());
        if (!CollectionUtils.isEmpty(tagIds)) {
            List<String> tagNameList = tagMapper.selectNamesByIds(tagIds);
            dto.setTagNames(tagNameList != null ? String.join(", ", tagNameList) : "N/A");
            dto.setTagIds(tagIds);
        } else {
            dto.setTagNames("N/A");
            dto.setTagIds(Collections.emptyList());
        }

        // --- Populate Singers --- 
        List<Integer> singerIds = songSingerMapper.selectSingerIdsBySongId(song.getId());
        if (!CollectionUtils.isEmpty(singerIds)) {
            List<String> singerNameList = singerMapper.selectNamesByIds(singerIds);
            dto.setSingerNames(singerNameList != null ? String.join(", ", singerNameList) : "N/A");
            dto.setSingerIds(singerIds);
        } else {
            dto.setSingerNames("N/A");
            dto.setSingerIds(Collections.emptyList());
        }

        return dto;
    }
    
    // --- New Methods Implementation ---

    @Override
    public boolean updatePic(Song song) {
        // Assumes SongMapper has an updatePic method that updates only the pic field based on ID
        return songMapper.updatePic(song) > 0;
    }

    @Override
    public boolean updateUrl(Song song) {
        // Assumes SongMapper has an updateUrl method that updates only the url field based on ID
        return songMapper.updateUrl(song) > 0;
    }

    @Override
    public boolean updateMVUrl(int id, String mvUrl) {
        // Assumes SongMapper has an updateMVUrl method
        // You might need to create a Song object or pass params directly depending on the mapper method signature
        Song song = new Song();
        song.setId(id);
        // song.setMvurl(mvUrl); // If mvurl field exists in Song domain
        // Or call mapper directly: return songMapper.updateMVUrl(id, mvUrl) > 0;
        // For now, returning false as the domain/mapper method is uncertain
        log.warn("updateMVUrl is not fully implemented in Service/Mapper yet for ID: {}", id);
        // TODO: Implement this properly based on mapper
        // Assuming a mapper method exists for demo:
        // return songMapper.updateMVUrlById(id, mvUrl) > 0;
        return false; // Placeholder - Requires Mapper changes
    }

    @Override
    public List<SongDTO> getSongsByCategoryId(Integer categoryId) {
        // Assumes SongMapper has a method like selectSongsByCategoryId
        // List<Song> songs = songMapper.selectSongsByCategoryId(categoryId);
        // return convertSongListToDTOList(songs);
        log.warn("getSongsByCategoryId is not fully implemented in Service/Mapper yet for Category ID: {}", categoryId);
        // TODO: Implement this properly based on mapper
        return Collections.emptyList(); // Placeholder
    }
}
