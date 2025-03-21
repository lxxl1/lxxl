package com.javaclimb.music.controller;

import com.alibaba.fastjson.JSONObject;
import com.javaclimb.music.domain.Collect;
import com.javaclimb.music.domain.Recommend;
import com.javaclimb.music.domain.Song;
import com.javaclimb.music.service.CollectService;
import com.javaclimb.music.service.SongService;
import com.javaclimb.music.utils.Consts;
import org.apache.mahout.cf.taste.common.TasteException;
import org.apache.mahout.cf.taste.impl.common.FastByIDMap;
import org.apache.mahout.cf.taste.impl.model.GenericDataModel;
import org.apache.mahout.cf.taste.impl.model.GenericPreference;
import org.apache.mahout.cf.taste.impl.model.GenericUserPreferenceArray;
import org.apache.mahout.cf.taste.impl.recommender.GenericItemBasedRecommender;
import org.apache.mahout.cf.taste.impl.similarity.UncenteredCosineSimilarity;
import org.apache.mahout.cf.taste.model.DataModel;
import org.apache.mahout.cf.taste.model.Preference;
import org.apache.mahout.cf.taste.model.PreferenceArray;
import org.apache.mahout.cf.taste.recommender.RecommendedItem;
import org.apache.mahout.cf.taste.recommender.Recommender;
import org.apache.mahout.cf.taste.similarity.ItemSimilarity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.*;

/**
 * 收藏控制类
 */
@RestController
@RequestMapping("/collect")
public class CollectController {

    //推荐数量
    public static int cfCount = 5;
    @Autowired
    private CollectService collectService;
    @Autowired
    private SongService songService;

    /**
     * 添加收藏
     */
    @RequestMapping(value = "/add", method = RequestMethod.POST)
    public Object addCollect(HttpServletRequest request) {
        JSONObject jsonObject = new JSONObject();
        String userId = request.getParameter("userId");           //用户id
        String type = request.getParameter("type");               //收藏类型（0歌曲1歌单）
        String songId = request.getParameter("songId");           //歌曲id
        if (songId == null || songId.equals("")) {
            jsonObject.put(Consts.CODE, 0);
            jsonObject.put(Consts.MSG, "收藏歌曲为空");
            return jsonObject;
        }
        if (collectService.existSongId(Integer.parseInt(userId), Integer.parseInt(songId))) {
            jsonObject.put(Consts.CODE, 2);
            jsonObject.put(Consts.MSG, "已收藏");
            return jsonObject;
        }

        //保存到收藏的对象中
        Collect Collect = new Collect();
        Collect.setUserId(Integer.parseInt(userId));
        Collect.setType(new Byte(type));
        Collect.setSongId(Integer.parseInt(songId));

        boolean flag = collectService.insert(Collect);
        if (flag) {   //保存成功
            jsonObject.put(Consts.CODE, 1);
            jsonObject.put(Consts.MSG, "收藏成功");
            return jsonObject;
        }
        jsonObject.put(Consts.CODE, 0);
        jsonObject.put(Consts.MSG, "收藏失败");
        return jsonObject;
    }

    /**
     * 删除收藏
     */
    @RequestMapping(value = "/delete", method = RequestMethod.GET)
    public Object deleteCollect(HttpServletRequest request) {
        String userId = request.getParameter("userId");           //用户id
        String songId = request.getParameter("songId");           //歌曲id
        boolean flag = collectService.deleteByUserIdSongId(Integer.parseInt(userId), Integer.parseInt(songId));
        return flag;
    }

    /**
     * 查询所有收藏
     */
    @RequestMapping(value = "/allCollect", method = RequestMethod.GET)
    public Object allCollect(HttpServletRequest request) {
        return collectService.allCollect();
    }

    /**
     * 查询某个用户的收藏列表
     */
    @RequestMapping(value = "/collectOfUserId", method = RequestMethod.GET)
    public Object collectOfUserId(HttpServletRequest request) {
        String userId = request.getParameter("userId");          //用户id
        return collectService.collectOfUserId(Integer.parseInt(userId));
    }

    /**
     * 查询某个用户的推荐歌曲列表
     */
    @RequestMapping(value = "/topRecommendOfUserId", method = RequestMethod.GET)
    public Object topRecommendOfUserId(HttpServletRequest request) {
        String uId = request.getParameter("userId");
        System.out.println("当前用户：" + uId);
        Long userId = 0l;//用户id
        if (!"null".equals(uId)) {
            userId = Long.parseLong(uId);
        }
        if (userId != 0l) {
            // 查到所有用户的收藏列表
            List<Collect> list = collectService.allCollect();
            //把收藏列表每一项的用户、歌曲提取出来放到新的list
            List<Recommend> allRecommend = new ArrayList<Recommend>();
            List<Long> cfItemIds = new ArrayList<Long>();
            for (Collect col : list) {
                Recommend r = new Recommend();
                r.setUserId(col.getUserId().longValue());
                r.setSongId(col.getSongId().longValue());
                r.setCommend(1);
                allRecommend.add(r);
            }
            DataModel dataModel = getDadaModel(allRecommend);
            cfItemIds = baseItem(Integer.valueOf(uId), dataModel);
            if (cfItemIds != null) {
                List<Song> ls = new ArrayList<Song>();
                for (Long l : cfItemIds) {
                    Song s = songService.selectByPrimaryKey(l.intValue());
                    ls.add(s);
                }
                return ls;
            }
        }
        return null;
    }

    /**
     * 根据数据库表数据，得到用户-音乐收藏分数矩阵
     *
     * @param allRecommend
     * @return
     */
    public DataModel getDadaModel(List<Recommend> allRecommend) {
        System.out.println("数据库表的数据总数： " + allRecommend.size());
        if (allRecommend != null && allRecommend.size() > 0) {
            // 用户id当key，用户收藏的歌曲id列表当value，存到map里
            Map<Long, List<Preference>> map = new HashMap<Long, List<Preference>>();
            for (Recommend rItem : allRecommend) {
                List<Preference> preferenceList = new ArrayList<Preference>();
                Long userId = rItem.getUserId();
                Long songId = rItem.getSongId();
                Integer commend = rItem.getCommend();
                Integer preference = 0;
                if (commend != 0) {
                    preference = commend;
                    preferenceList.add(new GenericPreference(userId, songId, preference));
                    if (map.containsKey(userId)) {
                        List<Preference> preferenceListTemp = map.get(userId);
                        preferenceListTemp.addAll(preferenceList);
                        map.put(userId, preferenceListTemp);
                    } else {
                        map.put(userId, preferenceList);
                    }
                }
            }

            FastByIDMap<PreferenceArray> preferences = new FastByIDMap<PreferenceArray>();
            Set<Long> set = map.keySet();
            for (Long i : set) {
                List<Preference> preList = map.get(i);
                preferences.put(i, new GenericUserPreferenceArray(preList));
            }
            DataModel model = new GenericDataModel(preferences);
            return model;

        } else {
            System.out.println("******数据库中没有任何音乐收藏记录！******");
            return null;
        }
    }

    /**
     * 基于音乐的协同过滤推荐
     *
     * @param userId
     * @param model
     * @return
     */
    public List<Long> baseItem(Integer userId, DataModel model) {
        if (model == null) {
            return null;
        }
        try {
            ItemSimilarity similarity = new UncenteredCosineSimilarity(model);
            Recommender recommender = new GenericItemBasedRecommender(model, similarity);
            List<RecommendedItem> items = recommender.recommend(userId.longValue(), cfCount);
            List<Long> cfItemIds = new ArrayList<Long>();
            System.out.println("推荐音乐id集合：");
            for (RecommendedItem ri : items) {
                Long itemid = ri.getItemID();
                cfItemIds.add(itemid);
            }
            System.out.println(cfItemIds);
            return cfItemIds;
        } catch (TasteException e) {
            e.printStackTrace();
        }
        return null;
    }

}






















