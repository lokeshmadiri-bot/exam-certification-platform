package com.oryfolks.certify.service.impl;

import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service("local")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    @Value("${app.storage.local.upload-dir}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        if (uploadDir == null || uploadDir.isBlank()) {
            throw new IllegalStateException("Local upload directory (UPLOAD_DIR) configuration is missing but local storage provider is selected.");
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String folderName) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty file.");
            }

            // Create target directory
            Path targetFolderPath = Paths.get(uploadDir, folderName).toAbsolutePath().normalize();
            Files.createDirectories(targetFolderPath);

            // Generate clean filename
            String originalFileName = file.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + extension;

            // Copy file to folder
            Path targetLocation = targetFolderPath.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Return relative access URL
            return "/uploads/" + folderName + "/" + fileName;

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Error: " + ex.getMessage(), ex);
        }
    }

    @Override
    public org.springframework.http.ResponseEntity<org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody> streamFile(String fileUrlOrPath, String rangeHeader) {
        if (fileUrlOrPath == null || fileUrlOrPath.isBlank()) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }

        String pathStr = fileUrlOrPath;
        if (pathStr.startsWith("/uploads/")) {
            pathStr = pathStr.substring(9);
        } else if (pathStr.startsWith("uploads/")) {
            pathStr = pathStr.substring(8);
        }

        Path targetPath = Paths.get(uploadDir, pathStr).toAbsolutePath().normalize();
        File file = targetPath.toFile();
        if (!file.exists()) {
            file = new File(fileUrlOrPath.startsWith("/") ? fileUrlOrPath.substring(1) : fileUrlOrPath);
        }

        if (file.exists() && file.isFile()) {
            return S3StorageService.streamLocalFile(file, rangeHeader);
        }

        // If it's an HTTP URL (e.g. MinIO), proxy it
        if (fileUrlOrPath.startsWith("http://") || fileUrlOrPath.startsWith("https://")) {
            try {
                java.net.URI uri = java.net.URI.create(fileUrlOrPath);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) uri.toURL().openConnection();
                if (rangeHeader != null) {
                    conn.setRequestProperty("Range", rangeHeader);
                }
                conn.connect();

                int code = conn.getResponseCode();
                if (code >= 400) {
                    return org.springframework.http.ResponseEntity.status(code).build();
                }

                org.springframework.http.HttpStatus status = org.springframework.http.HttpStatus.valueOf(code);
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, conn.getContentType() != null ? conn.getContentType() : "video/webm");
                headers.set(org.springframework.http.HttpHeaders.ACCEPT_RANGES, "bytes");
                String contentRange = conn.getHeaderField("Content-Range");
                if (contentRange != null) {
                    headers.set(org.springframework.http.HttpHeaders.CONTENT_RANGE, contentRange);
                }
                long len = conn.getContentLengthLong();
                if (len > 0) {
                    headers.setContentLength(len);
                }

                java.io.InputStream in = conn.getInputStream();
                org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody responseBody = outputStream -> {
                    try (in) {
                        byte[] buffer = new byte[16384];
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            outputStream.write(buffer, 0, read);
                        }
                        outputStream.flush();
                    } catch (Exception ignored) {}
                };

                return org.springframework.http.ResponseEntity.status(status).headers(headers).body(responseBody);
            } catch (Exception e) {
                System.err.println("Proxy streaming error in LocalStorageService: " + e.getMessage());
                return org.springframework.http.ResponseEntity.notFound().build();
            }
        }

        return org.springframework.http.ResponseEntity.notFound().build();
    }
}

