package com.company.project.service.file;

import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(FileServicePerformanceTest.TestConfig.class)
class FileServicePerformanceTest {

    @Autowired
    private FileService fileService;

    @Autowired
    private FileMasterRepository fileMasterRepository;

    @Autowired
    private FileDetailRepository fileDetailRepository;

    // Use a static field to capture the transaction state during execution
    static AtomicBoolean wasTransactionActiveDuringIO = new AtomicBoolean(false);

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public FileService benchmarkFileService(FileMasterRepository masterRepo, FileDetailRepository detailRepo, PlatformTransactionManager transactionManager) {
            return new FileService(masterRepo, detailRepo, transactionManager) {
                @Override
                protected void deletePhysicalFile(FileDetail detail) {
                    // Check if transaction is active
                    boolean isActive = TransactionSynchronizationManager.isActualTransactionActive();
                    wasTransactionActiveDuringIO.set(isActive);

                    // Simulate I/O (no sleep needed for this check, but good for realism if we timed it)
                    try {
                        Thread.sleep(10);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    // Call original method (which might fail if file doesn't exist, but we mock path)
                    // We don't need to call super because we are just testing the transaction boundary
                    // and we don't want actual file deletion errors in test.
                }
            };
        }
    }

    @Test
    @DisplayName("Verify that physical file deletion happens outside of transaction")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void testDeleteFilesTransactionBoundary() throws IOException {
        // Given
        String atchFileId = "FILE_TEST_001";
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();
        fileMasterRepository.save(master);

        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .fileSn(1)
                .fileStreCours("/tmp")
                .streFileNm("test.txt")
                .build();
        master.addFileDetail(detail);
        fileMasterRepository.save(master);

        // When
        fileService.deleteFiles(atchFileId);

        // Then
        // After optimization, this should be FALSE.
        assertThat(wasTransactionActiveDuringIO.get())
                .as("Transaction should NOT be active during I/O in the optimized implementation")
                .isFalse();

        // Verify DB deletion
        assertThat(fileMasterRepository.findById(atchFileId)).isEmpty();
    }
}
