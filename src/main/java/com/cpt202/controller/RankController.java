package com.cpt202.controller;

import com.alibaba.fastjson.JSONObject;
import com.cpt202.common.Result;
import com.cpt202.domain.Rank;
import com.cpt202.service.RankService;
import com.cpt202.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
public class RankController {

    @Autowired
    private RankService rankService;

    /**
     * 新增评价
     */
    @RequestMapping(value = "/rank/add",method = RequestMethod.POST)
    public Result add(HttpServletRequest request){
        String songListId = request.getParameter("songListId").trim();
        String consumerId = request.getParameter("consumerId").trim();
        String score = request.getParameter("score").trim();

        Rank rank = new Rank();
        rank.setSongListId(Integer.parseInt(songListId));
        rank.setConsumerId(Integer.parseInt(consumerId));
        rank.setScore(Integer.parseInt(score));

        boolean flag = rankService.insert(rank);
        if(flag){
            return Result.success();
        }
        return Result.failure("评价失败");
    }

    /**
     * 计算平均分
     */
    @RequestMapping(value = "/rank",method = RequestMethod.GET)
    public Result rankOfSongListId(HttpServletRequest request){
        String songListId = request.getParameter("songListId").trim();
        return Result.success(rankService.rankOfSongListId(Integer.parseInt(songListId)));
    }
}






















