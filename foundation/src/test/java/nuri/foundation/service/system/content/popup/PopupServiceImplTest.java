package nuri.foundation.service.system.content.popup;

import nuri.foundation.domain.system.content.popup.Popup;
import nuri.foundation.domain.system.content.popup.PopupDomainRepository;
import nuri.foundation.service.system.content.popup.dto.PopupDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("PopupServiceImpl 단위 테스트")
class PopupServiceImplTest {

    @Mock
    private PopupDomainRepository popupRepository;

    @Mock
    private EgovIdGnrService egovPopupManageIdGnrService;

    @InjectMocks
    private PopupServiceImpl popupService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("팝업 등록")
    void createPopup() throws Exception {
        // given
        PopupDto dto = PopupDto.builder().popupTitleName("Test Popup").build();
        Popup popup = Popup.builder().popupId("POP1").popupTitleName("Test Popup").build();
        when(egovPopupManageIdGnrService.getNextStringId()).thenReturn("POP1");
        given(popupRepository.save(any(Popup.class))).willReturn(popup);

        // when
        popupService.createPopup("user1", dto);

        // then
        verify(popupRepository).save(any(Popup.class));
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
}
