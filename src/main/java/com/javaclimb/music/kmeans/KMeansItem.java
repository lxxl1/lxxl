package com.javaclimb.music.kmeans;
/**
 * KMeans数据类
 *
 */
public class KMeansItem implements Item{
	
	private long x;
	
	private int y;
	
	private int z;
	
	public KMeansItem() {}
	
	public KMeansItem(long x) {
		this.x = x;
	}

	public KMeansItem(long x, int y) {
		this.x = x;
		this.y = y;
	}

	public KMeansItem(long x, int y, int z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	
	@Override
	public boolean setData(int dimension, long data) {
		boolean result = true;
		switch(dimension){
			case 0 : x = data;break;
			case 1 : y = (int) data;break;
			case 2 : z = (int) data;break;
			default : x = data;break;
		}
		return result;
	}

	@Override
	public long getData(int dimension) {
		long data = 0;
		switch(dimension){
			case 0 : data = x;break;
			case 1 : data = y;break;
			case 2 : data = z;break;
			default : data = x;break;
		}
		return data;
	}
	
	public long getX() {
		return x;
	}

	public void setX(long x) {
		this.x = x;
	}

	public int getY() {
		return y;
	}

	public void setY(int y) {
		this.y = y;
	}

	public int getZ() {
		return z;
	}

	public void setZ(int z) {
		this.z = z;
	}
	
}
