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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

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
        MockMultipartFile file = validJpeg("test.jpg");
        List<MultipartFile> files = Collections.singletonList(file);
        
        FileMaster master = new FileMaster(123L);
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(master);
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored_name.jpg");

        // when
        Long atchFileSn = fileService.uploadFiles(files);

        // then
        assertThat(atchFileSn).isEqualTo(123L);
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
    @DisplayName("파일 업로드 - 실행파일 내용을 jpg로 위장해도 저장 전에 거부한다")
    void uploadFiles_rejectsExecutableDisguisedAsImage() {
        MockMultipartFile disguised = new MockMultipartFile(
                "files", "profile.jpg", "image/jpeg",
                new byte[] { 'M', 'Z', (byte) 0x90, 0x00, 0x03, 0x00 });

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(disguised)))
                .isInstanceOf(BusinessException.class);

        verify(fileMasterRepository, never()).save(any());
        verify(storageService, never()).store(any(), anyString());
    }

    @Test
    @DisplayName("파일 업로드 - 단일 파일 10MiB 상한을 넘으면 내용을 읽거나 저장하지 않는다")
    void uploadFiles_rejectsOversizedFileBeforeStorage() throws IOException {
        MultipartFile oversized = mock(MultipartFile.class);
        given(oversized.isEmpty()).willReturn(false);
        given(oversized.getSize()).willReturn(10L * 1024 * 1024 + 1);

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(oversized)))
                .isInstanceOf(BusinessException.class);

        verify(oversized, never()).getInputStream();
        verify(fileMasterRepository, never()).save(any());
    }

    @Test
    @DisplayName("파일 업로드 - 빈 목록과 20개 초과 요청을 거부한다")
    void uploadFiles_rejectsEmptyOrExcessiveFileCount() {
        assertThatThrownBy(() -> fileService.uploadFiles(List.of()))
                .isInstanceOf(BusinessException.class);

        MultipartFile placeholder = mock(MultipartFile.class);
        assertThatThrownBy(() -> fileService.uploadFiles(Collections.nCopies(21, placeholder)))
                .isInstanceOf(BusinessException.class);

        verify(fileMasterRepository, never()).save(any());
    }

    @Test
    @DisplayName("파일 업로드 - DB 컬럼보다 긴 원본 파일명은 파일 저장 전에 거부한다")
    void uploadFiles_rejectsFilenameLongerThanDatabaseColumn() {
        MockMultipartFile file = validJpeg("a".repeat(97) + ".jpg");

        assertThatThrownBy(() -> fileService.uploadFiles(List.of(file)))
                .isInstanceOf(BusinessException.class);

        verify(fileMasterRepository, never()).save(any());
        verify(storageService, never()).store(any(), anyString());
    }

    @Test
    @DisplayName("파일 업로드 - 요청 총합 50MiB 상한을 넘으면 마지막 파일 내용도 읽지 않는다")
    void uploadFiles_rejectsOversizedBatch() throws IOException {
        List<MultipartFile> files = IntStream.range(0, 6)
                .mapToObj(index -> {
                    MultipartFile file = mock(MultipartFile.class);
                    given(file.isEmpty()).willReturn(false);
                    given(file.getSize()).willReturn(9L * 1024 * 1024);
                    if (index < 5) {
                        given(file.getOriginalFilename()).willReturn("part-" + index + ".pdf");
                        try {
                            given(file.getInputStream()).willReturn(
                                    new ByteArrayInputStream(new byte[] { '%', 'P', 'D', 'F', '-' }));
                        } catch (IOException exception) {
                            throw new IllegalStateException(exception);
                        }
                    }
                    return file;
                })
                .toList();

        assertThatThrownBy(() -> fileService.uploadFiles(files))
                .isInstanceOf(BusinessException.class);

        verify(files.get(5), never()).getInputStream();
        verify(fileMasterRepository, never()).save(any());
    }

    @ParameterizedTest(name = "{0} 서명 허용")
    @MethodSource("validFileSignatures")
    @DisplayName("파일 업로드 - 허용 확장자의 실제 서명이 일치하면 저장한다")
    void uploadFiles_acceptsMatchingSignatures(String filename, String contentType, byte[] content)
            throws IOException {
        MockMultipartFile file = new MockMultipartFile("files", filename, contentType, content);
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(new FileMaster(123L));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored.bin");

        Long atchFileSn = fileService.uploadFiles(List.of(file));

        assertThat(atchFileSn).isEqualTo(123L);
        verify(storageService).store(file, "general/" + atchFileSn);
    }

    @Test
    @DisplayName("파일 업로드 - DB 저장 실패 시 이번 요청에서 쓴 디스크 파일을 모두 보상 삭제한다")
    void uploadFiles_compensatesStoredFilesWhenDatabaseSaveFails() throws IOException {
        List<MultipartFile> files = List.of(validJpeg("first.jpg"), validPng("second.png"));
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(new FileMaster(123L));
        given(storageService.store(any(MultipartFile.class), anyString()))
                .willReturn("stored-first.jpg", "stored-second.png");
        given(fileDetailRepository.save(any(FileDetail.class)))
                .willReturn(FileDetail.builder().build())
                .willThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> fileService.uploadFiles(files))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database unavailable");

        verify(storageService).delete("stored-second.png", "general/123");
        verify(storageService).delete("stored-first.jpg", "general/123");
    }

    @Test
    @DisplayName("파일 목록 조회")
    void getFileList() {
        // given
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("test.jpg")
                .build();

        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(detail));

        // when
        List<FileDto> result = fileService.getFileList(atchFileSn);

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
        Long atchFileSn = 123L;
        Integer fileSn = 1;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        Resource resource = new ByteArrayResource("test".getBytes());

        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt())).willReturn(Optional.of(detail));
        given(storageService.loadAsResource("stored.jpg", "path")).willReturn(resource);

        // when
        Resource result = fileService.getFileResource(atchFileSn, fileSn);

        // then
        assertThat(result).isNotNull();
        // [IDOR] 다운로드는 목록보다 노출이 크다 — 가드 호출을 여기서도 못박는다.
        verify(accessPolicy).assertReadable(master);
    }

    @Test
    @DisplayName("[IDOR] 단건 상세도 인가 가드를 통과한다")
    void getFileDetail_passesThroughAccessPolicy() {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("test.jpg")
                .build();
        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(atchFileSn, 1))
                .willReturn(Optional.of(detail));

        FileDto result = fileService.getFileDetail(atchFileSn, 1);

        assertThat(result.getOrignlFileNm()).isEqualTo("test.jpg");
        verify(accessPolicy).assertReadable(master);
    }

    @Test
    @DisplayName("[IDOR] 가드가 거부하면 저장소 접근으로 넘어가지 않는다 — 거부가 실효적임을 증명")
    void getFileResource_deniedByPolicy_doesNotTouchStorage() {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt()))
                .willReturn(Optional.of(detail));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(accessPolicy).assertReadable(master);

        assertThatThrownBy(() -> fileService.getFileResource(atchFileSn, 1))
                .isInstanceOf(BusinessException.class);

        // 가드가 던졌는데도 파일을 읽어 왔다면 거부는 형식뿐이다.
        verify(storageService, never()).loadAsResource(anyString(), anyString());
    }

    @Test
    @DisplayName("파일 전체 삭제")
    void deleteFiles() throws IOException {
        // given
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();

        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(detail));

        // when
        fileService.deleteFiles(atchFileSn);

        // then
        verify(storageService, times(1)).delete("stored.jpg", "path");
        verify(fileMasterRepository, times(1)).delete(master);
    }

    @Test
    @DisplayName("파일 단건 삭제")
    void deleteFile() throws IOException {
        // given
        Long atchFileSn = 123L;
        Integer fileSn = 1;
        FileDetail detail = FileDetail.builder()
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();

        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt())).willReturn(Optional.of(detail));

        // when
        fileService.deleteFile(atchFileSn, fileSn);

        // then
        verify(storageService, times(1)).delete("stored.jpg", "path");
        verify(fileDetailRepository, times(1)).delete(detail);
    }

    @Test
    @DisplayName("파일 수정 (추가 업로드)")
    void updateFiles() throws IOException {
        // given
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail existingDetail = FileDetail.builder().atchFileSeq(1).build();
        MockMultipartFile newFile = validJpeg("new.jpg");

        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(existingDetail));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("new_stored.jpg");

        // when
        fileService.updateFiles(atchFileSn, Collections.singletonList(newFile));

        // then
        verify(fileDetailRepository, times(1)).save(any(FileDetail.class));
    }

    @Test
    @DisplayName("파일 수정 - 하나라도 금지 확장자면 어떤 파일도 디스크에 쓰지 않는다 (고아 파일 방지)")
    void updateFiles_rejectsAllWhenAnyExtensionForbidden() {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.emptyList());

        // 첫 파일은 정상, 두 번째가 실행파일. 선(先)검증 패스가 없으면 첫 파일이 이미 저장된 뒤
        // 두 번째에서 터져 디스크에 고아 파일이 남는다.
        List<MultipartFile> files = List.of(
                validJpeg("ok.jpg"),
                new MockMultipartFile("files", "evil.exe", "application/octet-stream", "payload".getBytes()));

        assertThatThrownBy(() -> fileService.updateFiles(atchFileSn, files))
                .isInstanceOf(BusinessException.class);

        verify(storageService, never()).store(any(MultipartFile.class), anyString());
        verify(fileDetailRepository, never()).save(any(FileDetail.class));
    }

    @Test
    @DisplayName("파일 수정 - 첨부 순번은 기존 최대값 다음부터 연속 부여된다")
    void updateFiles_continuesSequenceFromExistingMax() throws IOException {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master))
                .willReturn(List.of(FileDetail.builder().atchFileSeq(3).build()));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored.jpg");

        List<MultipartFile> files = List.of(
                validJpeg("a.jpg"),
                validPng("b.png"));

        fileService.updateFiles(atchFileSn, files);

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
                .fileMaster(new FileMaster(123L))
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
        given(fileMasterRepository.findById(anyLong())).willReturn(Optional.empty());
        assertThatThrownBy(() -> fileService.getFileList(999L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 리소스 조회 - 상세 정보가 없는 경우 예외 발생")
    void getFileResource_NotFound() {
        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt())).willReturn(Optional.empty());
        assertThatThrownBy(() -> fileService.getFileResource(123L, 1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("파일 업로드 - 빈 파일 포함 시 스킵")
    void uploadFiles_WithEmptyFile() throws IOException {
        MockMultipartFile emptyFile = new MockMultipartFile("files", "empty.jpg", "image/jpeg", new byte[0]);
        MockMultipartFile validFile = validJpeg("valid.jpg");
        
        FileMaster master = new FileMaster(123L);
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
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        MockMultipartFile file = validJpeg("new.jpg");

        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(List.of());
        given(storageService.store(any(), anyString())).willReturn("stored.jpg");

        fileService.updateFiles(atchFileSn, List.of(file));

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

    private static MockMultipartFile validJpeg(String filename) {
        return new MockMultipartFile("files", filename, "image/jpeg",
                new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10 });
    }

    private static MockMultipartFile validPng(String filename) {
        return new MockMultipartFile("files", filename, "image/png",
                new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A });
    }

    private static Stream<Arguments> validFileSignatures() {
        byte[] ole = new byte[] {
                (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0,
                (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1 };
        byte[] zip = new byte[] { 0x50, 0x4B, 0x03, 0x04 };

        return Stream.of(
                Arguments.of("photo.jpg", "image/jpeg",
                        new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0 }),
                Arguments.of("photo.jpeg", "image/jpeg",
                        new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE1 }),
                Arguments.of("image.png", "image/png",
                        new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
                Arguments.of("animation.gif", "image/gif", "GIF89a".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("bitmap.bmp", "image/bmp", "BM".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("document.pdf", "application/pdf", "%PDF-".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("legacy.doc", "application/msword", ole),
                Arguments.of("legacy.xls", "application/vnd.ms-excel", ole),
                Arguments.of("legacy.ppt", "application/vnd.ms-powerpoint", ole),
                Arguments.of("legacy.hwp", "application/x-hwp", ole),
                Arguments.of("modern.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip),
                Arguments.of("modern.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip),
                Arguments.of("modern.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip),
                Arguments.of("archive.zip", "application/zip", zip),
                Arguments.of("archive.7z", "application/x-7z-compressed",
                        new byte[] { 0x37, 0x7A, (byte) 0xBC, (byte) 0xAF, 0x27, 0x1C }),
                Arguments.of("archive.rar", "application/vnd.rar",
                        new byte[] { 0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00 }),
                Arguments.of("notes.txt", "text/plain", "plain text".getBytes(StandardCharsets.UTF_8)));
    }
}
