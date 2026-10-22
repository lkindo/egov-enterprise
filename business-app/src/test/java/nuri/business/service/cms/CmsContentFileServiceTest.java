package nuri.business.service.cms;

import nuri.business.domain.cms.CmsContentFile;
import nuri.business.domain.cms.CmsContentFileRepository;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
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

/** 콘텐츠 페이지 이미지의 귀속 규칙(ADR-0039 결정 8). */
@ExtendWith(MockitoExtension.class)
class CmsContentFileServiceTest {

    @Mock private CmsContentFileRepository contentFileRepository;
    @Mock private FileMasterRepository fileMasterRepository;
    @Mock private FileDetailRepository fileDetailRepository;
    @Mock private AttachmentAssignmentPolicy attachmentAssignmentPolicy;
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

    private static FileDetail detail(String extension, int seq) {
        FileDetail detail = mock(FileDetail.class);
        when(detail.getFileEstn()).thenReturn(extension);
        org.mockito.Mockito.lenient().when(detail.getAtchFileSeq()).thenReturn(seq);
        return detail;
    }

    @Test
    void claimsAnUploadedSingleImageAfterTheUploaderCheck() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L)).thenReturn(Optional.empty());
        when(fileMasterRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(master));
        FileDetail png = detail("PNG", 1);
        when(fileDetailRepository.findByFileMaster(master)).thenReturn(List.of(png));

        service.claim(1L, Set.of(9L));

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
    void skipsImagesThePageAlreadyOwns() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L)))
                .thenReturn(List.of(CmsContentFile.create(1L, 9L, 1, "editor", LocalDateTime.now())));

        service.claim(1L, Set.of(9L));

        verify(fileMasterRepository, never()).findByIdForUpdate(any());
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsAnImageThatBelongsToAnotherPage() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L))
                .thenReturn(Optional.of(CmsContentFile.create(2L, 9L, 1, "editor", LocalDateTime.now())));

        assertThatThrownBy(() -> service.claim(1L, Set.of(9L)))
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

        assertThatThrownBy(() -> service.claim(1L, Set.of(9L))).isInstanceOf(BusinessException.class);
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

        assertThatThrownBy(() -> service.claim(1L, Set.of(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("파일 하나씩");
        verify(contentFileRepository, never()).save(any());
    }

    @Test
    void rejectsSvgAndOtherNonImageFiles() {
        when(contentFileRepository.findByContsSnAndAtchFileSnIn(1L, Set.of(9L))).thenReturn(List.of());
        when(contentFileRepository.findByAtchFileSn(9L)).thenReturn(Optional.empty());
        when(fileMasterRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(master));
        FileDetail svg = detail("svg", 1);
        when(fileDetailRepository.findByFileMaster(master)).thenReturn(List.of(svg));

        assertThatThrownBy(() -> service.claim(1L, Set.of(9L)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미지 파일");
        verify(contentFileRepository, never()).save(any());
    }
}
