package com.cpt202.controller;

import com.alibaba.fastjson.JSONObject;
import com.cpt202.common.Result;
import com.cpt202.domain.Singer;
import com.cpt202.service.SingerService;
import com.cpt202.utils.Consts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * 歌手控制类
 */
@RestController
@RequestMapping("/singer")
public class SingerController {

    @Autowired
    private SingerService singerService;

    /**
     * 添加歌手
     */
    @RequestMapping(value = "/add",method = RequestMethod.POST)
    public Result addSinger(HttpServletRequest request){
        String name = request.getParameter("name").trim();
        String sex = request.getParameter("sex").trim();
        String pic = request.getParameter("pic").trim();
        String birth = request.getParameter("birth").trim();
        String location = request.getParameter("location").trim();
        String introduction = request.getParameter("introduction").trim();

        Singer singer = new Singer();
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        Date birthDate = new Date();
        try {
            birthDate = dateFormat.parse(birth);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        singer.setName(name);
        singer.setSex(new Byte(sex));
        singer.setPic(pic);
        singer.setBirth(birthDate);
        singer.setLocation(location);
        singer.setIntroduction(introduction);
        boolean flag = singerService.addSinger(singer);
        if(flag){
            return Result.success();
        }
        return Result.failure("添加失败");
    }

    /**
     * 修改歌手
     */
    @RequestMapping(value = "/update",method = RequestMethod.POST)
    public Result updateSinger(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        String name = request.getParameter("name").trim();
        String sex = request.getParameter("sex").trim();
        String birth = request.getParameter("birth").trim();
        String location = request.getParameter("location").trim();
        String introduction = request.getParameter("introduction").trim();

        Singer singer = new Singer();
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        Date birthDate = new Date();
        try {
            birthDate = dateFormat.parse(birth);
        } catch (ParseException e) {
            e.printStackTrace();
        }
        singer.setId(Integer.parseInt(id));
        singer.setName(name);
        singer.setSex(new Byte(sex));
        singer.setBirth(birthDate);
        singer.setLocation(location);
        singer.setIntroduction(introduction);
        boolean flag = singerService.update(singer);
        if(flag){
            return Result.success();
        }
        return Result.failure("修改失败");
    }

    /**
     * 删除歌手
     */
    @RequestMapping(value = "/delete",method = RequestMethod.GET)
    public Result deleteSinger(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        boolean flag = singerService.delete(Integer.parseInt(id));
        if(flag){
            return Result.success();
        }
        return Result.failure("删除失败");
    }

    /**
     * 根据主键查询整个对象
     */
    @RequestMapping(value = "/selectByPrimaryKey",method = RequestMethod.GET)
    public Result selectByPrimaryKey(HttpServletRequest request){
        String id = request.getParameter("id").trim();
        return Result.success(singerService.selectByPrimaryKey(Integer.parseInt(id)));
    }

    /**
     * 查询所有歌手
     */
    @RequestMapping(value = "/allSinger",method = RequestMethod.GET)
    public Result allSinger(HttpServletRequest request){
        return Result.success(singerService.allSinger());
    }

    /**
     * 根据歌手名字模糊查询列表
     */
    @RequestMapping(value = "/singerOfName",method = RequestMethod.GET)
    public Result singerOfName(HttpServletRequest request){
        String name = request.getParameter("name").trim();
        return Result.success(singerService.singerOfName("%"+name+"%"));
    }

    /**
     * 根据性别查询
     */
    @RequestMapping(value = "/singerOfSex",method = RequestMethod.GET)
    public Result singerOfSex(HttpServletRequest request){
        String sex = request.getParameter("sex").trim();
        return Result.success(singerService.singerOfSex(Integer.parseInt(sex)));
    }

    /**
     * 更新歌手图片
     */
    @RequestMapping(value = "/updateSingerPic",method = RequestMethod.POST)
    public Result updateSingerPic(@RequestParam("file") MultipartFile avatorFile, @RequestParam("id")int id){
        if(avatorFile.isEmpty()){
            return Result.failure("文件上传失败");
        }
        //文件名=当前时间到毫秒+原来的文件名
        String fileName = System.currentTimeMillis()+avatorFile.getOriginalFilename();
        //文件路径
        String filePath = System.getProperty("user.dir")+System.getProperty("file.separator")+"img"
                +System.getProperty("file.separator")+"singerPic";
        //如果文件路径不存在，新增该路径
        File file1 = new File(filePath);
        if(!file1.exists()){
            file1.mkdir();
        }
        //实际的文件地址
        File dest = new File(filePath+System.getProperty("file.separator")+fileName);
        //存储到数据库里的相对文件地址
        String storeAvatorPath = "/img/singerPic/"+fileName;
        try {
            avatorFile.transferTo(dest);
            Singer singer = new Singer();
            singer.setId(id);
            singer.setPic(storeAvatorPath);
            boolean flag = singerService.update(singer);
            if(flag){
                return Result.success(storeAvatorPath);
            }
            return Result.failure("上传失败");
        } catch (IOException e) {
            return Result.failure("上传失败: " + e.getMessage());
        }
    }
}






















