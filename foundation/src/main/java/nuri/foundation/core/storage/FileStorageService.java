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

    /**
     * 실물이 저장소에 있는지만 확인한다 — <b>바이트를 읽지 않는다</b>.
     *
     * <p>정합성 점검(DB 레코드 ↔ 저장소 실물)에서 수백~수천 건을 확인해야 하므로, 존재 확인에
     * {@code loadAsResource} 를 쓰면 예외 생성·리소스 열기 비용이 건마다 붙는다. 점검은 "있다/없다"만
     * 필요하다.
     *
     * <p>구현체는 <b>실패를 예외로 던지지 않는다</b> — 없으면 {@code false} 다. 점검 도중 한 건이
     * 예외를 던져 전체가 멈추면 정작 알아야 할 전체 규모를 알 수 없다.
     */
    boolean exists(String filename, String targetPath);
    void delete(String filename, String targetPath);
    void delete(String filename);
    Stream<Path> loadAll(String targetPath);
    Stream<Path> loadAll();
    Path load(String filename);
    void deleteAll();
}
