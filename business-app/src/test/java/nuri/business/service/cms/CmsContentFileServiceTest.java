package nuri.business.service.cms;

import nuri.business.domain.cms.CmsContentFile;
import nuri.business.domain.cms.CmsContentFileRepository;
import nuri.business.domain.cms.CmsContentRevisionFileRepository;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 콘텐츠 페이지 첨부의 귀속 규칙(ADR-0039 결정 8)과 귀속 해제(ADR-0042). */
@ExtendWith(MockitoExtension.class)
class CmsContentFileServiceTest {

    @Mock private CmsContentFileRepository contentFileRepository;
    @Mock private CmsContentRevisionFileRepository revisionFileRepository;
    @Mock private FileMasterRepository fileMasterRepository;
    @Mock private FileDetailRepository fileDetailRepository;
    @Mock private AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    @Mock private FileService fileService;
    @InjectMocks private CmsContentFileService service;
    private MockedStatic<SecurityUtil> security;
    private final FileMaster master = mock(FileMaster.class);

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("editor"));
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private static CmsDocumentValidator.Normalized images(Long... atchFileSns) {
        return new CmsDocumentValidator.Normalized("{}", null, Set.of(atchFileSns), Set.of());
    }

    private static CmsDocumentValidator.Normalized files(Long... atchFileSns) {
        return new CmsDocumentValidator.Normalized("{}", null, Set.of(), Set.of(atchFileSns));
    }

    private static FileDetail detail(String extension, int seq) {
        FileDetail detail = mock(FileDetail.class);
        when(detail.getFileEstn()).thenReturn(extension);
        org.mockito.Mockito.lenient().when(detail.getAtchFileSeq()).thenReturn(seq);
        return detail;
    }

    private void uploadedBySameUser(long atchFileSn, FileDetail detail) {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(atchFileSn))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(atchFileSn)).thenReturn(Optional.empty());
        when(fileMasterRepository.findByIdForUpdate(atchFileSn)).thenReturn(Optional.of(master));
        when(fileDetailRepository.findByFileMaster(master)).thenReturn(List.of(detail));
    }

    private static CmsContentFile owned(long contsFileSn, long atchFileSn) {
        CmsContentFile file = CmsContentFile.create(1L, atchFileSn, 1, "editor", LocalDateTime.now());
        ReflectionTestUtils.setField(file, "contsFileSn", contsFileSn);
        return file;
    }

    @Test
    void claimsAnUploadedSingleImageAfterTheUploaderCheck() {
        uploadedBySameUser(9L, detail("PNG", 1));

        service.claim(1L, images(9L));

        InOrder order = inOrder(fileMasterRepository, attachmentAssignmentPolicy, contentFileRepository);
        order.verify(fileMasterRepository).findByIdForUpdate(9L);
        order.verify(attachmentAssignmentPolicy).assertAssignable(9L);
        ArgumentCaptor<CmsContentFile> saved = ArgumentCaptor.forClass(CmsContentFile.class);
        order.verify(contentFileRepository).save(saved.capture());
        assertThat(saved.getValue().getContsSn()).isEqualTo(1L);
        assertThat(saved.getValue().getAtchFileSeq()).isEqualTo(1);
        assertThat(saved.getValue().getFrstRgtrId()).isEqualTo("editor");
    }

    @Test
    void skipsAttachmentsThePageAlreadyOwnsButStillChecksTheirFormat() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L)))
                .thenReturn(List.of(CmsContentFile.create(1L, 9L, 1, "editor", LocalDateTime.now())));
        FileDetail png = detail("png", 1);
        when(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(9L, 1)).thenReturn(Optional.of(png));

        service.claim(1L, images(9L));

        verify(fileMasterRepository, never()).findByIdForUpdate(any());
        verify(contentFileRepository, never()).save(any());
        // 이미 귀속된 이미지를 내려받기 칸으로 옮기면 내려받기 형식 규칙을 본다.
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L)))
                .thenReturn(List.of(CmsContentFile.create(1L, 9L, 1, "editor", LocalDateTime.now())));
        assertThatThrownBy(() -> service.claim(1L, files(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("내려받기 파일은");
    }

    @Test
    void rejectsAnAttachmentThatBelongsToAnotherPage() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L))
                .thenReturn(Optional.of(CmsContentFile.create(2L, 9L, 1, "editor", LocalDateTime.now())));

        assertThatThrownBy(() -> service.claim(1L, images(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("다른 페이지");
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsSomeoneElsesUpload() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L)).thenReturn(Optional.empty());
        when(fileMasterRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(master));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED)).when(attachmentAssignmentPolicy).assertAssignable(9L);

        assertThatThrownBy(() -> service.claim(1L, images(9L))).isInstanceOf(BusinessException.class);
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsAnAttachmentWithMoreThanOneFile() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L)).thenReturn(Optional.empty());
        when(fileMasterRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(master));
        FileDetail first = mock(FileDetail.class);
        FileDetail second = mock(FileDetail.class);
        when(fileDetailRepository.findByFileMaster(master)).thenReturn(List.of(first, second));

        assertThatThrownBy(() -> service.claim(1L, images(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("하나씩");
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsSvgAndOtherNonImageFiles() {
        uploadedBySameUser(9L, detail("svg", 1));

        assertThatThrownBy(() -> service.claim(1L, images(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미지 파일");
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsWebpImagesBecauseTheUploadApiDoesNotAcceptThem() {
        // 일반 업로드가 받지 않는 형식을 안내하지 않는다(ADR-0042) — 귀속 판정도 같은 목록을 쓴다.
        uploadedBySameUser(9L, detail("webp", 1));

        assertThatThrownBy(() -> service.claim(1L, images(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("png·jpg·gif");
    }

    @Test
    void claimsADownloadFileWithADocumentFormat() {
        uploadedBySameUser(11L, detail("HWP", 1));

        service.claim(1L, files(11L));

        verify(contentFileRepository).save(any(CmsContentFile.class));
    }

    @Test
    void rejectsArchivesInADownloadCell() {
        uploadedBySameUser(11L, detail("zip", 1));

        assertThatThrownBy(() -> service.claim(1L, files(11L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("내려받기 파일은");
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void releasesOnlyAttachmentsThatNeitherTheDraftNorAnyRevisionUses() {
        CmsContentFile kept = owned(1L, 9L);
        CmsContentFile unused = owned(2L, 10L);
        CmsContentFile inRevision = owned(3L, 11L);
        when(contentFileRepository.findByContsSn(1L)).thenReturn(List.of(kept, unused, inRevision));
        when(revisionFileRepository.existsByIdContsFileSn(2L)).thenReturn(false);
        when(revisionFileRepository.existsByIdContsFileSn(3L)).thenReturn(true);

        assertThat(service.releaseUnused(1L, Set.of(9L))).isEqualTo(1);

        InOrder order = inOrder(contentFileRepository, fileService);
        order.verify(contentFileRepository).deleteAll(List.of(unused));
        // 파일 서비스는 JDBC 로 남은 참조를 센다 — 귀속 행 삭제를 먼저 내보낸다.
        order.verify(contentFileRepository).flush();
        order.verify(fileService).discardUnreferencedAttachment(10L);
        verify(fileService, never()).discardUnreferencedAttachment(11L);
        verify(fileService, never()).discardUnreferencedAttachment(9L);
    }

    @Test
    void releasingNothingTouchesNoFile() {
        when(contentFileRepository.findByContsSn(1L)).thenReturn(List.of(owned(1L, 9L)));

        assertThat(service.releaseUnused(1L, Set.of(9L))).isZero();

        verify(contentFileRepository, never()).deleteAll(any());
        verify(fileService, never()).discardUnreferencedAttachment(any());
    }

    @Test
    void releaseAllDetachesEveryAttachmentOfThePage() {
        CmsContentFile first = owned(1L, 9L);
        CmsContentFile second = owned(2L, 10L);
        when(contentFileRepository.findByContsSn(1L)).thenReturn(List.of(first, second));

        service.releaseAll(1L);

        verify(contentFileRepository).deleteAll(List.of(first, second));
        verify(fileService).discardUnreferencedAttachment(9L);
        verify(fileService).discardUnreferencedAttachment(10L);
    }
}
