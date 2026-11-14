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
     * <p>없으면 {@code false} 다. 한 건을 판정하지 못했다고 점검 전체를 멈추지 않도록, 그 파일에 한정된 실패(경로가 루트를
     * 벗어남·읽을 수 없음)도 {@code false} 로 본다. 다만 저장소 자체에 닿지 못해 어느 파일도 판정할 수 없을 때(원격 저장소의
     * 연결 실패·권한 거부·5xx)는 예외를 던진다 — 그때 {@code false} 를 주면 장애가 전량 유실처럼 보고된다(2026-11-14).
     */
    boolean exists(String filename, String targetPath);
    void delete(String filename, String targetPath);
    void delete(String filename);

    /** Capture an opaque identity for deferred deletion; an absent object must stay a no-op. */
    default String captureDeletionIdentity(String filename, String targetPath) {
        throw new UnsupportedOperationException("This storage adapter does not support safe deferred deletion");
    }

    /** Idempotently remove only the captured object, never a replacement at the same path. */
    default void deleteCaptured(java.util.UUID intent, String filename, String targetPath, String identity) {
        throw new UnsupportedOperationException("This storage adapter does not support safe deferred deletion");
    }

    /** Release only the identity preparation created by an operation whose DB transaction rolled back. */
    default void releaseDeletionIdentity(String identity) {
        throw new UnsupportedOperationException("This storage adapter does not support safe deferred deletion");
    }
    Stream<Path> loadAll(String targetPath);
    Stream<Path> loadAll();
    Path load(String filename);
    void deleteAll();
}
