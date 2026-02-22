package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    void testStore_PathTraversal() {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());
        String targetPath = "../sensitive";

        assertThrows(BusinessException.class, () -> {
            storageService.store(file, targetPath);
        });
    }

    @Test
    void testLoadAsResource_PathTraversal() {
        String targetPath = "../sensitive";
        String filename = "passwd";

        assertThrows(BusinessException.class, () -> {
            storageService.loadAsResource(filename, targetPath);
        });
    }

    @Test
    void testDelete_PathTraversal() {
        String targetPath = "../sensitive";
        String filename = "passwd";

        assertThrows(BusinessException.class, () -> {
            storageService.delete(filename, targetPath);
        });
    }

    @Test
    void testLoadAll_PathTraversal() {
        String targetPath = "../sensitive";

        assertThrows(BusinessException.class, () -> {
            storageService.loadAll(targetPath);
        });
    }
}
