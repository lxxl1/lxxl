package com.cpt202.dto;

import lombok.Data;

/**
 * 用于接收添加新标签请求的数据传输对象
 */
@Data
public class AddTagRequest {
    private String name;
    private Integer userId;

    // 如果不使用 Lombok，请取消注释下面的 getter 和 setter
    /*
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }
    */
} 