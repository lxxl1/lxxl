package com.javaclimb.music.domain;

import java.io.Serializable;

/**
 * 推荐
 */
public class Recommend implements Serializable {
    private Long userId; //用户id
    private Long songId; //歌曲id
    private Integer commend; //收藏数
    
	public Long getUserId() {
		return userId;
	}
	public void setUserId(Long userId) {
		this.userId = userId;
	}
	public Long getSongId() {
		return songId;
	}
	public void setSongId(Long songId) {
		this.songId = songId;
	}
	public Integer getCommend() {
		return commend;
	}
	public void setCommend(Integer commend) {
		this.commend = commend;
	}

}
