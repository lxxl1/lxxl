package com.javaclimb.music.kmeans;

import java.util.HashMap;
import java.util.Map;

public class CenterItem implements Item{
	private Map<Integer, Long> dataMap;
	public CenterItem() {
		this.dataMap = new HashMap<Integer, Long>();
	}
	@Override
	public boolean setData(int dimension, long data) {
		dataMap.put(dimension, data);
		return true;
	}

	@Override
	public long getData(int dimension) {
		return dataMap.get(dimension);
	}
	
}
