package com.cpt202.kmeans;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
/**
 * kMeans类
 *
 */
public class KMeans<T extends Item> {
	
	private int dimension;
	
	private int[] dimensionKeys;
	
	private List<T> datas;
	
	private Cluster<T>[] clusters;
	
	private int centers;
	
	private CenterItem[] prevCenterItems;

	private Item[] initCenterItems;
	
	private Comparator<Item> comparator;
	
	public KMeans(int dimension, int centers, List<T> datas) {
		this(dimension, centers, datas, null);
	}
	
	public KMeans(int dimension, int centers, List<T> datas, Comparator<Item> comparator) {
		this(dimension, datas, comparator, Utils.getRandom(centers, datas.size()));
	}
	
	public KMeans(int dimension, List<T> datas, Comparator<Item> comparator, int[] centerIndexs){
		Item[] centerItems = new Item[centerIndexs.length];
		for(int i = 0; i < centerIndexs.length; i++){
			centerItems[i] = datas.get(centerIndexs[i]);
		}
		this.init(dimension, datas, comparator, centerItems);
	}
	
	public KMeans(int dimension, List<T> datas, Comparator<Item> comparator, Item[] centerItems){
		this.init(dimension, datas, comparator, centerItems);
	}
	
	private void init(int dimension, List<T> datas, Comparator<Item> comparator, Item[] centerItems) {
		this.dimension       = dimension;
		this.datas           = datas;
		this.centers         = centerItems.length;
		this.clusters        = new Cluster[centerItems.length];
		this.comparator      = comparator;
		this.initCenterItems = centerItems;
		this.prevCenterItems = new CenterItem[centerItems.length];
		this.dimensionKeys   = new int[this.dimension];
		
		this.dimensionKeys = Utils.createDimensionKeys(this.dimension);
		initCenterItems(centerItems, dimensionKeys, this.comparator);
	}
	
	private void initCenterItems(Item[] centerItems, int[] dimensionKeys, Comparator<Item> comparator){
		for(int i = 0; i < centerItems.length; i++){
			clusters[i] = new Cluster<T>(dimensionKeys, createCenterItem(centerItems[i], dimensionKeys), comparator);
		}
	}
	
	public void setDimensionKeys(int[] dimensionKeys) {
		this.dimensionKeys = dimensionKeys;
		this.dimension = this.dimensionKeys.length;
		initCenterItems(this.initCenterItems, this.dimensionKeys, this.comparator);
	}
	
	public int beginAdjust(){
		return beginAdjust(50);
	}
	
	public int beginAdjust(int counts){
		int i = 0;
		if(counts == 0){
			do{
				doAdjust();
				i++;
			}while(!checkCenterItem(this.prevCenterItems, clusters, this.dimensionKeys));
		}else if(counts > 0){
			do{
				doAdjust();
				i++;
			}while(!checkCenterItem(this.prevCenterItems, clusters, this.dimensionKeys) && i < counts);
		}
		return i;
	}
	
	public void doAdjust(){
		
		for(int i = 0; i < this.clusters.length; i++){
			Cluster<T> cluster = this.clusters[i];
			this.prevCenterItems[i] = cluster.getCenterItem();
			cluster.clear();
		}
		
		for(T item : this.datas){
			double     minDistance = Double.MAX_VALUE;
			Cluster<T> mincluster  = null;
			for(Cluster<T> cluster : this.clusters){
				CenterItem centerItem = cluster.getCenterItem();
				double distance = Utils.getDistance(centerItem, item, this.dimensionKeys);
				if(distance < minDistance){
					minDistance = distance;
					mincluster  = cluster;
				}
			}
			mincluster.addItem(item, minDistance);
		}
		
		for(Cluster<T> cluster : this.clusters){
			cluster.setCenterItem();
		}
		
	}
	
	private CenterItem createCenterItem(Item item, int[] dimensionKeys){
		CenterItem centerItem = new CenterItem();
		Utils.copyItemData(item, centerItem, dimensionKeys);
		return centerItem;
	}
	
	private boolean checkCenterItem(CenterItem[] centerItems, Cluster<T>[] clusters, int[] dimensionKeys){
		boolean result = true;
		for(int i = 0; i < clusters.length; i++){
			result = Utils.itemEqualsTo(centerItems[i], clusters[i].getCenterItem(), dimensionKeys);
			if(!result)
				break;
		}
		return result;
	}
	
	public Cluster<T>[] getClusters() {
		return clusters;
	}
	
	public Cluster<T>[] getClusters(Comparator<Cluster> comparator) {
		Arrays.sort(clusters, comparator);
		return clusters;
	}

	public int getCenters() {
		return centers;
	}

	public int[] getDimensionKeys() {
		return dimensionKeys;
	}
	
	public Comparator<Item> getComparator() {
		return comparator;
	}

	public void setComparator(Comparator<Item> comparator) {
		this.comparator = comparator;
	}

	public Item[] getInitCenterItems() {
		return initCenterItems;
	}

}
