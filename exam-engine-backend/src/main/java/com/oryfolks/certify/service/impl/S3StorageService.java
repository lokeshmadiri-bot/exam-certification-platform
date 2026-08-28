package com.oryfolks.certify.service.impl;

import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutBucketPolicyRequest;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@Service("s3")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
public class S3StorageService implements StorageService {

    @Value("${app.storage.s3.bucket-name}")
    private String bucketName;

    @Value("${app.storage.s3.region}")
    private String region;

    @Value("${app.storage.s3.access-key}")
    private String accessKey;

    @Value("${app.storage.s3.secret-key}")
    private String secretKey;

    @Value("${app.storage.s3.endpoint:}")
    private String endpoint;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (bucketName == null || bucketName.isBlank() ||
            region == null || region.isBlank() ||
            accessKey == null || accessKey.isBlank() ||
            secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("AWS S3 configurations (bucket-name, region, access-key, secret-key) are missing but S3 storage provider is selected.");
        }

        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ));

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint))
                   .forcePathStyle(true);
        }

        this.s3Client = builder.build();

        System.out.println("=================================================================");
        System.out.println("=== INITIALIZING S3/MINIO STORAGE SERVICE =======================");
        System.out.println("Target Bucket: " + bucketName);
        System.out.println("Endpoint:      " + (endpoint != null && !endpoint.isBlank() ? endpoint : "AWS S3 default"));
        System.out.println("Region:        " + region);
        System.out.println("Access Key:    " + accessKey);
        System.out.println("=================================================================");

        // Proactively verify bucket exists, create it if missing
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            System.out.println("Storage bucket verified and accessible: " + bucketName);
        } catch (NoSuchBucketException e) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                System.out.println("Successfully created storage bucket: " + bucketName);
            } catch (Exception ex) {
                throw new IllegalStateException("MinIO/S3 Configuration Error: Failed to auto-create required storage bucket '" + bucketName + "' on endpoint '" + endpoint + "': " + ex.getMessage(), ex);
            }
        } catch (Exception e) {
            throw new IllegalStateException("MinIO/S3 Connection/Configuration Error: Storage bucket '" + bucketName + "' on endpoint '" + endpoint + "' is missing or inaccessible: " + e.getMessage(), e);
        }

        // Set public read bucket policy to allow anonymous access to uploaded recordings/snapshots
        try {
            String policyJson = "{\n" +
                    "  \"Version\": \"2012-10-17\",\n" +
                    "  \"Statement\": [\n" +
                    "    {\n" +
                    "      \"Sid\": \"PublicRead\",\n" +
                    "      \"Effect\": \"Allow\",\n" +
                    "      \"Principal\": \"*\",\n" +
                    "      \"Action\": [\"s3:GetObject\"],\n" +
                    "      \"Resource\": [\"arn:aws:s3:::" + bucketName + "/*\"]\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";
            s3Client.putBucketPolicy(PutBucketPolicyRequest.builder()
                    .bucket(bucketName)
                    .policy(policyJson)
                    .build());
            System.out.println("Successfully set bucket public read policy for: " + bucketName);
        } catch (Exception ex) {
            System.err.println("WARNING: Failed to set bucket public read policy: " + ex.getMessage());
        }
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

            String contentType = file.getContentType();
            if (key.endsWith(".webm")) {
                contentType = "video/webm";
            } else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (key.endsWith(".png")) {
                contentType = "image/png";
            }

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Return S3 resource URL
            if (endpoint != null && !endpoint.isBlank()) {
                String baseEndpoint = endpoint;
                if (!baseEndpoint.endsWith("/")) {
                    baseEndpoint += "/";
                }
                return baseEndpoint + bucketName + "/" + key;
            } else {
                return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }
}
