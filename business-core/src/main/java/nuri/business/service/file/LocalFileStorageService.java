package nuri.business.service.file;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.storage.FileStorageService;
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
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * 로컬 파일 저장 서비스
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
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage location", e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        return store(file, "");
    }

    @Override
    public String store(MultipartFile file, String targetPath) {
        String originalFilename = StringUtils
                .cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String savedFilename = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");

        try {
            if (file.isEmpty()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }

            Path destinationDir = this.rootLocation.resolve(Objects.requireNonNull(targetPath));
            Files.createDirectories(destinationDir);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationDir.resolve(savedFilename), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BusinessException("File storage failed: " + e.getMessage(), CommonErrorCode.INTERNAL_SERVER_ERROR);
        }

        return savedFilename;
    }

    @Override
    public Resource loadAsResource(String filename, String targetPath) {
        try {
            Path file = rootLocation.resolve(Objects.requireNonNull(targetPath))
                    .resolve(Objects.requireNonNull(filename));
            Resource resource = new UrlResource(Objects.requireNonNull(file.toUri()));
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
            }
        } catch (MalformedURLException e) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    @Override
    public void delete(String filename, String targetPath) {
        try {
            Path file = rootLocation.resolve(Objects.requireNonNull(targetPath))
                    .resolve(Objects.requireNonNull(filename));
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filename, e);
        }
    }

    @Override
    public void delete(String filename) {
        try {
            Path file = rootLocation.resolve(Objects.requireNonNull(filename));
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filename, e);
        }
    }

    @Override
    public Stream<Path> loadAll(String targetPath) {
        try {
            Path path = rootLocation.resolve(Objects.requireNonNull(targetPath));
            return Files.walk(path, 1)
                    .filter(p -> !p.equals(path))
                    .map(path::relativize);
        } catch (IOException e) {
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public Stream<Path> loadAll() {
        return loadAll("");
    }

    @Override
    public Path load(String filename) {
        return rootLocation.resolve(Objects.requireNonNull(filename));
    }

    @Override
    public Resource loadAsResource(String filename) {
        return loadAsResource(filename, "");
    }

    @Override
    public void deleteAll() {
        // Files.walk 의 Stream 은 열린 디렉터리 핸들(FD)을 백킹으로 하므로 try-with-resources 로 반드시 close.
        try (java.util.stream.Stream<java.nio.file.Path> walk = Files.walk(rootLocation)) {
            walk.sorted((a, b) -> b.compareTo(a))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.error("Failed to delete file: {}", path, e);
                        }
                    });
        } catch (IOException e) {
            log.error("Failed to delete all files", e);
        }
    }
}
