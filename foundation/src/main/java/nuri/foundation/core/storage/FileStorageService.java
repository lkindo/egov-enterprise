package nuri.foundation.core.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.util.stream.Stream;

/**
 * 파일 저장 서비스 인터페이스
 */
public interface FileStorageService {
    void init();
    String store(MultipartFile file);
    String store(MultipartFile file, String targetPath);
    Resource loadAsResource(String filename, String targetPath);
    Resource loadAsResource(String filename);
    void delete(String filename, String targetPath);
    void delete(String filename);
    Stream<Path> loadAll(String targetPath);
    Stream<Path> loadAll();
    Path load(String filename);
    void deleteAll();
}
