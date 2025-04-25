package com.cpt202.utils;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.ObjectMetadata;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@Component
public class OssUtil {

    @Autowired
    private OSS ossClient;

    @Value("${aliyun.oss.bucket-name}")
    private String bucketName;

    @Value("${aliyun.oss.endpoint}")
    private String endpoint;

    /**
     * 上传文件到OSS
     * @param file 文件
     * @param folderPath 文件夹路径（例如：song/、mv/）
     * @return 文件访问URL
     */
    public String uploadFile(MultipartFile file, String folderPath) throws IOException {
        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        String suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
        String fileName = folderPath + UUID.randomUUID().toString().replace("-", "") + suffix;

        // 设置文件元信息
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(getContentType(suffix));
        metadata.setContentLength(file.getSize());

        // 上传文件
        try (InputStream inputStream = file.getInputStream()) {
            ossClient.putObject(bucketName, fileName, inputStream, metadata);
        }

        // 返回文件访问URL
        return "https://" + bucketName + "." + endpoint + "/" + fileName;
    }

    /**
     * 获取文件的ContentType
     */
    private String getContentType(String suffix) {
        switch (suffix.toLowerCase()) {
            case ".mp3":
                return "audio/mpeg";
            case ".mp4":
                return "video/mp4";
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".png":
                return "image/png";
            default:
                return "application/octet-stream";
        }
    }

    /**
     * 删除OSS上的文件
     * @param fileUrl 文件的完整URL
     * @return 是否删除成功
     */
    public boolean deleteFile(String fileUrl) {
        // 从URL中提取Object Key (例如: song/xxxx.mp3)
        // 实现从阿里云OSS删除文件的逻辑
        // 例如: ossClient.deleteObject(bucketName, objectKey);
        // 返回删除结果
        // 注意: 需要添加异常处理
        System.out.println("Placeholder: Deleting file from OSS: " + fileUrl);
        // 替换为实际的删除逻辑和返回结果
        return true; // 暂时返回true
    }
} 