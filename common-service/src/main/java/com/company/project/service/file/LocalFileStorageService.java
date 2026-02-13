package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.storage.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * 로컬 디스크 기반 파일 저장소 구현체
 */
@Slf4j
@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path rootLocation;

    public LocalFileStorageService(@Value("${file.upload.path:./storage/uploads}") String uploadPath) {
        this.rootLocation = Paths.get(uploadPath);
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage location", e);
        }
    }

    @Override
    public String store(MultipartFile file, String targetPath) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String savedFilename = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");

        try {
            if (file.isEmpty()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            }

            Path destinationDir = this.rootLocation.resolve(targetPath);
            Files.createDirectories(destinationDir);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationDir.resolve(savedFilename), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        return savedFilename;
    }

    @Override
    public Resource loadAsResource(String filename, String targetPath) {
        try {
            Path file = rootLocation.resolve(targetPath).resolve(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
            }
        } catch (MalformedURLException e) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    @Override
    public void delete(String filename, String targetPath) {
        try {
            Path file = rootLocation.resolve(targetPath).resolve(filename);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filename, e);
        }
    }

    @Override
    public Stream<Path> loadAll(String targetPath) {
        try {
            Path path = rootLocation.resolve(targetPath);
            return Files.walk(path, 1)
                    .filter(p -> !p.equals(path))
                    .map(path::relativize);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
