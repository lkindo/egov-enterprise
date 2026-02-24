package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalFileStorageServiceTest {

    private LocalFileStorageService storageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        storageService = new LocalFileStorageService(tempDir.toString());
        storageService.init();
    }

    @Test
    @DisplayName("Load resource with path traversal should throw BusinessException(ACCESS_DENIED)")
    void loadAsResource_pathTraversal_throwsException() throws IOException {
        // Create a file outside the root (in the parent directory of tempDir)
        Path parentDir = tempDir.getParent();
        // Use a unique name to avoid conflicts
        Path secretFile = parentDir.resolve("secret_" + System.currentTimeMillis() + ".txt");
        Files.writeString(secretFile, "secret data");
        secretFile.toFile().deleteOnExit();

        // Attempt to access it via traversal
        // Calculate relative path from tempDir to secretFile
        // Since both are under /tmp (usually), ".." should work.
        // Specifically, if tempDir is /tmp/junit..., and secretFile is /tmp/secret...,
        // then "../secret..." works.
        String relativePath = "../" + secretFile.getFileName().toString();

        try {
            // We expect this to fail with ACCESS_DENIED once fixed.
            // Currently, it might succeed (no exception) or throw RESOURCE_NOT_FOUND if traversal logic is slightly off or file permissions block it.
            // But if it succeeds, the assertion fails.
            assertThatThrownBy(() -> storageService.loadAsResource(relativePath, ""))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ACCESS_DENIED);
        } finally {
            Files.deleteIfExists(secretFile);
        }
    }
}
