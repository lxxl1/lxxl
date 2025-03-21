package com.javaclimb.music.kmeans;

import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

public class Cluster<T extends Item> {
	
	private List<T> items = null;
	
	private CenterItem centerItem;
	
	private double allDistance;
	
	private int dimension;
	 
	private int[] dimensionKeys;
	
	private Comparator<Item> comparator;
	
	public Cluster(int[] dimensionKeys) {
		init(dimensionKeys.length, dimensionKeys, null);
		this.centerItem = null;
	}
	
	public Cluster(int[] dimensionKeys, CenterItem centerItem){
		init(dimensionKeys.length, dimensionKeys, null);
		this.centerItem = centerItem;
	}
	
	public Cluster(int[] dimensionKeys, Comparator<Item> comparator) {
		init(dimensionKeys.length, dimensionKeys, comparator);
		this.centerItem = null;
	}

	public Cluster(int[] dimensionKeys, CenterItem centerItem, Comparator<Item> comparator) {
		init(dimensionKeys.length, dimensionKeys, comparator);
		this.centerItem = centerItem;
	}
	
	private void init(int dimension, int[] dimensionKeys, Comparator<Item> comparator){
		this.items         = new LinkedList<T>();
		this.dimension     = dimension;
		this.dimensionKeys = dimensionKeys;
		this.comparator    = comparator;
		this.allDistance   = 0;
	}
	
	public void setCenterItem(){
		if(this.comparator != null){
			Collections.sort(items, comparator);
			Collections.reverse(items);
		}
		this.centerItem = this.createCenterItem();
	}
	
	private CenterItem createCenterItem(){
		CenterItem centerItem = new CenterItem();
		int[] datas = new int[this.dimension];
		for(int i = 0; i < datas.length; i++){
			datas[i] = 0;
			centerItem.setData(i, 0);
		}
		for(T temp : items){
			for(int i = 0; i < this.dimensionKeys.length; i++){
				datas[i] += temp.getData(this.dimensionKeys[i]);
			}
		}
		for(int i = 0; i < this.dimensionKeys.length && this.items.size() > 0; i++){
			int data = datas[i] / (int)this.items.size();
			centerItem.setData(this.dimensionKeys[i], data);
		}
		return centerItem;
	}
	
	public List<T> getItems() {
		return items;
	}

	public void addItem(T item, double allDistance){
		this.allDistance += allDistance;
		this.items.add(item);
	}

	public CenterItem getCenterItem() {
		return centerItem;
	}

	public void setCenterItem(CenterItem centerItem) {
		this.centerItem = centerItem;
	}

	public void setItems(List<T> items) {
		this.items = items;
	}
	
	public void clear(){
		this.items.clear();
		this.allDistance = 0;
	}

	public double getAllDistance() {
		return allDistance;
	}
	
	
	public void addCluster(Cluster<T> cluster){
		this.items.addAll(cluster.getItems());
		this.centerItem = this.createCenterItem();
	}
	

	public void createAllDistance(){
		this.allDistance = 0;
		for(Item item : this.items){
			this.allDistance += Utils.getDistance(item, this.centerItem, this.dimensionKeys);
		}
	}

	public void setDimensionKeys(int[] dimensionKeys) {
		this.dimensionKeys = dimensionKeys;
	}

	public int[] getDimensionKeys() {
		return dimensionKeys;
	}

	public int getDimension() {
		return dimension;
	}

}
