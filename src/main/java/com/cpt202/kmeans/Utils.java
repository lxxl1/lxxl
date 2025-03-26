package com.cpt202.kmeans;

import java.io.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
/**
 * 工具类
 *
 */
public class Utils {

	public static Comparator<Cluster> defaultClusterComparator(){
		class DefaultComparator implements Comparator<Cluster>{

			public int compare(Cluster o1, Cluster o2) {
				int result = 0;
				double o1Distance = getDistance(o1.getCenterItem(), o1.getDimensionKeys());
				double o2Distance = getDistance(o2.getCenterItem(), o1.getDimensionKeys());
				if(o1Distance < o2Distance)
					result = 1;
				else if(o1Distance > o2Distance)
					result = -1;
				return result;
			}
		}

		DefaultComparator comparator = new DefaultComparator();
		return comparator;
	}

	public static Comparator<Item> defaultItemComparator(int dimension){
		return defaultItemComparator(createDimensionKeys(dimension));
	}

	public static Comparator<Item> defaultItemComparator(int[] dimensionKeys){
		class DefaultComparator implements Comparator<Item>{

			private int dimension;

			private int[] dimensionKeys;

			public DefaultComparator(int[] dimensionKeys) {
				this.dimension     = dimensionKeys.length;
				this.dimensionKeys = dimensionKeys;
			}

			public int compare(Item o1, Item o2) {
				int result = 0;
				double o1Distance = getDistance(o1, dimensionKeys);
				double o2Distance = getDistance(o2, dimensionKeys);
				if(o1Distance > o2Distance)
					result = 1;
				else if(o1Distance < o2Distance)
					result = -1;
				return result;
			}
		}

		DefaultComparator comparator = new DefaultComparator(dimensionKeys);
		return comparator;
	}

	public static Item getBasePoint(int dimension){
		return getBasePoint(createDimensionKeys(dimension));
	}

	public static Item getBasePoint(int[] dimensionKeys){
		Item basePoint = new CenterItem();
		for(int i = 0; i < dimensionKeys.length; i++){
			basePoint.setData(dimensionKeys[i], 0);
		}
		return basePoint;
	}

	public static double getDistance(Item source, int dimension){
		return getDistance(source, null, createDimensionKeys(dimension));
	}

	public static double getDistance(Item source, int[] dimensionKeys){
		return getDistance(source, null, dimensionKeys);
	}

	public static double getDistance(Item source, Item target, int dimension){
		return getDistance(source, target, createDimensionKeys(dimension));
	}

	public static double getDistance(Item source, Item target, int[] dimensionKeys){

		if(target == null)
			target = getBasePoint(dimensionKeys);

		double distance = -1;
		if(dimensionKeys.length == 1){
			distance = Math.abs(source.getData(dimensionKeys[0]) - target.getData(dimensionKeys[0]));
		}else{
			double difference = 0;
			for(int i = 0; i < dimensionKeys.length; i++){
				try{
					difference += Math.pow(source.getData(dimensionKeys[i]) - target.getData(dimensionKeys[i]), 2);
				}catch(Exception e){
					System.out.println("index:" + i);
					System.out.println("target:"+target.getData(dimensionKeys[i]));
					System.out.println("source:"+source.getData(0));
					System.out.println("source:"+source.getData(1));
					System.out.println("source:"+source.getData(2));
					e.printStackTrace();
				}
			}
			if(difference >= 0)
				distance = Math.sqrt(difference);
		}
		return distance;
	}


	public static int[] getRandom(int centers, int counts){
		int[] rands = new int[centers];

		for(int i = 0; i < rands.length; i++){
			rands[i] = -1;
		}

		for(int i = 0; i < rands.length; i++){
			Random random = new Random();
			int temp = random.nextInt(counts);
			while(!checkRand(rands, temp)){
				temp = random.nextInt(counts);
			}
			rands[i] = temp;
		}

		return rands;
	}

	private static boolean checkRand(int[] random, int data){
		boolean result = true;
		for(int randomData : random){
			if(randomData > 0 && randomData == data){
				result = false;
			}
		}

		return result;
	}

	public static boolean itemEqualsTo(Item source, Item target, int[] dimensionKeys){
		boolean result = true;
		for(int i = 0; i < dimensionKeys.length; i++){
			if(source.getData(dimensionKeys[i]) != target.getData(dimensionKeys[i])){
				result = false;
				break;
			}
		}
		return result;
	}

	public static int[] createDimensionKeys(int dimension){
		int[] dimensionKeys = new int[dimension];
		for(int i = 0; i < dimension; i++){
			dimensionKeys[i] = i;
		}
		return dimensionKeys;
	}

	public static void copyItemData(Item source, Item target, int dimension){
		copyItemData(source, target, createDimensionKeys(dimension));
	}

	public static void copyItemData(Item source, Item target, int[] dimensionKeys){
		for(int i = 0; i < dimensionKeys.length; i++){
			target.setData(dimensionKeys[i], source.getData(dimensionKeys[i]));
		}
	}

	public static List getItemString(Item item, int[] dimensionKeys){
		List<Long> list = new ArrayList<Long>();
		list.add(item.getData(dimensionKeys[0]));
		return list;
	}

	public static List getItemString(Item item, int dimension){
		return getItemString(item, createDimensionKeys(dimension));
	}

	public static void printItem(Item item, int dimension){
		System.out.print(getItemString(item, dimension));
	}

	public static List printItem(Item item, int[] dimensionKeys){
		return getItemString(item, dimensionKeys);
	}

	public static <T extends Item> List<List<Long>> printCluster(Cluster<T>[] clusters){
		List<List<Long>> lists = new ArrayList<List<Long>>();
		for(Cluster<T> cluster : clusters){
			List<T> items = cluster.getItems();
			List<Long> list = new ArrayList<Long>();
			for(Item item : items){
				list.add(item.getData(cluster.getDimensionKeys()[0]));
			}
			lists.add(list);
		}
		return lists;
	}

	public static <T> List<T> depCopy(List<T> srcList) {
		ByteArrayOutputStream byteOut = new ByteArrayOutputStream();
		try {
			ObjectOutputStream out = new ObjectOutputStream(byteOut);
			out.writeObject(srcList);

			ByteArrayInputStream byteIn = new ByteArrayInputStream(byteOut.toByteArray());
			ObjectInputStream inStream = new ObjectInputStream(byteIn);
			List<T> destList = (List<T>) inStream.readObject();
			return destList;
		} catch (IOException e) {
			e.printStackTrace();
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		}
		return null;
	}

}
