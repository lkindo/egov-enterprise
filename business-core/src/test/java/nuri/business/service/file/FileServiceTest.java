package nuri.business.service.file;

import nuri.business.domain.file.FileDetail;

import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.service.file.dto.FileDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.storage.FileStorageService;
import nuri.foundation.core.job.DurableWorkPort;
import org.mockito.Spy;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.test.util.ReflectionTestUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
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

    @Mock private DurableWorkPort durableWork;
    @Spy private ObjectMapper objectMapper = JsonMapper.builder().build();

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void readSnapshotUsesOneAuthorizedListAndCopiesImmutableValues(boolean forUpdate) {
        FileMaster master = new FileMaster(123L);
        FileDetail detail = FileDetail.builder().fileMaster(master).atchFileSeq(1).strgFileNm("private.pdf")
                .fileStrgPath("private/path").orgnlFileNm("읽은파일.pdf").fileEstn("pdf").fileSz(17L).fileCn("설명").build();
        java.util.UUID identity = java.util.UUID.randomUUID();
        ReflectionTestUtils.setField(detail, "id", identity);
        if (forUpdate) given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        else given(fileMasterRepository.findById(123L)).willReturn(Optional.of(master));
        var details = new java.util.ArrayList<>(List.of(detail));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(details);

        var snapshot = forUpdate ? fileService.getReadSnapshotForUpdate(123L) : fileService.getReadSnapshot(123L);
        details.clear();
        ReflectionTestUtils.setField(detail, "orgnlFileNm", "변경된파일.pdf");
        ReflectionTestUtils.setField(detail, "strgFileNm", "changed.pdf");

        assertThat(snapshot.files()).hasSize(1);
        assertThat(snapshot.files().getFirst().id()).isEqualTo(identity);
        assertThat(snapshot.files().getFirst().strgFileNm()).isEqualTo("private.pdf");
        assertThat(snapshot.toFileDtos()).extracting(FileDto::getOrignlFileNm).containsExactly("읽은파일.pdf");
        assertThatThrownBy(() -> snapshot.files().clear()).isInstanceOf(UnsupportedOperationException.class);
        String publicJson = objectMapper.writeValueAsString(snapshot.toFileDtos());
        assertThat(publicJson).doesNotContain("private/path", "private.pdf", identity.toString(), "strgFileNm", "fileStrgPath");
        var order = inOrder(fileMasterRepository, accessPolicy, fileDetailRepository);
        if (forUpdate) order.verify(fileMasterRepository).findByIdForUpdate(123L);
        else order.verify(fileMasterRepository).findById(123L);
        order.verify(accessPolicy).assertReadable(master);
        order.verify(fileDetailRepository).findByFileMaster(master);
        verifyNoMoreInteractions(fileMasterRepository, accessPolicy, fileDetailRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void snapshotAccessDeniedNeverReadsMetadata(boolean forUpdate) {
        FileMaster master = new FileMaster(123L);
        if (forUpdate) given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        else given(fileMasterRepository.findById(123L)).willReturn(Optional.of(master));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED)).when(accessPolicy).assertReadable(master);
        assertThatThrownBy(() -> {
            if (forUpdate) fileService.getReadSnapshotForUpdate(123L);
            else fileService.getReadSnapshot(123L);
        }).isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(fileDetailRepository, storageService, durableWork);
    }

    @Test
    void emptySnapshotHasNoRepositoryInteraction() {
        assertThat(fileService.getReadSnapshot(null).files()).isEmpty();
        assertThat(fileService.getReadSnapshotForUpdate(null).toFileDtos()).isEmpty();
        verifyNoInteractions(fileMasterRepository, fileDetailRepository, accessPolicy);
    }

    @Test
    void deleteMissingDetailAfterParentLockDoesNotQueueOrTouchStorage() {
        FileMaster master = new FileMaster(123L);
        given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(123L, 1)).willReturn(Optional.empty());
        assertThatThrownBy(() -> fileService.deleteFile(123L, 1)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        var order = inOrder(fileMasterRepository, fileDetailRepository);
        order.verify(fileMasterRepository).findByIdForUpdate(123L);
        order.verify(fileDetailRepository).findByFileMasterAtchFileSnAndAtchFileSeq(123L, 1);
        verifyNoInteractions(storageService, durableWork, accessPolicy);
    }

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("🚨 업로드 뒤 트랜잭션이 롤백되면 이번에 저장한 파일을 지운다 — 커밋되면 남긴다 (DIP I2)")
    void uploadFiles_compensatesStoredFilesOnRollback(boolean board) throws IOException {
        List<MultipartFile> files = Collections.singletonList(validJpeg("a.jpg"));
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(new FileMaster(123L));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored_a.jpg");

        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            uploadWithProfile(files, board);
            verify(storageService, never()).delete(anyString(), anyString());

            for (var sync : org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(org.springframework.transaction.support.TransactionSynchronization.STATUS_COMMITTED);
            }
            verify(storageService, never()).delete(anyString(), anyString());

            for (var sync : org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(org.springframework.transaction.support.TransactionSynchronization.STATUS_ROLLED_BACK);
            }
            verify(storageService).delete("stored_a.jpg", "general/123");
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("파일 업로드 성공")
    void uploadFiles_Success() throws IOException {
        // given
        MockMultipartFile file = validJpeg("가".repeat(296) + ".jpg");
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

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 업로드 - 단일 파일 10MiB 상한을 넘으면 내용을 읽거나 저장하지 않는다")
    void uploadFiles_rejectsOversizedFileBeforeStorage(boolean board) throws IOException {
        MultipartFile oversized = mock(MultipartFile.class);
        given(oversized.isEmpty()).willReturn(false);
        given(oversized.getSize()).willReturn(10L * 1024 * 1024 + 1);

        assertThatThrownBy(() -> uploadWithProfile(List.of(oversized), board))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("10MB 이하");

        verify(oversized, never()).getInputStream();
        verify(fileMasterRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 업로드 - 빈 목록과 20개 초과 요청을 거부한다")
    void uploadFiles_rejectsEmptyOrExcessiveFileCount(boolean board) {
        // [2026-09-30] 한도가 있는 거부는 한도를 말한다 — 사유 없는 기본 문구로는 무엇을 줄여야 하는지 알 수 없다.
        assertThatThrownBy(() -> uploadWithProfile(List.of(), board))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("올릴 파일이 없습니다");

        MultipartFile placeholder = mock(MultipartFile.class);
        assertThatThrownBy(() -> uploadWithProfile(Collections.nCopies(21, placeholder), board))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("20개까지");

        verify(fileMasterRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 업로드 - DB 컬럼보다 긴 원본 파일명은 파일 저장 전에 거부한다")
    void uploadFiles_rejectsFilenameLongerThanDatabaseColumn(boolean board) {
        MockMultipartFile file = validJpeg("a".repeat(297) + ".jpg");

        assertThatThrownBy(() -> uploadWithProfile(List.of(file), board))
                .isInstanceOf(BusinessException.class);

        verify(fileMasterRepository, never()).save(any());
        verify(storageService, never()).store(any(), anyString());
    }

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 업로드 - 요청 총합 50MiB 상한을 넘으면 마지막 파일 내용도 읽지 않는다")
    void uploadFiles_rejectsOversizedBatch(boolean board) throws IOException {
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

        assertThatThrownBy(() -> uploadWithProfile(files, board))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("전체 크기는 50MB 이하");

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

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 업로드 - DB 저장 실패 시 이번 요청에서 쓴 디스크 파일을 모두 보상 삭제한다")
    void uploadFiles_compensatesStoredFilesWhenDatabaseSaveFails(boolean board) throws IOException {
        List<MultipartFile> files = List.of(validJpeg("first.jpg"), validPng("second.png"));
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(new FileMaster(123L));
        given(storageService.store(any(MultipartFile.class), anyString()))
                .willReturn("stored-first.jpg", "stored-second.png");
        given(fileDetailRepository.save(any(FileDetail.class)))
                .willReturn(FileDetail.builder().build())
                .willThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> uploadWithProfile(files, board))
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
    @DisplayName("🔒 목록 응답은 서버 저장 경로·저장 파일명을 싣지 않는다 — 내려받기는 식별자로만 한다")
    void getFileList_doesNotExposeStorageLocation() {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .atchFileSeq(1)
                .orgnlFileNm("보고서.pdf")
                .fileStrgPath("general/123")
                .strgFileNm("9f1c2e7a-stored-object.pdf")
                .build();
        given(fileMasterRepository.findById(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(detail));

        // 컨트롤러가 그대로 직렬화하는 DTO 를 같은 방식(JSON)으로 본다 — 필드 이름이 아니라 값이 새는지를 판정한다.
        String json = objectMapper.writeValueAsString(fileService.getFileList(atchFileSn));

        assertThat(json)
                .as("첨부 목록 응답에 서버 저장 위치가 실리면 안 된다")
                .contains("보고서.pdf")
                .doesNotContain("general/123")
                .doesNotContain("9f1c2e7a-stored-object.pdf");
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
                .orgnlFileNm("보고서_원본.jpg")
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
        assertThat(result.getFilename()).isEqualTo("보고서_원본.jpg");
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
    @DisplayName("파일 단건 삭제 — 삭제 판정을 통과한 뒤 행 삭제와 내구 의도를 함께 요청한다")
    void deleteFile() throws IOException {
        // given
        Long atchFileSn = 123L;
        Integer fileSn = 1;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();

        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt())).willReturn(Optional.of(detail));
        ReflectionTestUtils.setField(detail, "id", java.util.UUID.randomUUID());
        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
        given(storageService.captureDeletionIdentity("stored.jpg", "path")).willReturn("a".repeat(64));

        // when
        fileService.deleteFile(atchFileSn, fileSn);

        // then
        verify(accessPolicy).assertDeletable(master);
        verify(storageService, never()).delete(anyString(), anyString());
        verify(durableWork).enqueue(argThat(work -> work.key().equals(detail.getId()) && work.type().equals("FILE_DELETE")));
        verify(fileDetailRepository, times(1)).delete(detail);
        var order = inOrder(fileMasterRepository, fileDetailRepository, accessPolicy, durableWork);
        order.verify(fileMasterRepository).findByIdForUpdate(atchFileSn);
        order.verify(fileDetailRepository).findByFileMasterAtchFileSnAndAtchFileSeq(atchFileSn, fileSn);
        order.verify(accessPolicy).assertDeletable(master);
        order.verify(fileDetailRepository).delete(detail);
        order.verify(durableWork).enqueue(any());
    }

    @Test
    @DisplayName("[인가] 삭제 판정이 거부하면 저장소도 행도 건드리지 않는다 — 거부가 실효적임을 증명")
    void deleteFile_deniedByPolicy_doesNotTouchStorageOrRow() throws IOException {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
        FileDetail detail = FileDetail.builder()
                .fileMaster(master)
                .strgFileNm("stored.jpg")
                .fileStrgPath("path")
                .build();
        given(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(anyLong(), anyInt()))
                .willReturn(Optional.of(detail));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(accessPolicy).assertDeletable(master);

        assertThatThrownBy(() -> fileService.deleteFile(atchFileSn, 1))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(storageService, never()).delete(anyString(), anyString());
        verify(fileDetailRepository, never()).delete(any(FileDetail.class));
        verifyNoInteractions(durableWork);
    }

    @Test
    @DisplayName("파일 수정 (추가 업로드)")
    void updateFiles() throws IOException {
        // given
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        FileDetail existingDetail = FileDetail.builder().atchFileSeq(1).build();
        MockMultipartFile newFile = validJpeg("new.jpg");

        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(Collections.singletonList(existingDetail));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("new_stored.jpg");

        // when
        fileService.updateFiles(atchFileSn, Collections.singletonList(newFile));

        // then
        verify(accessPolicy).assertAttachable(master);
        verify(fileDetailRepository, times(1)).save(any(FileDetail.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    @DisplayName("파일 수정 - 원 업로더가 아니면 상세 조회와 물리 저장 전에 거부한다")
    void updateFiles_deniedAssignmentHasNoDetailOrStorageSideEffect(boolean board) {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(accessPolicy).assertAttachable(master);

        assertThatThrownBy(() -> updateWithProfile(
                atchFileSn, Collections.singletonList(validJpeg("new.jpg")), board))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        verify(accessPolicy).assertAttachable(master);
        verifyNoInteractions(fileDetailRepository, storageService);
    }

    @Test
    @DisplayName("파일 수정 - 하나라도 금지 확장자면 어떤 파일도 디스크에 쓰지 않는다 (고아 파일 방지)")
    void updateFiles_rejectsAllWhenAnyExtensionForbidden() {
        Long atchFileSn = 123L;
        FileMaster master = new FileMaster(atchFileSn);
        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
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
        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
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
        var order = inOrder(fileMasterRepository, accessPolicy, fileDetailRepository, storageService);
        order.verify(fileMasterRepository).findByIdForUpdate(atchFileSn);
        order.verify(accessPolicy).assertAttachable(master);
        order.verify(fileDetailRepository).findByFileMaster(master);
        order.verify(storageService).store(files.get(0), "general/123");
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void appendLockFailureCannotAllocateASequenceOrStoreAFile(boolean board) {
        given(fileMasterRepository.findByIdForUpdate(123L))
                .willThrow(new org.springframework.dao.CannotAcquireLockException("injected lock failure"));

        assertThatThrownBy(() -> updateWithProfile(123L, List.of(validJpeg("new.jpg")), board))
                .isInstanceOf(org.springframework.dao.CannotAcquireLockException.class);

        verifyNoInteractions(accessPolicy, fileDetailRepository, storageService);
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

        given(fileMasterRepository.findByIdForUpdate(atchFileSn)).willReturn(Optional.of(master));
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

    @ParameterizedTest(name = "게시판 {0} 허용")
    @MethodSource("validBoardVideos")
    @DisplayName("게시판 업로드는 MIME 주장 대신 MP4 브랜드·WebM DocType을 확인한다")
    void uploadBoardFiles_acceptsVideoContainers(String filename, byte[] content) throws IOException {
        MockMultipartFile file = new MockMultipartFile("files", filename, "text/plain", content);
        given(fileMasterRepository.save(any(FileMaster.class))).willReturn(new FileMaster(123L));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored-video.bin");

        assertThat(fileService.uploadBoardFiles(List.of(file))).isEqualTo(123L);

        verify(storageService).store(file, "general/123");
        verify(fileDetailRepository).save(argThat(detail -> filename.equals(detail.getOrgnlFileNm())));
    }

    @ParameterizedTest(name = "일반 경로 {0} 거부")
    @MethodSource("validBoardVideos")
    @DisplayName("게시판 영상 허용이 일반 첨부 생성·추가의 허용목록을 넓히지 않는다")
    void generalUploads_stillRejectBoardVideoTypes(String filename, byte[] content) {
        MockMultipartFile file = new MockMultipartFile("files", filename, "video/mp4", content);
        assertThatThrownBy(() -> fileService.uploadFiles(List.of(file)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);

        FileMaster master = new FileMaster(123L);
        given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(List.of());
        assertThatThrownBy(() -> fileService.updateFiles(123L, List.of(file)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);

        verify(fileMasterRepository, never()).save(any());
        verify(fileDetailRepository, never()).save(any());
        verifyNoInteractions(storageService);
    }

    @ParameterizedTest(name = "위장·잘린 영상 {0}: {1}")
    @MethodSource("invalidBoardVideos")
    @DisplayName("게시판 영상의 다른 포맷·잘린 헤더·DocType 위장을 저장 전에 거부한다")
    void uploadBoardFiles_rejectsMalformedContainers(String filename, String reason, byte[] content) {
        MockMultipartFile file = new MockMultipartFile("files", filename, "video/" + filename.substring(6), content);

        assertThatThrownBy(() -> fileService.uploadBoardFiles(List.of(validJpeg("first.jpg"), file)))
                .as(reason)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);

        verifyNoInteractions(fileMasterRepository, fileDetailRepository, storageService);
    }

    @Test
    @DisplayName("게시판 영상 추가도 원 업로더 확인 뒤 기존 묶음의 다음 순번에 저장한다")
    void updateBoardFiles_appendsVideoAfterAuthorization() throws IOException {
        FileMaster master = new FileMaster(123L);
        given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master))
                .willReturn(List.of(FileDetail.builder().atchFileSeq(4).build()));
        given(storageService.store(any(MultipartFile.class), anyString())).willReturn("stored.mp4");
        MockMultipartFile video = new MockMultipartFile("files", "media.mp4", "video/mp4", mp4Header("mp42"));

        fileService.updateBoardFiles(123L, List.of(video));

        var order = inOrder(accessPolicy, fileDetailRepository, storageService);
        order.verify(accessPolicy).assertAttachable(master);
        order.verify(fileDetailRepository).findByFileMaster(master);
        order.verify(storageService).store(video, "general/123");
        order.verify(fileDetailRepository).save(argThat(detail -> detail.getAtchFileSeq() == 5));
        verify(fileMasterRepository, never()).save(any());
    }

    @Test
    @DisplayName("게시판 영상 추가도 배치 중 하나가 위장이면 새 파일을 하나도 저장하지 않는다")
    void updateBoardFiles_rejectsMixedInvalidBatchBeforeStorage() {
        FileMaster master = new FileMaster(123L);
        given(fileMasterRepository.findByIdForUpdate(123L)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(List.of());
        MockMultipartFile disguised = new MockMultipartFile("files", "media.mp4", "video/mp4", mp4Header("avif"));

        assertThatThrownBy(() -> fileService.updateBoardFiles(123L, List.of(validJpeg("first.jpg"), disguised)))
                .isInstanceOf(BusinessException.class);

        verify(accessPolicy).assertAttachable(master);
        verify(fileDetailRepository, never()).save(any());
        verifyNoInteractions(storageService);
    }

    private Long uploadWithProfile(List<MultipartFile> files, boolean board) throws IOException {
        return board ? fileService.uploadBoardFiles(files) : fileService.uploadFiles(files);
    }

    private void updateWithProfile(Long atchFileSn, List<MultipartFile> files, boolean board) throws IOException {
        if (board) fileService.updateBoardFiles(atchFileSn, files);
        else fileService.updateFiles(atchFileSn, files);
    }

    private static Stream<Arguments> validBoardVideos() {
        byte[] paddedDocType = ebmlHeader(concat(
                hex("ec 40 80"), new byte[128], docType("webm")));
        return Stream.of(
                Arguments.of("media.mp4", mp4Header("isom")),
                Arguments.of("media.MP4", mp4Header("mp42")),
                Arguments.of("media.mp4", mp4Header("M4V ")),
                Arguments.of("media.webm", ebmlHeader(concat(hex("42 86 81 01"), docType("webm")))),
                Arguments.of("media.webm", paddedDocType));
    }

    private static Stream<Arguments> invalidBoardVideos() {
        byte[] tooLongMp4 = mp4Header("isom");
        tooLongMp4[3] = 32;
        byte[] incompleteBrandMp4 = mp4Header("isom");
        incompleteBrandMp4[3] = 17;
        byte[] extendedSizeMp4 = mp4Header("isom");
        extendedSizeMp4[3] = 1;
        byte[] oversizedEbml = ebmlHeader(concat(hex("ec 4f a0"), new byte[4000], docType("webm"), new byte[100]));
        return Stream.of(
                Arguments.of("media.mp4", "실행파일", hex("4d 5a 90 00")),
                Arguments.of("media.mp4", "AVIF major brand와 MP4 compatible brand", mp4Header("avif")),
                Arguments.of("media.mp4", "HEIC major brand", mp4Header("heic")),
                Arguments.of("media.mp4", "QuickTime major brand", mp4Header("qt  ")),
                Arguments.of("media.mp4", "선언된 box 크기보다 짧음", tooLongMp4),
                Arguments.of("media.mp4", "잘린 compatible brand", incompleteBrandMp4),
                Arguments.of("media.mp4", "지원하지 않는 확장 box 크기", extendedSizeMp4),
                Arguments.of("media.mp4", "잘린 ftyp", java.util.Arrays.copyOf(mp4Header("isom"), 15)),
                Arguments.of("media.mp4", "WebM 위장", ebmlHeader(docType("webm"))),
                Arguments.of("media.webm", "MP4 위장", mp4Header("isom")),
                Arguments.of("media.webm", "Matroska DocType", ebmlHeader(docType("matroska"))),
                Arguments.of("media.webm", "DocType 부재", ebmlHeader(hex("42 86 81 01"))),
                Arguments.of("media.webm", "Void 내부 문자열은 DocType이 아님", ebmlHeader(concat(hex("ec 87"), docType("webm")))),
                Arguments.of("media.webm", "헤더 밖 DocType", concat(ebmlHeader(hex("42 86 81 01")), docType("webm"))),
                Arguments.of("media.webm", "중복 DocType", ebmlHeader(concat(docType("webm"), docType("webm")))),
                Arguments.of("media.webm", "잘린 DocType", ebmlHeader(hex("42 82 88 77 65 62 6d"))),
                Arguments.of("media.webm", "잘린 Element ID", ebmlHeader(hex("42"))),
                Arguments.of("media.webm", "0인 VINT marker", hex("1a 45 df a3 00")),
                Arguments.of("media.webm", "알 수 없는 헤더 크기", concat(hex("1a 45 df a3 ff"), docType("webm"))),
                Arguments.of("media.webm", "알 수 없는 필드 크기", ebmlHeader(hex("42 82 ff 77 65 62 6d"))),
                Arguments.of("media.webm", "헤더 읽기 상한 초과", oversizedEbml));
    }

    private static byte[] mp4Header(String majorBrand) {
        return java.nio.ByteBuffer.allocate(24).putInt(24)
                .put("ftyp".getBytes(StandardCharsets.US_ASCII))
                .put(majorBrand.getBytes(StandardCharsets.US_ASCII)).putInt(0)
                .put("isommp42".getBytes(StandardCharsets.US_ASCII)).array();
    }

    private static byte[] docType(String value) {
        return concat(new byte[] { 0x42, (byte) 0x82, (byte) (0x80 | value.length()) },
                value.getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] ebmlHeader(byte[] fields) {
        byte[] size = fields.length < 127 ? new byte[] { (byte) (0x80 | fields.length) }
                : new byte[] { (byte) (0x40 | (fields.length >> 8)), (byte) fields.length };
        return concat(hex("1a 45 df a3"), size, fields);
    }

    private static byte[] hex(String value) {
        return java.util.HexFormat.of().parseHex(value.replace(" ", ""));
    }

    private static byte[] concat(byte[]... parts) {
        java.io.ByteArrayOutputStream result = new java.io.ByteArrayOutputStream();
        for (byte[] part : parts) result.writeBytes(part);
        return result.toByteArray();
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
