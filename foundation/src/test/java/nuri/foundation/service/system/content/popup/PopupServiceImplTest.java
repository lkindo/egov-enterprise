package nuri.foundation.service.system.content.popup;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.content.popup.Popup;
import nuri.foundation.domain.system.content.popup.PopupDomainRepository;
import nuri.foundation.service.system.content.popup.dto.PopupDto;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("PopupServiceImpl 단위 테스트")
class PopupServiceImplTest {

    @InjectMocks
    private PopupServiceImpl popupService;

    @Mock
    private PopupDomainRepository popupRepository;

    @Mock
    private EgovIdGnrService egovPopupManageIdGnrService;

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 없음")
    void getPopupList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupId("POPUP_01").popupTitleName("Test Popup").build();
        Page<Popup> page = new PageImpl<>(List.of(popup));
        
        given(popupRepository.findAll(pageable)).willReturn(page);

        // when
        Page<PopupDto> result = popupService.getPopupList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPopupId()).isEqualTo("POPUP_01");
    }

    @Test
    @DisplayName("팝업 목록 조회 - 키워드 있음")
    void getPopupList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        Popup popup = Popup.builder().popupId("POPUP_01").popupTitleName("Test Popup").build();
        Page<Popup> page = new PageImpl<>(List.of(popup));
        
        given(popupRepository.findByPopupTitleNameContaining(keyword, pageable)).willReturn(page);

        // when
        Page<PopupDto> result = popupService.getPopupList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPopupTitleName()).isEqualTo("Test Popup");
    }

    @Test
    @DisplayName("활성 팝업 목록 조회")
    void getActivePopups() {
        // given
        Popup popup = Popup.builder().popupId("POPUP_01").popupTitleName("Test Popup").build();
        given(popupRepository.findActivePopups(anyString())).willReturn(List.of(popup));

        // when
        List<PopupDto> result = popupService.getActivePopups();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPopupId()).isEqualTo("POPUP_01");
    }

    @Test
    @DisplayName("팝업 상세 조회 - 성공")
    void getPopup_Success() {
        // given
        Popup popup = Popup.builder().popupId("POPUP_01").popupTitleName("Test Popup").build();
        given(popupRepository.findById("POPUP_01")).willReturn(Optional.of(popup));

        // when
        PopupDto result = popupService.getPopup("POPUP_01");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getPopupTitleName()).isEqualTo("Test Popup");
    }

    @Test
    @DisplayName("팝업 상세 조회 - 실패 (존재하지 않음)")
    void getPopup_Fail_NotFound() {
        // given
        given(popupRepository.findById("POPUP_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> popupService.getPopup("POPUP_99"));
    }

    @Test
    @DisplayName("팝업 생성 - 성공")
    void createPopup() throws Exception {
        // given
        String userId = "user1";
        PopupDto dto = PopupDto.builder().popupTitleName("New Popup").fileUrl("/test.png").build();
        
        given(egovPopupManageIdGnrService.getNextStringId()).willReturn("POPUP_01");
        given(popupRepository.save(any(Popup.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        String createdPopupId = popupService.createPopup(userId, dto);

        // then
        assertThat(createdPopupId).isEqualTo("POPUP_01");
        verify(popupRepository, times(1)).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 수정 - 성공")
    void updatePopup() {
        // given
        Popup popup = Popup.builder().popupId("POPUP_01").popupTitleName("Old Popup").build();
        given(popupRepository.findById("POPUP_01")).willReturn(Optional.of(popup));
        
        PopupDto updateDto = PopupDto.builder().popupTitleName("Updated Popup").build();

        // when
        popupService.updatePopup("POPUP_01", "user1", updateDto);

        // then
        assertThat(popup.getPopupTitleName()).isEqualTo("Updated Popup");
    }

    @Test
    @DisplayName("팝업 삭제 - 성공")
    void deletePopup_Success() {
        // given
        given(popupRepository.existsById("POPUP_01")).willReturn(true);

        // when
        popupService.deletePopup("POPUP_01");

        // then
        verify(popupRepository, times(1)).deleteById("POPUP_01");
    }

    @Test
    @DisplayName("팝업 삭제 - 실패 (존재하지 않음)")
    void deletePopup_Fail() {
        // given
        given(popupRepository.existsById("POPUP_99")).willReturn(false);

        // when & then
        assertThrows(BusinessException.class, () -> popupService.deletePopup("POPUP_99"));
    }

    @Test
    @DisplayName("팝업 화이트리스트 조회")
    void getPopupWhiteList() {
        // given
        Popup popup1 = Popup.builder().popupId("POPUP_01").fileUrl("/test1.png").build();
        Popup popup2 = Popup.builder().popupId("POPUP_02").fileUrl("/test2.png").build();
        given(popupRepository.findAll()).willReturn(List.of(popup1, popup2));

        // when
        List<String> urls = popupService.getPopupWhiteList();

        // then
        assertThat(urls).containsExactly("/test1.png", "/test2.png");
    }
}
