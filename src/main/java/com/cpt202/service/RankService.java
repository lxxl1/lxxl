package com.cpt202.service;

import com.cpt202.domain.Rank;

/**
 * 评价service接口
 */
public interface RankService {
    /**
     *增加
     */
    public boolean insert(Rank rank);

    /**
     * 查总分
     */
    public int selectScoreSum(Integer songListId);

    /**
     * 查总评分人数
     */
    public int selectRankNum(Integer songListId);

    /**
     * 计算平均分
     */
    public int rankOfSongListId(Integer songListId);
}
