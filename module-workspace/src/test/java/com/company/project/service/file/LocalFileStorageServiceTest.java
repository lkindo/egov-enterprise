package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
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
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_INPUT_VALUE);
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
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
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
}
