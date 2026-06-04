package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailId;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.service.file.dto.FileDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.storage.FileStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @InjectMocks
    private FileService fileService;

    @Mock
    private FileMasterRepository fileMasterRepository;

    @Mock
    private FileDetailRepository fileDetailRepository;

    @Mock
    private FileStorageService storageService;

    @Test
    @DisplayName("파일 업로드 성공")
    void uploadFiles_Success() throws IOException {
        // given
        MockMultipartFile file = new MockMultipartFile("files", "test.jpg", "image/jpeg", "test content".getBytes());
        List<MultipartFile> files = Collections.singletonList(file);
        
        FileMaster master = new FileMaster("FILE_123");
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(master);
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored_name.jpg");

        // when
        String atchFileId = fileService.uploadFiles(files);

        // then
        assertThat(atchFileId).startsWith("FILE_");
        verify(fileMasterRepository, times(1)).save(any(FileMaster.class));
        verify(fileDetailRepository, times(1)).save(any(FileDetail.class));
        verify(storageService, times(1)).store(any(MultipartFile.class), anyString());
    }

    @Test
    @DisplayName("허용되지 않은 확장자 업로드 시 예외 발생")
    void uploadFiles_InvalidExtension() {
        // given
        MockMultipartFile file = new MockMultipartFile("files", "test.exe", "application/octet-stream", "content".getBytes());
        List<MultipartFile> files = Collections.singletonList(file);

        // when & then
        assertThatThrownBy(() -> fileService.uploadFiles(files))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 목록 조회")
    void getFileList() {
        // given
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("test.jpg")
                .build();

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(detail));

        // when
        List<FileDto> result = fileService.getFileList(atchFileId);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrignlFileNm()).isEqualTo("test.jpg");
    }

    @Test
    @DisplayName("파일 리소스 조회")
    void getFileResource() throws IOException {
        // given
        String atchFileId = "FILE_123";
        Integer fileSn = 1;
        FileDetail detail = FileDetail.builder()
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        Resource resource = new ByteArrayResource("test".getBytes());

        given(fileDetailRepository.findById(any(FileDetailId.class))).willReturn(Optional.of(detail));
        given(storageService.loadAsResource("stored.jpg", "path")).willReturn(resource);

        // when
        Resource result = fileService.getFileResource(atchFileId, fileSn);

        // then
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("파일 전체 삭제")
    void deleteFiles() throws IOException {
        // given
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        FileDetail detail = FileDetail.builder()
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(detail));

        // when
        fileService.deleteFiles(atchFileId);

        // then
        verify(storageService, times(1)).delete("stored.jpg", "path");
        verify(fileMasterRepository, times(1)).delete(master);
    }

    @Test
    @DisplayName("파일 단건 삭제")
    void deleteFile() throws IOException {
        // given
        String atchFileId = "FILE_123";
        Integer fileSn = 1;
        FileDetail detail = FileDetail.builder()
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();

        given(fileDetailRepository.findById(any(FileDetailId.class))).willReturn(Optional.of(detail));

        // when
        fileService.deleteFile(atchFileId, fileSn);

        // then
        verify(storageService, times(1)).delete("stored.jpg", "path");
        verify(fileDetailRepository, times(1)).delete(detail);
    }

    @Test
    @DisplayName("파일 수정 (추가 업로드)")
    void updateFiles() throws IOException {
        // given
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        FileDetail existingDetail = FileDetail.builder().atchFileSeq(1).build();
        MockMultipartFile newFile = new MockMultipartFile("files", "new.jpg", "image/jpeg", "content".getBytes());

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(existingDetail));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("new_stored.jpg");

        // when
        fileService.updateFiles(atchFileId, Collections.singletonList(newFile));

        // then
        verify(fileDetailRepository, times(1)).save(any(FileDetail.class));
    }

    @Test
    @DisplayName("파일 목록 조회 - ID가 null인 경우 빈 목록 반환")
    void getFileList_NullId() {
        List<FileDto> result = fileService.getFileList(null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("파일 목록 조회 - 마스터 정보가 없는 경우 예외 발생")
    void getFileList_NotFound() {
        given(fileMasterRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> fileService.getFileList("FILE_MISSING"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 리소스 조회 - 상세 정보가 없는 경우 예외 발생")
    void getFileResource_NotFound() {
        given(fileDetailRepository.findById(any())).willReturn(Optional.empty());
        assertThatThrownBy(() -> fileService.getFileResource("FILE_123", 1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 업로드 - 빈 파일 포함 시 스킵")
    void uploadFiles_WithEmptyFile() throws IOException {
        MockMultipartFile emptyFile = new MockMultipartFile("files", "empty.jpg", "image/jpeg", new byte[0]);
        MockMultipartFile validFile = new MockMultipartFile("files", "valid.jpg", "image/jpeg", "content".getBytes());
        
        FileMaster master = new FileMaster("FILE_123");
        given(fileMasterRepository.save(any())).willReturn(master);
        given(storageService.store(any(), anyString())).willReturn("stored.jpg");

        fileService.uploadFiles(List.of(emptyFile, validFile));

        verify(storageService, times(1)).store(any(), anyString());
    }

    @Test
    @DisplayName("파일 업로드 - 확장자 없는 파일 업로드 시 예외 발생")
    void uploadFiles_NoExtension() {
        MockMultipartFile file = new MockMultipartFile("files", "noextension", "application/octet-stream", "content".getBytes());
        assertThatThrownBy(() -> fileService.uploadFiles(List.of(file)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 수정 - 기존 파일이 없는 경우 Sn이 1부터 시작")
    void updateFiles_NoExistingDetails() throws IOException {
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        MockMultipartFile file = new MockMultipartFile("files", "new.jpg", "image/jpeg", "content".getBytes());

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(List.of());
        given(storageService.store(any(), anyString())).willReturn("stored.jpg");

        fileService.updateFiles(atchFileId, List.of(file));

        verify(fileDetailRepository).save(argThat(d -> d.getAtchFileSeq() == 1));
    }

    @Test
    @DisplayName("전체 파일 목록 조회 - 키워드 포함")
    void getAllFileList_WithKeyword() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        given(fileDetailRepository.findByOrgnlFileNmContaining(eq("key"), any())).willReturn(org.springframework.data.domain.Page.empty());

        fileService.getAllFileList(pageable, "key");

        verify(fileDetailRepository).findByOrgnlFileNmContaining(eq("key"), any());
    }

    @Test
    @DisplayName("전체 파일 목록 조회 - 키워드 미포함")
    void getAllFileList_NoKeyword() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        given(fileDetailRepository.findAll(any(org.springframework.data.domain.Pageable.class))).willReturn(org.springframework.data.domain.Page.empty());

        fileService.getAllFileList(pageable, null);

        verify(fileDetailRepository).findAll(any(org.springframework.data.domain.Pageable.class));
    }
}
