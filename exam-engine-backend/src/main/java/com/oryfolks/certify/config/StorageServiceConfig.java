package com.oryfolks.certify.config;

import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class StorageServiceConfig {

    @Value("${app.storage.provider}")
    private String storageProvider;

    @Autowired
    private ApplicationContext applicationContext;

    @Bean
    @Primary
    public StorageService storageService() {
        if ("s3".equalsIgnoreCase(storageProvider)) {
            return (StorageService) applicationContext.getBean("s3");
        } else if ("local".equalsIgnoreCase(storageProvider)) {
            return (StorageService) applicationContext.getBean("local");
        } else {
            throw new IllegalStateException("Invalid app.storage.provider value: '" + storageProvider + "'. Allowed values are: 'local' or 's3'.");
        }
    }
}
