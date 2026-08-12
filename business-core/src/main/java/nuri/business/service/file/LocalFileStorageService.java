package nuri.business.service.file;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
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
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
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
        try {
            this.rootLocation = Paths.get(Objects.requireNonNull(uploadPath)).toAbsolutePath().normalize();
        } catch (InvalidPathException | NullPointerException exception) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        createRootLocation();
    }

    @Override
    public void init() {
        createRootLocation();
    }

    private void createRootLocation() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage location", e);
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public String store(MultipartFile file) {
        return store(file, "");
    }

    @Override
    public String store(MultipartFile file, String targetPath) {
        Objects.requireNonNull(file);
        String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename()));
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension != null && !extension.matches("[A-Za-z0-9]{1,10}")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        String normalizedExtension = extension == null ? "" : "." + extension.toLowerCase(Locale.ROOT);
        String savedFilename = UUID.randomUUID() + normalizedExtension;
        Path destinationFile = null;

        try {
            if (file.isEmpty()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }

            Path destinationDir = resolveWithinRoot(targetPath);
            Files.createDirectories(destinationDir);
            assertRealPathWithinRoot(destinationDir);
            destinationFile = destinationDir.resolve(savedFilename);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            if (destinationFile != null) {
                try {
                    Files.deleteIfExists(destinationFile);
                } catch (IOException cleanupFailure) {
                    e.addSuppressed(cleanupFailure);
                }
            }
            log.error("Could not store multipart file", e);
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }

        return savedFilename;
    }

    @Override
    public Resource loadAsResource(String filename, String targetPath) {
        try {
            Path file = resolveWithinRoot(targetPath, filename);
            if (!Files.isRegularFile(file) || !Files.isReadable(file)) {
                throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
            }
            assertRealPathWithinRoot(file);
            return new UrlResource(file.toUri());
        } catch (MalformedURLException e) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    @Override
    public void delete(String filename, String targetPath) {
        try {
            Path file = resolveWithinRoot(targetPath, filename);
            if (Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
                assertRealPathWithinRoot(file);
            }
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete stored file", e);
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public void delete(String filename) {
        delete(filename, "");
    }

    @Override
    public Stream<Path> loadAll(String targetPath) {
        try {
            Path path = resolveWithinRoot(targetPath);
            assertRealPathWithinRoot(path);
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
        return resolveWithinRoot(filename);
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

    /**
     * 사용자 또는 DB 값에서 조립된 상대 경로가 저장소 루트 밖으로 빠져나가지 못하게 한다.
     * 정규화 문자열 검사뿐 아니라 가장 가까운 실제 상위 경로를 확인해 심볼릭 링크 이탈도 막는다.
     */
    private Path resolveWithinRoot(String... components) {
        try {
            Path candidate = rootLocation;
            for (String component : components) {
                candidate = candidate.resolve(Objects.requireNonNull(component));
            }
            candidate = candidate.toAbsolutePath().normalize();
            if (!candidate.startsWith(rootLocation)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }

            Path existing = candidate;
            while (existing != null && !Files.exists(existing, LinkOption.NOFOLLOW_LINKS)) {
                existing = existing.getParent();
            }
            if (existing == null) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
            assertRealPathWithinRoot(existing);
            return candidate;
        } catch (InvalidPathException | NullPointerException exception) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private void assertRealPathWithinRoot(Path candidate) {
        try {
            Path realRoot = rootLocation.toRealPath();
            Path realCandidate = candidate.toRealPath();
            if (!realCandidate.startsWith(realRoot)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
        } catch (IOException exception) {
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
