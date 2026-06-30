package com.oryfolks.certify.service.impl;

import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service("local")
public class LocalStorageService implements StorageService {

    @Value("${app.storage.local.upload-dir:uploads}")
    private String uploadDir;

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
}
