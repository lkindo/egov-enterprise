package nuri.business.service.file;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LocalFileStorageService 테스트")
class LocalFileStorageServiceTest {

    private LocalFileStorageService storageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        storageService = new LocalFileStorageService(tempDir.toString());
    }

    @Test
    @DisplayName("파일 저장 테스트")
    void store_Success() throws IOException {
        // Given
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        // When
        String savedName = storageService.store(file, "subdir");

        // Then
        assertThat(savedName).endsWith(".txt");
        assertThat(tempDir.resolve("subdir").resolve(savedName)).exists();
    }

    @Test
    @DisplayName("빈 파일 저장 시 예외 발생")
    void store_EmptyFile_ThrowsException() {
        // Given
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", new byte[0]);

        // When & Then
        assertThatThrownBy(() -> storageService.store(file, "subdir"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
    }

    @Test
    @DisplayName("리소스 로드 테스트")
    void loadAsResource_Success() throws IOException {
        // Given
        Path subdir = tempDir.resolve("subdir");
        Files.createDirectories(subdir);
        Path file = subdir.resolve("test.txt");
        Files.write(file, "content".getBytes());

        // When
        Resource resource = storageService.loadAsResource("test.txt", "subdir");

        // Then
        assertThat(resource.exists()).isTrue();
        assertThat(resource.getFilename()).isEqualTo("test.txt");
    }

    @Test
    @DisplayName("존재하지 않는 리소스 로드 시 예외 발생")
    void loadAsResource_NotFound_ThrowsException() {
        // When & Then
        assertThatThrownBy(() -> storageService.loadAsResource("nonexistent.txt", "subdir"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("파일 삭제 테스트")
    void delete_Success() throws IOException {
        // Given
        Path subdir = tempDir.resolve("subdir");
        Files.createDirectories(subdir);
        Path file = subdir.resolve("test.txt");
        Files.write(file, "content".getBytes());

        // When
        storageService.delete("test.txt", "subdir");

        // Then
        assertThat(file).doesNotExist();
    }

    @Test
    @DisplayName("모든 파일 삭제 테스트")
    void deleteAll_Success() throws IOException {
        // Given
        Files.createDirectories(tempDir.resolve("dir1"));
        Files.write(tempDir.resolve("dir1/file1.txt"), "content".getBytes());

        // When
        storageService.deleteAll();

        // Then
        assertThat(tempDir).doesNotExist(); // LocalFileStorageService.deleteAll() deletes rootLocation
    }

    @Test
    @DisplayName("파일 저장 테스트 (경로 없음 오버로딩)")
    void store_Overload_Success() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test2.txt", "text/plain", "content".getBytes());
        String savedName = storageService.store(file);
        assertThat(savedName).endsWith(".txt");
        assertThat(tempDir.resolve(savedName)).exists();
    }

    @Test
    @DisplayName("파일 읽기 오버로딩")
    void loadAsResource_Overload_Success() throws IOException {
        Path file = tempDir.resolve("test2.txt");
        Files.write(file, "content".getBytes());
        Resource resource = storageService.loadAsResource("test2.txt");
        assertThat(resource.exists()).isTrue();
    }

    @Test
    @DisplayName("파일 삭제 오버로딩")
    void delete_Overload_Success() throws IOException {
        Path file = tempDir.resolve("test3.txt");
        Files.write(file, "content".getBytes());
        storageService.delete("test3.txt");
        assertThat(file).doesNotExist();
    }

    @Test
    @DisplayName("초기화 (init) 테스트")
    void init_Success() {
        storageService.init();
        assertThat(tempDir).exists();
    }

    @Test
    @DisplayName("전체 로드 (loadAll) 테스트")
    void loadAll_Success() throws IOException {
        Files.write(tempDir.resolve("load1.txt"), "content".getBytes());
        Files.write(tempDir.resolve("load2.txt"), "content".getBytes());

        java.util.stream.Stream<Path> stream = storageService.loadAll();
        assertThat(stream).hasSize(2);
    }

    @Test
    @DisplayName("경로 기반 전체 로드 (loadAll with path) 테스트")
    void loadAll_WithPath_Success() throws IOException {
        Path subdir = tempDir.resolve("subload");
        Files.createDirectories(subdir);
        Files.write(subdir.resolve("load1.txt"), "content".getBytes());
        
        java.util.stream.Stream<Path> stream = storageService.loadAll("subload");
        assertThat(stream).hasSize(1);
    }

    @Test
    @DisplayName("단일 경로 로드 (load) 테스트")
    void load_Success() {
        Path path = storageService.load("test.txt");
        assertThat(path).isNotNull();
        assertThat(path.toString()).endsWith("test.txt");
    }

    @Test
    @DisplayName("존재하지 않는 폴더 loadAll 예외")
    void loadAll_Exception() {
        // 존재하지 않는 디렉토리 스캔을 시도하면 IOException 발생, BusinessException으로 변환됨
        assertThatThrownBy(() -> storageService.loadAll("not_exists"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Test
    @DisplayName("잘못된 경로로 파일 저장 시 IO 예외 발생")
    void store_IOException() {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());
        // null targetPath는 requireNonNull에서 NullPointerException이 나겠지만,
        // 잘못된 경로 (예: null 바이트 포함 등)
        assertThatThrownBy(() -> storageService.store(file, "invalid\0path"))
                .isInstanceOf(Exception.class);
    }
}
