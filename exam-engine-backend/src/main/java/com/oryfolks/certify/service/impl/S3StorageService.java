package com.oryfolks.certify.service.impl;

import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@Service("s3")
public class S3StorageService implements StorageService {

    @Value("${app.storage.s3.bucket-name}")
    private String bucketName;

    @Value("${app.storage.s3.region}")
    private String region;

    @Value("${app.storage.s3.access-key}")
    private String accessKey;

    @Value("${app.storage.s3.secret-key}")
    private String secretKey;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            // Safe fallback so that app can start without throwing credentials exception
            System.err.println("AWS S3 Storage Credentials not supplied. S3 Upload will fail if invoked.");
            return;
        }

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .build();
    }

    @Override
    public String uploadFile(MultipartFile file, String folderName) {
        if (s3Client == null) {
            throw new RuntimeException("S3 Storage Service is not configured. Configure AWS credentials in properties.");
        }

        try {
            String originalFileName = file.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String key = folderName + "/" + UUID.randomUUID().toString() + extension;

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Return S3 resource URL
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }
}
