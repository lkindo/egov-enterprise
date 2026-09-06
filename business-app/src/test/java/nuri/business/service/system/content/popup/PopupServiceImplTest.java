package nuri.business.service.system.content.popup;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.system.content.popup.PopupDomainRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.system.content.popup.dto.PopupDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("PopupService 단위 테스트 (Full Coverage)")
class PopupServiceImplTest {

    @Mock
    private PopupDomainRepository popupRepository;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @InjectMocks
    private PopupService popupService;

    // ==========================================
    // 1. 팝업 목록 및 상세 조회 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 없음")
    void getPopupList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("팝업1").build();
        given(popupRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(popup)));

        // when
        Page<PopupDto> result = popupService.getPopupList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPopupTtlNm()).isEqualTo("팝업1");
        verify(popupRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 있음")
    void getPopupList_WithKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupSn(1L).popupTtlNm("팝업검색").build();
        given(popupRepository.findByPopupTtlNmContaining(eq("검색"), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(popup)));

        // when
        Page<PopupDto> result = popupService.getPopupList("검색", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        verify(popupRepository, times(1)).findByPopupTtlNmContaining("검색", pageable);
    }

    @Test
    @DisplayName("활성 팝업 목록 조회")
    void getActivePopups() {
        // given
        Popup popup = Popup.builder().popupSn(1L).build();
        given(popupRepository.findActivePopups(any(LocalDate.class))).willReturn(List.of(popup));

        // when
        List<PopupDto> result = popupService.getActivePopups();

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("팝업 상세 조회 - 성공")
    void getPopup_Success() {
        // given
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("제목")
                .ntceBgnde(LocalDate.of(2026, 1, 1))
                .ntceEndde(LocalDate.of(2026, 1, 31))
                .build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        // when
        PopupDto result = popupService.getPopup(1L);

        // then
        assertThat(result.getPopupSn()).isEqualTo(1L);
        assertThat(result.getPopupTtlNm()).isEqualTo("제목");
        assertThat(result.getNtceBgnde()).isEqualTo("2026-01-01");
        assertThat(result.getNtceEndde()).isEqualTo("2026-01-31");
    }

    @Test
    @DisplayName("팝업 상세 조회 - 자원 없음 예외")
    void getPopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> popupService.getPopup(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Resource Not Found");
    }

    // ==========================================
    // 2. 팝업 등록, 수정, 삭제 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 등록 - 성공")
    void createPopup_Success() {
        // given
        PopupDto dto = PopupDto.builder()
                .popupTtlNm("Test Popup")
                .ntceBgnde("2026-01-01")
                .ntceEndde("2026-01-31")
                .stopvewSetupYn("Y")
                .ntceYn("Y")
                .build();

        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).popupTtlNm("Test Popup").build());

        // when
        Long popupSn = popupService.createPopup("admin", dto);

        // then
        assertThat(popupSn).isEqualTo(1L);
        verify(popupRepository, times(1)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - canonical 및 legacy 내부 첨부 URL은 정확한 ID를 검증한다")
    void createPopup_internalAttachmentUrlsAreValidated() {
        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).build());

        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Canonical")
                .fileUrl("/api/v1/files/101")
                .build());
        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Legacy")
                .fileUrl("/api/v1/files/download?fileId=202")
                .build());

        verify(attachmentAssignmentPolicy).assertAssignable(101L);
        verify(attachmentAssignmentPolicy).assertAssignable(202L);
    }

    @Test
    @DisplayName("팝업 등록 - 외부 URL과 일반 내부 자산 경로는 첨부 검증 대상이 아니다")
    void createPopup_nonAttachmentUrlsRemainAllowed() {
        given(popupRepository.save(any(Popup.class)))
                .willReturn(Popup.builder().popupSn(1L).build());

        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("External")
                .fileUrl("https://cdn.example.test/api/v1/files/101")
                .build());
        popupService.createPopup("admin", PopupDto.builder()
                .popupTtlNm("Asset")
                .fileUrl("/assets/popup.html")
                .build());

        verifyNoInteractions(attachmentAssignmentPolicy);
        verify(popupRepository, times(2)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - 내부 첨부 prefix를 쓴 비정상 URL은 fail-closed한다")
    void createPopup_malformedInternalAttachmentUrlFailsClosed() {
        List<String> malformed = List.of(
                "/api/v1/files/",
                "/api/v1/files/0",
                "/api/v1/files/000101",
                "/api/v1/files/101/extra",
                "/api/v1/files/101?download=true",
                "/api/v1/files/download?fileId=abc",
                "/api/v1/files/download?fileId=0",
                "/api/v1/files/download?fileId=000202",
                "/api/v1/files/download?fileId=202&download=true",
                "/api/v1/files/download?fileId=202#fragment",
                "/api/v1/files/not-a-number",
                "/api/v1/files/999999999999999999999999999999");

        for (String fileUrl : malformed) {
            assertThatThrownBy(() -> popupService.createPopup("admin", PopupDto.builder()
                            .popupTtlNm("Malformed")
                            .fileUrl(fileUrl)
                            .build()))
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode())
                    .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        }

        verifyNoInteractions(attachmentAssignmentPolicy, popupRepository);
    }

    @Test
    @DisplayName("팝업 등록 - 첨부 할당 거부 시 저장하지 않는다")
    void createPopup_deniedAttachmentDoesNotSave() {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> popupService.createPopup("admin", PopupDto.builder()
                        .popupTtlNm("Denied")
                        .fileUrl("/api/v1/files/101")
                        .build()))
                .isInstanceOf(BusinessException.class);

        verifyNoInteractions(popupRepository);
    }

    @Test
    @DisplayName("팝업 수정 - 성공")
    void updatePopup_Success() {
        // given
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        PopupDto dto = PopupDto.builder()
                .popupTtlNm("NEW")
                .ntceBgnde("2026-02-01")
                .ntceEndde("2026-02-28")
                .stopvewSetupYn("N")
                .ntceYn("N")
                .build();

        // when
        popupService.updatePopup(1L, "updater", dto);

        // then
        assertThat(popup.getPopupTtlNm()).isEqualTo("NEW");
        assertThat(popup.getNtceBgnde()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(popup.getNtceEndde()).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(popup.getLastMdfrId()).isEqualTo("updater");
    }

    @Test
    @DisplayName("팝업 수정 - 같은 첨부 유지와 null 분리는 재할당 검증을 건너뛴다")
    void updatePopup_sameOrDetachedAttachmentSkipsAssignmentCheck() {
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .fileUrl("/api/v1/files/101")
                .build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));

        popupService.updatePopup(1L, "updater", PopupDto.builder()
                .popupTtlNm("NEW")
                .fileUrl("/api/v1/files/download?fileId=101")
                .build());
        popupService.updatePopup(1L, "updater", PopupDto.builder()
                .popupTtlNm("DETACHED")
                .fileUrl(null)
                .build());

        verifyNoInteractions(attachmentAssignmentPolicy);
        assertThat(popup.getFileUrl()).isNull();
    }

    @Test
    @DisplayName("팝업 수정 - 새 내부 첨부 할당 거부 시 기존 엔티티를 변경하지 않는다")
    void updatePopup_deniedChangedAttachmentDoesNotMutate() {
        Popup popup = Popup.builder()
                .popupSn(1L)
                .popupTtlNm("OLD")
                .fileUrl("/api/v1/files/100")
                .build();
        given(popupRepository.findById(1L)).willReturn(Optional.of(popup));
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", PopupDto.builder()
                        .popupTtlNm("NEW")
                        .fileUrl("/api/v1/files/101")
                        .build()))
                .isInstanceOf(BusinessException.class);

        assertThat(popup.getPopupTtlNm()).isEqualTo("OLD");
        assertThat(popup.getFileUrl()).isEqualTo("/api/v1/files/100");
        assertThat(popup.getLastMdfrId()).isNull();
    }

    @Test
    @DisplayName("팝업 수정 - 자원 없음 예외")
    void updatePopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.findById(1L)).willReturn(Optional.empty());
        PopupDto dto = PopupDto.builder().popupTtlNm("NEW").build();

        // when & then
        assertThatThrownBy(() -> popupService.updatePopup(1L, "updater", dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("팝업 삭제 - 성공")
    void deletePopup_Success() {
        // given
        given(popupRepository.existsById(1L)).willReturn(true);

        // when
        popupService.deletePopup(1L);

        // then
        verify(popupRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("팝업 삭제 - 자원 없음 예외")
    void deletePopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.existsById(1L)).willReturn(false);

        // when & then
        assertThatThrownBy(() -> popupService.deletePopup(1L))
                .isInstanceOf(BusinessException.class);
    }

    // ==========================================
    // 3. 화이트리스트 추출 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 화이트리스트 추출")
    void getPopupWhiteList_ShouldReturnUrls() {
        // given
        Popup p1 = Popup.builder().popupSn(1L).fileUrl("/page1.html").build();
        Popup p2 = Popup.builder().popupSn(2L).fileUrl("/page2.html").build();
        given(popupRepository.findAll()).willReturn(List.of(p1, p2));

        // when
        List<String> whitelist = popupService.getPopupWhiteList();

        // then
        assertThat(whitelist).hasSize(2);
        assertThat(whitelist).containsExactly("/page1.html", "/page2.html");
    }
}
