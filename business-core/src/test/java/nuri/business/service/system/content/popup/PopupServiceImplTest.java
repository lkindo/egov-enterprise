package nuri.business.service.system.content.popup;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.system.content.popup.PopupDomainRepository;
import nuri.business.service.system.content.popup.dto.PopupDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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
    private EgovIdGnrService egovPopupManageIdGnrService;

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
        Popup popup = Popup.builder().popupId("POP_01").popupTtlNm("팝업1").build();
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
        Popup popup = Popup.builder().popupId("POP_01").popupTtlNm("팝업검색").build();
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
        Popup popup = Popup.builder().popupId("POP1").build();
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
                .popupId("POP1")
                .popupTtlNm("제목")
                .ntceBgnde(LocalDate.of(2026, 1, 1))
                .ntceEndde(LocalDate.of(2026, 1, 31))
                .build();
        given(popupRepository.findById("POP1")).willReturn(Optional.of(popup));

        // when
        PopupDto result = popupService.getPopup("POP1");

        // then
        assertThat(result.getPopupId()).isEqualTo("POP1");
        assertThat(result.getPopupTtlNm()).isEqualTo("제목");
        assertThat(result.getNtceBgnde()).isEqualTo("2026-01-01");
        assertThat(result.getNtceEndde()).isEqualTo("2026-01-31");
    }

    @Test
    @DisplayName("팝업 상세 조회 - 자원 없음 예외")
    void getPopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.findById("POP1")).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> popupService.getPopup("POP1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Resource Not Found");
    }

    // ==========================================
    // 2. 팝업 등록, 수정, 삭제 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 등록 - 성공")
    void createPopup_Success() throws Exception {
        // given
        PopupDto dto = PopupDto.builder()
                .popupTtlNm("Test Popup")
                .ntceBgnde("2026-01-01")
                .ntceEndde("2026-01-31")
                .stopvewSetupYn("Y")
                .ntceYn("Y")
                .build();
        given(egovPopupManageIdGnrService.getNextStringId()).willReturn("POP_99");

        // when
        String popupId = popupService.createPopup("admin", dto);

        // then
        assertThat(popupId).isEqualTo("POP_99");
        verify(popupRepository, times(1)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 등록 - ID 생성 실패 시 RuntimeException 발생")
    void createPopup_IdGnrException_ShouldThrowRuntimeException() throws Exception {
        // given
        PopupDto dto = PopupDto.builder().popupTtlNm("Test").build();
        given(egovPopupManageIdGnrService.getNextStringId()).willThrow(new RuntimeException("ID generation fail"));

        // when & then
        assertThatThrownBy(() -> popupService.createPopup("admin", dto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to generate popup ID");
    }

    @Test
    @DisplayName("팝업 수정 - 성공")
    void updatePopup_Success() {
        // given
        Popup popup = Popup.builder()
                .popupId("POP1")
                .popupTtlNm("OLD")
                .build();
        given(popupRepository.findById("POP1")).willReturn(Optional.of(popup));

        PopupDto dto = PopupDto.builder()
                .popupTtlNm("NEW")
                .ntceBgnde("2026-02-01")
                .ntceEndde("2026-02-28")
                .stopvewSetupYn("N")
                .ntceYn("N")
                .build();

        // when
        popupService.updatePopup("POP1", "updater", dto);

        // then
        assertThat(popup.getPopupTtlNm()).isEqualTo("NEW");
        assertThat(popup.getNtceBgnde()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(popup.getNtceEndde()).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(popup.getLastMdfrId()).isEqualTo("updater");
    }

    @Test
    @DisplayName("팝업 수정 - 자원 없음 예외")
    void updatePopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.findById("POP1")).willReturn(Optional.empty());
        PopupDto dto = PopupDto.builder().popupTtlNm("NEW").build();

        // when & then
        assertThatThrownBy(() -> popupService.updatePopup("POP1", "updater", dto))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("팝업 삭제 - 성공")
    void deletePopup_Success() {
        // given
        given(popupRepository.existsById("POP1")).willReturn(true);

        // when
        popupService.deletePopup("POP1");

        // then
        verify(popupRepository, times(1)).deleteById("POP1");
    }

    @Test
    @DisplayName("팝업 삭제 - 자원 없음 예외")
    void deletePopup_NotFound_ShouldThrowBusinessException() {
        // given
        given(popupRepository.existsById("POP1")).willReturn(false);

        // when & then
        assertThatThrownBy(() -> popupService.deletePopup("POP1"))
                .isInstanceOf(BusinessException.class);
    }

    // ==========================================
    // 3. 화이트리스트 추출 테스트
    // ==========================================

    @Test
    @DisplayName("팝업 화이트리스트 추출")
    void getPopupWhiteList_ShouldReturnUrls() {
        // given
        Popup p1 = Popup.builder().popupId("POP1").fileUrl("/page1.html").build();
        Popup p2 = Popup.builder().popupId("POP2").fileUrl("/page2.html").build();
        given(popupRepository.findAll()).willReturn(List.of(p1, p2));

        // when
        List<String> whitelist = popupService.getPopupWhiteList();

        // then
        assertThat(whitelist).hasSize(2);
        assertThat(whitelist).containsExactly("/page1.html", "/page2.html");
    }
}
