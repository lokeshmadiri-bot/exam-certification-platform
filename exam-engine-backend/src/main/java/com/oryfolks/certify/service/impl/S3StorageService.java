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
                System.err.println("Warning: Failed to auto-create storage bucket '" + bucketName + "': " + ex.getMessage());
            }
        } catch (Exception e) {
            System.err.println("Warning: MinIO/S3 Storage endpoint '" + endpoint + "' is currently unreachable: " + e.getMessage() + ". Backend server will continue startup in resilient mode.");
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

    private String extractS3Key(String urlOrPath) {
        if (urlOrPath == null) return null;
        if (bucketName != null && urlOrPath.contains("/" + bucketName + "/")) {
            return urlOrPath.substring(urlOrPath.indexOf("/" + bucketName + "/") + bucketName.length() + 2);
        }
        if (urlOrPath.contains("recordings/")) {
            return urlOrPath.substring(urlOrPath.indexOf("recordings/"));
        }
        if (urlOrPath.contains("snapshots/")) {
            return urlOrPath.substring(urlOrPath.indexOf("snapshots/"));
        }
        return urlOrPath.startsWith("/") ? urlOrPath.substring(1) : urlOrPath;
    }

    @Override
    public org.springframework.http.ResponseEntity<org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody> streamFile(String fileUrlOrPath, String rangeHeader) {
        if (fileUrlOrPath == null || fileUrlOrPath.isBlank()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        // 1. If it exists on local filesystem (e.g. from local fallback), stream it directly
        String localCandidate = fileUrlOrPath.startsWith("/") ? fileUrlOrPath.substring(1) : fileUrlOrPath;
        java.io.File localFile = new java.io.File(localCandidate);
        if (!localFile.exists() && localCandidate.startsWith("uploads/")) {
            localFile = new java.io.File(localCandidate);
        }
        if (localFile.exists() && localFile.isFile()) {
            return streamLocalFile(localFile, rangeHeader);
        }

        // 2. Otherwise stream from S3 / MinIO
        if (s3Client == null) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        String key = extractS3Key(fileUrlOrPath);
        if (key == null || key.isBlank()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        try {
            software.amazon.awssdk.services.s3.model.GetObjectRequest.Builder reqBuilder = software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key);

            if (rangeHeader != null && !rangeHeader.isBlank()) {
                reqBuilder.range(rangeHeader);
            }

            software.amazon.awssdk.core.ResponseInputStream<software.amazon.awssdk.services.s3.model.GetObjectResponse> s3Stream =
                    s3Client.getObject(reqBuilder.build());
            software.amazon.awssdk.services.s3.model.GetObjectResponse response = s3Stream.response();

            org.springframework.http.HttpStatus status = (rangeHeader != null && !rangeHeader.isBlank())
                    ? org.springframework.http.HttpStatus.PARTIAL_CONTENT
                    : org.springframework.http.HttpStatus.OK;

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            String contentType = response.contentType() != null ? response.contentType() : "video/webm";
            headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType);
            headers.set(org.springframework.http.HttpHeaders.ACCEPT_RANGES, "bytes");

            if (response.contentLength() != null) {
                headers.setContentLength(response.contentLength());
            }
            if (response.contentRange() != null) {
                headers.set(org.springframework.http.HttpHeaders.CONTENT_RANGE, response.contentRange());
            }
            if (response.eTag() != null) {
                headers.setETag(response.eTag());
            }

            org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody responseBody = outputStream -> {
                try (java.io.InputStream in = s3Stream) {
                    byte[] buffer = new byte[16384];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    outputStream.flush();
                } catch (Exception ignored) {
                    // Client abort / socket closed
                }
            };

            return org.springframework.http.ResponseEntity.status(status).headers(headers).body(responseBody);
        } catch (software.amazon.awssdk.services.s3.model.NoSuchKeyException e) {
            return org.springframework.http.ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.err.println("Error streaming from S3 for key '" + key + "': " + e.getMessage());
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    public static org.springframework.http.ResponseEntity<org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody> streamLocalFile(java.io.File file, String rangeHeader) {
        if (!file.exists() || !file.isFile()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
        long fileLength = file.length();
        long start = 0;
        long end = fileLength - 1;
        boolean isRange = false;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] parts = rangeHeader.substring(6).split("-");
            try {
                if (!parts[0].isBlank()) {
                    start = Long.parseLong(parts[0].trim());
                }
                if (parts.length > 1 && !parts[1].isBlank()) {
                    end = Long.parseLong(parts[1].trim());
                }
                if (end >= fileLength) {
                    end = fileLength - 1;
                }
                if (start <= end) {
                    isRange = true;
                }
            } catch (Exception ignored) {}
        }

        long contentLength = end - start + 1;
        org.springframework.http.HttpStatus status = isRange ? org.springframework.http.HttpStatus.PARTIAL_CONTENT : org.springframework.http.HttpStatus.OK;

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        String contentType = file.getName().endsWith(".webm") ? "video/webm" :
                             file.getName().endsWith(".jpg") || file.getName().endsWith(".jpeg") ? "image/jpeg" :
                             file.getName().endsWith(".png") ? "image/png" : "application/octet-stream";
        headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType);
        headers.set(org.springframework.http.HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.setContentLength(contentLength);
        if (isRange) {
            headers.set(org.springframework.http.HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);
        }

        final long finalStart = start;
        final long finalLength = contentLength;

        org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody responseBody = outputStream -> {
            try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(file, "r")) {
                raf.seek(finalStart);
                byte[] buffer = new byte[16384];
                long remaining = finalLength;
                while (remaining > 0) {
                    int toRead = (int) Math.min(buffer.length, remaining);
                    int read = raf.read(buffer, 0, toRead);
                    if (read == -1) break;
                    outputStream.write(buffer, 0, read);
                    remaining -= read;
                }
                outputStream.flush();
            } catch (Exception ignored) {
                // Client abort
            }
        };

        return org.springframework.http.ResponseEntity.status(status).headers(headers).body(responseBody);
    }
}

