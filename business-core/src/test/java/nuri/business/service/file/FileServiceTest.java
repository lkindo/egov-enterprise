package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;

import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.service.file.dto.FileDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
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
import static org.mockito.ArgumentMatchers.anyInt;
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

    /**
     * 도달성 인가는 {@link FileAccessPolicyTest} 가 판정 표 단위로 검증한다.
     * 여기서는 기본 목(허용)으로 두어 이 클래스가 계속 <b>파일 입출력 계약</b>만 보게 한다.
     */
    @Mock
    private FileAccessPolicy accessPolicy;

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
        // [IDOR] 인가 가드가 실제로 불렸는지 못박는다. 이 단언이 없으면 assertReadable 호출을
        // **지워도 이 테스트가 통과**한다(2026-08-04 pitest 실측: "removed call" 뮤테이션 SURVIVED).
        // 정책의 내용은 FileAccessPolicyTest 가 보고, 여기서는 '경로가 가드를 통과한다'만 본다.
        verify(accessPolicy).assertReadable(master);
    }

    @Test
    @DisplayName("파일 리소스 조회")
    void getFileResource() throws IOException {
        // given
        String atchFileId = "FILE_123";
        Integer fileSn = 1;
        FileMaster master = new FileMaster(atchFileId);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        Resource resource = new ByteArrayResource("test".getBytes());

        given(fileDetailRepository.findByFileMasterAtchFileIdAndAtchFileSeq(anyString(), anyInt())).willReturn(Optional.of(detail));
        given(storageService.loadAsResource("stored.jpg", "path")).willReturn(resource);

        // when
        Resource result = fileService.getFileResource(atchFileId, fileSn);

        // then
        assertThat(result).isNotNull();
        // [IDOR] 다운로드는 목록보다 노출이 크다 — 가드 호출을 여기서도 못박는다.
        verify(accessPolicy).assertReadable(master);
    }

    @Test
    @DisplayName("[IDOR] 단건 상세도 인가 가드를 통과한다")
    void getFileDetail_passesThroughAccessPolicy() {
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("test.jpg")
                .build();
        given(fileDetailRepository.findByFileMasterAtchFileIdAndAtchFileSeq(atchFileId, 1))
                .willReturn(Optional.of(detail));

        FileDto result = fileService.getFileDetail(atchFileId, 1);

        assertThat(result.getOrignlFileNm()).isEqualTo("test.jpg");
        verify(accessPolicy).assertReadable(master);
    }

    @Test
    @DisplayName("[IDOR] 가드가 거부하면 저장소 접근으로 넘어가지 않는다 — 거부가 실효적임을 증명")
    void getFileResource_deniedByPolicy_doesNotTouchStorage() {
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        given(fileDetailRepository.findByFileMasterAtchFileIdAndAtchFileSeq(anyString(), anyInt()))
                .willReturn(Optional.of(detail));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(accessPolicy).assertReadable(master);

        assertThatThrownBy(() -> fileService.getFileResource(atchFileId, 1))
                .isInstanceOf(BusinessException.class);

        // 가드가 던졌는데도 파일을 읽어 왔다면 거부는 형식뿐이다.
        verify(storageService, never()).loadAsResource(anyString(), anyString());
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

        given(fileDetailRepository.findByFileMasterAtchFileIdAndAtchFileSeq(anyString(), anyInt())).willReturn(Optional.of(detail));

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
    @DisplayName("파일 수정 - 하나라도 금지 확장자면 어떤 파일도 디스크에 쓰지 않는다 (고아 파일 방지)")
    void updateFiles_rejectsAllWhenAnyExtensionForbidden() {
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.emptyList());

        // 첫 파일은 정상, 두 번째가 실행파일. 선(先)검증 패스가 없으면 첫 파일이 이미 저장된 뒤
        // 두 번째에서 터져 디스크에 고아 파일이 남는다.
        List<MultipartFile> files = List.of(
                new MockMultipartFile("files", "ok.jpg", "image/jpeg", "content".getBytes()),
                new MockMultipartFile("files", "evil.exe", "application/octet-stream", "payload".getBytes()));

        assertThatThrownBy(() -> fileService.updateFiles(atchFileId, files))
                .isInstanceOf(BusinessException.class);

        verify(storageService, never()).store(any(MultipartFile.class), anyString());
        verify(fileDetailRepository, never()).save(any(FileDetail.class));
    }

    @Test
    @DisplayName("파일 수정 - 첨부 순번은 기존 최대값 다음부터 연속 부여된다")
    void updateFiles_continuesSequenceFromExistingMax() throws IOException {
        String atchFileId = "FILE_123";
        FileMaster master = new FileMaster(atchFileId);
        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master))
                .willReturn(List.of(FileDetail.builder().atchFileSeq(3).build()));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored.jpg");

        List<MultipartFile> files = List.of(
                new MockMultipartFile("files", "a.jpg", "image/jpeg", "a".getBytes()),
                new MockMultipartFile("files", "b.png", "image/png", "b".getBytes()));

        fileService.updateFiles(atchFileId, files);

        // 순번이 겹치면 동일 첨부그룹 안에서 파일이 서로를 가린다.
        org.mockito.ArgumentCaptor<FileDetail> captor = org.mockito.ArgumentCaptor.forClass(FileDetail.class);
        verify(fileDetailRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(FileDetail::getAtchFileSeq).containsExactly(4, 5);
    }

    @Test
    @DisplayName("전체 파일 목록 - 검색어 유무에 따라 조회 경로가 갈리고 항상 페이지를 돌려준다")
    void getAllFileList_switchesByKeyword() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        FileDetail detail = FileDetail.builder()
                .fileMaster(new FileMaster("FILE_123"))
                .atchFileSeq(1)
                .orgnlFileNm("보고서.pdf")
                .build();

        given(fileDetailRepository.findByOrgnlFileNmContaining("보고", pageable))
                .willReturn(new org.springframework.data.domain.PageImpl<>(List.of(detail)));
        given(fileDetailRepository.findAll(pageable))
                .willReturn(new org.springframework.data.domain.PageImpl<>(List.of(detail)));

        assertThat(fileService.getAllFileList(pageable, "보고")).isNotNull().hasSize(1);
        assertThat(fileService.getAllFileList(pageable, null)).isNotNull().hasSize(1);
        assertThat(fileService.getAllFileList(pageable, "")).isNotNull().hasSize(1);

        // 빈 문자열은 '검색 없음' 으로 취급해야 한다 — 아니면 전체 목록이 빈 키워드로 걸러진다.
        verify(fileDetailRepository, times(1)).findByOrgnlFileNmContaining(anyString(), any());
        verify(fileDetailRepository, times(2)).findAll(any(org.springframework.data.domain.Pageable.class));
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
        given(fileDetailRepository.findByFileMasterAtchFileIdAndAtchFileSeq(anyString(), anyInt())).willReturn(Optional.empty());
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
