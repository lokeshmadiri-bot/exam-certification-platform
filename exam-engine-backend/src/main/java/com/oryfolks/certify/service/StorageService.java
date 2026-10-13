package com.oryfolks.certify.service;

import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

public interface StorageService {
    String uploadFile(MultipartFile file, String folderName);
    ResponseEntity<StreamingResponseBody> streamFile(String fileUrlOrPath, String rangeHeader);
}

