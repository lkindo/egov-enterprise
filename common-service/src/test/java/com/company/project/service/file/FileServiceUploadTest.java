package com.company.project.service.file;

import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceUploadTest {

    @Mock
    private FileMasterRepository fileMasterRepository;

    @Mock
    private FileDetailRepository fileDetailRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private TransactionStatus transactionStatus;

    @Mock
    private MultipartFile multipartFile;

    private FileService fileService;

    @BeforeEach
    void setUp() {
        fileService = new FileService(fileMasterRepository, fileDetailRepository, transactionManager);
        ReflectionTestUtils.setField(fileService, "uploadDir", "./test-uploads");
    }

    @Test
    @DisplayName("UploadFiles processes I/O before transaction")
    void uploadFiles_shouldProcessIOBeforeTransaction() throws IOException {
        // given
        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getOriginalFilename()).willReturn("test.txt");
        given(multipartFile.getSize()).willReturn(100L);

        FileMaster savedMaster = FileMaster.builder().atchFileId("FILE_TEST").build();
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(savedMaster);

        given(transactionManager.getTransaction(any(TransactionDefinition.class))).willReturn(transactionStatus);

        // when
        String result = fileService.uploadFiles(List.of(multipartFile));

        // then
        assertThat(result).isEqualTo("FILE_TEST");

        InOrder inOrder = inOrder(multipartFile, transactionManager, fileMasterRepository);

        // 1. Verify file transfer (I/O) happens first
        inOrder.verify(multipartFile).transferTo(any(File.class));

        // 2. Verify transaction starts
        inOrder.verify(transactionManager).getTransaction(any(TransactionDefinition.class));

        // 3. Verify repository save (inside transaction)
        inOrder.verify(fileMasterRepository).save(any(FileMaster.class));

        // 4. Verify transaction commit
        inOrder.verify(transactionManager).commit(transactionStatus);
    }

    @Test
    @DisplayName("UpdateFiles processes I/O before transaction")
    void updateFiles_shouldProcessIOBeforeTransaction() throws IOException {
        // given
        String atchFileId = "FILE_TEST";
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();

        given(fileMasterRepository.findById(atchFileId)).willReturn(java.util.Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.emptyList());

        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getOriginalFilename()).willReturn("test.txt");
        given(multipartFile.getSize()).willReturn(100L);

        given(transactionManager.getTransaction(any(TransactionDefinition.class))).willReturn(transactionStatus);

        // when
        fileService.updateFiles(atchFileId, List.of(multipartFile));

        // then
        InOrder inOrder = inOrder(multipartFile, transactionManager, fileMasterRepository);

        // 1. Verify file transfer (I/O) happens first
        inOrder.verify(multipartFile).transferTo(any(File.class));

        // 2. Verify transaction starts
        inOrder.verify(transactionManager).getTransaction(any(TransactionDefinition.class));

        // 3. Verify findById (inside transaction)
        inOrder.verify(fileMasterRepository).findById(atchFileId);

        // 4. Verify repository save (inside transaction)
        inOrder.verify(fileMasterRepository).save(master);

        // 5. Verify transaction commit
        inOrder.verify(transactionManager).commit(transactionStatus);
    }

    @Test
    @DisplayName("UploadFiles cleans up files on transaction failure")
    void uploadFiles_shouldCleanupOnTransactionFailure() throws IOException {
        // given
        String tempDir = System.getProperty("java.io.tmpdir") + "/test-uploads-" + System.currentTimeMillis();
        new File(tempDir).mkdirs();
        ReflectionTestUtils.setField(fileService, "uploadDir", tempDir);

        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getOriginalFilename()).willReturn("test.txt");
        given(multipartFile.getSize()).willReturn(100L);

        FileMaster savedMaster = FileMaster.builder().atchFileId("FILE_TEST").build();
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(savedMaster);

        // Simulate real file creation
        doAnswer(invocation -> {
            File dest = invocation.getArgument(0);
            dest.createNewFile();
            return null;
        }).when(multipartFile).transferTo(any(File.class));

        given(transactionManager.getTransaction(any(TransactionDefinition.class))).willReturn(transactionStatus);

        // Simulate DB failure
        doThrow(new RuntimeException("DB Error")).when(transactionManager).commit(transactionStatus);

        // when & then
        assertThatThrownBy(() -> fileService.uploadFiles(List.of(multipartFile)))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("DB Error");

        // Verify cleanup
        File dir = new File(tempDir);
        File[] files = dir.listFiles();
        assertThat(files).isEmpty();

        // Cleanup dir
        if (files != null) {
            for (File f : files) f.delete();
        }
        dir.delete();
    }
}
