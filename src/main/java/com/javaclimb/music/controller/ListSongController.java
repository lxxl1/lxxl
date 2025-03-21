package com.javaclimb.music.controller;

import cn.dev33.satoken.util.SaResult;
import com.alibaba.fastjson.JSONObject;
import com.javaclimb.music.domain.ListSong;
import com.javaclimb.music.service.ListSongService;
import com.javaclimb.music.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;

/**
 * 歌单的歌曲管理controller
 */
@RestController
@RequestMapping("/listSong")
public class ListSongController {

    @Autowired
    private ListSongService listSongService;

    /**
     * 给歌单添加歌曲
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Object addListSong(HttpServletRequest request) {
        JSONObject jsonObject = new JSONObject();
        //获取前端传来的参数
        String songId = request.getParameter("songId").trim();  //歌曲id
        String songListId = request.getParameter("songListId").trim(); //歌单id
        ListSong listSong = new ListSong();
        listSong.setSongId(Integer.parseInt(songId));
        listSong.setSongListId(Integer.parseInt(songListId));
        boolean flag = listSongService.insert(listSong);
        if (flag) {
            jsonObject.put(Consts.CODE, 1);
            jsonObject.put(Consts.MSG, "保存成功");
            return jsonObject;
        }
        jsonObject.put(Consts.CODE, 0);
        jsonObject.put(Consts.MSG, "保存失败");
        return jsonObject;

    }

    /**
     * 根据歌单id查询歌曲
     */
    @RequestMapping(value = "/detail", method = RequestMethod.GET)
    public Object detail(HttpServletRequest request) {
        String songListId = request.getParameter("songListId");
        return listSongService.listSongOfSongListId(Integer.parseInt(songListId));
    }


    /**
     * 删除歌单里的歌曲
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Object delete(HttpServletRequest request) {
        String songId = request.getParameter("songId").trim();                 //歌曲id
        String songListId = request.getParameter("songListId").trim();        //歌单id
        boolean flag = listSongService.deleteBySongIdAndSongListId(Integer.parseInt(songId), Integer.parseInt(songListId));
        return flag;
    }

    /**
     * 根据歌曲id 修改vip状态
     *
     * @param id:    歌曲ID
     * @param isVip: 是否是vip
     * @return cn.dev33.satoken.util.SaResult
     * @since 2023/3/3 13:41
     */
    @PostMapping("/change_vip_status/{id}/{isVip}")
    public SaResult updVipStatus(@PathVariable("id") String id, @PathVariable("isVip") Boolean isVip) {
        int rows = listSongService.updVipStatusById(id, isVip);
        return rows != 0 ? SaResult.ok("成功修改歌曲状态") : SaResult.error("修改VIP状态失败");
    }


}




















