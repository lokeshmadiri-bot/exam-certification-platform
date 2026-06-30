package com.oryfolks.certify.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String uploadFile(MultipartFile file, String folderName);
}
