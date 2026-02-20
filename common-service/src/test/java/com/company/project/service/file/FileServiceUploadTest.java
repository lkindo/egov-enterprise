package com.company.project.service.file;

import com.company.project.core.storage.FileStorageService;
import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceUploadTest {

    @Mock
    private FileMasterRepository fileMasterRepository;

    @Mock
    private FileDetailRepository fileDetailRepository;

    @Mock
    private FileStorageService storageService;

    @Mock
    private MultipartFile multipartFile;

    @InjectMocks
    private FileService fileService;

    @BeforeEach
    void setUp() {
        // Mockito will inject mocks via @InjectMocks
    }

    @Test
    @DisplayName("?뚯씪 ?낅줈???깃났")
    void uploadFiles_success() throws IOException {
        // given
        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getOriginalFilename()).willReturn("test.txt");
        given(multipartFile.getSize()).willReturn(100L);

        FileMaster savedMaster = FileMaster.builder().atchFileId("FILE_TEST").build();
        given(fileMasterRepository.save(java.util.Objects.requireNonNull(any(FileMaster.class))))
                .willReturn(java.util.Objects.requireNonNull(savedMaster));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("saved_test.txt");

        // when
        String result = fileService.uploadFiles(List.of(multipartFile));

        // then
        assertThat(result).startsWith("FILE_");
        verify(fileMasterRepository).save(java.util.Objects.requireNonNull(any(FileMaster.class)));
        verify(storageService).store(eq(multipartFile), anyString());
        verify(fileDetailRepository).save(java.util.Objects.requireNonNull(any(FileDetail.class)));
    }

    @Test
    @DisplayName("?뚯씪 ?낅뜲?댄듃 ?깃났")
    void updateFiles_success() throws IOException {
        // given
        String atchFileId = "FILE_TEST";
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.emptyList());

        given(multipartFile.isEmpty()).willReturn(false);
        given(multipartFile.getOriginalFilename()).willReturn("test.txt");
        given(multipartFile.getSize()).willReturn(100L);
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("saved_test.txt");

        // when
        fileService.updateFiles(atchFileId, List.of(multipartFile));

        // then
        verify(fileMasterRepository).findById(atchFileId);
        verify(storageService).store(eq(multipartFile), anyString());
        verify(fileDetailRepository).save(java.util.Objects.requireNonNull(any(FileDetail.class)));
    }
}
