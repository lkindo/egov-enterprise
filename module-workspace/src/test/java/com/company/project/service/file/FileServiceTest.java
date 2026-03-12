package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.storage.FileStorageService;
import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import com.company.project.service.file.dto.FileDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FileService 테스트")
class FileServiceTest {

    @Mock
    private FileMasterRepository fileMasterRepository;

    @Mock
    private FileDetailRepository fileDetailRepository;

    @Mock
    private FileStorageService storageService;

    @InjectMocks
    private FileService fileService;

    private String atchFileId = "FILE_1234567890";
    private FileMaster mockMaster;
    private FileDetail mockDetail;

    @BeforeEach
    void setUp() {
        mockMaster = FileMaster.builder().atchFileId(atchFileId).build();
        mockDetail = FileDetail.builder()
                .fileMaster(mockMaster)
                .fileSn(1)
                .fileStreCours("general/" + atchFileId)
                .streFileNm("saved_file.txt")
                .orignlFileNm("original_file.txt")
                .fileExtsn("txt")
                .fileMg(100L)
                .build();
    }

    @Test
    @DisplayName("파일 업로드 테스트")
    void uploadFiles_Success() throws IOException {
        // Given
        MultipartFile multipartFile = mock(MultipartFile.class);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getOriginalFilename()).thenReturn("test.txt");
        when(multipartFile.getSize()).thenReturn(100L);
        when(storageService.store(any(MultipartFile.class), anyString())).thenReturn("stored_test.txt");
        when(fileMasterRepository.save(any(FileMaster.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        String resultId = fileService.uploadFiles(List.of(multipartFile));

        // Then
        assertThat(resultId).startsWith("FILE_");
        verify(fileMasterRepository).save(any(FileMaster.class));
        verify(fileDetailRepository).save(any(FileDetail.class));
        verify(storageService).store(any(MultipartFile.class), anyString());
    }

    @Test
    @DisplayName("첨부파일 목록 조회 테스트")
    void getFileList_Success() {
        // Given
        when(fileMasterRepository.findById(atchFileId)).thenReturn(Optional.of(mockMaster));
        when(fileDetailRepository.findByFileMaster(mockMaster)).thenReturn(List.of(mockDetail));

        // When
        List<FileDto> result = fileService.getFileList(atchFileId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrignlFileNm()).isEqualTo("original_file.txt");
    }

    @Test
    @DisplayName("파일 리소스 조회 테스트")
    void getFileResource_Success() throws IOException {
        // Given
        Resource mockResource = mock(Resource.class);
        when(fileDetailRepository.findById(any())).thenReturn(Optional.of(mockDetail));
        when(storageService.loadAsResource(anyString(), anyString())).thenReturn(mockResource);

        // When
        Resource result = fileService.getFileResource(atchFileId, 1);

        // Then
        assertThat(result).isEqualTo(mockResource);
    }

    @Test
    @DisplayName("파일 전체 삭제 테스트")
    void deleteFiles_Success() throws IOException {
        // Given
        when(fileMasterRepository.findById(atchFileId)).thenReturn(Optional.of(mockMaster));
        when(fileDetailRepository.findByFileMaster(mockMaster)).thenReturn(List.of(mockDetail));

        // When
        fileService.deleteFiles(atchFileId);

        // Then
        verify(storageService).delete(anyString(), anyString());
        verify(fileMasterRepository).delete(mockMaster);
    }

    @Test
    @DisplayName("파일 단건 삭제 테스트")
    void deleteFile_Success() throws IOException {
        // Given
        when(fileDetailRepository.findById(any())).thenReturn(Optional.of(mockDetail));

        // When
        fileService.deleteFile(atchFileId, 1);

        // Then
        verify(storageService).delete(anyString(), anyString());
        verify(fileDetailRepository).delete(mockDetail);
    }

    @Test
    @DisplayName("파일 상세 조회 테스트")
    void getFileDetail_Success() {
        // Given
        when(fileDetailRepository.findById(any())).thenReturn(Optional.of(mockDetail));

        // When
        FileDto result = fileService.getFileDetail(atchFileId, 1);

        // Then
        assertThat(result.getOrignlFileNm()).isEqualTo("original_file.txt");
    }

    @Test
    @DisplayName("파일 상세 조회 실패 - 존재하지 않는 파일")
    void getFileDetail_Fail_NotFound() {
        // Given
        when(fileDetailRepository.findById(any())).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> fileService.getFileDetail(atchFileId, 1))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }
}
