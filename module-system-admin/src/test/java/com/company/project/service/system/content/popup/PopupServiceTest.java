package com.company.project.service.system.content.popup;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.system.content.popup.Popup;
import com.company.project.domain.system.content.popup.PopupDomainRepository;
import com.company.project.service.system.content.popup.dto.PopupDto;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PopupService 테스트")
class PopupServiceTest {

    @Mock
    private PopupDomainRepository popupRepository;

    @Mock
    private EgovIdGnrService egovPopupManageIdGnrService;

    @InjectMocks
    private PopupServiceImpl popupService;

    @Test
    @DisplayName("팝업 목록 조회 성공")
    void getPopupList_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<Popup> page = new PageImpl<>(List.of(createMockPopup("P1", "Title")));
        given(popupRepository.findAll(pageable)).willReturn(page);

        // When
        Page<PopupDto> result = popupService.getPopupList(null, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(popupRepository).findAll(pageable);
    }

    @Test
    @DisplayName("활성 팝업 조회 성공")
    void getActivePopups_Success() {
        // Given
        given(popupRepository.findActivePopups(anyString())).willReturn(List.of(createMockPopup("P1", "Title")));

        // When
        List<PopupDto> result = popupService.getActivePopups();

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(popupRepository).findActivePopups(anyString());
    }

    @Test
    @DisplayName("팝업 상세 조회 성공")
    void getPopup_Success() {
        // Given
        given(popupRepository.findById("P1")).willReturn(Optional.of(createMockPopup("P1", "Title")));

        // When
        PopupDto result = popupService.getPopup("P1");

        // Then
        assertNotNull(result);
        assertEquals("P1", result.getPopupId());
        verify(popupRepository).findById("P1");
    }

    @Test
    @DisplayName("존재하지 않는 팝업 조회 시 예외 발생")
    void getPopup_NotFound() {
        // Given
        given(popupRepository.findById("P1")).willReturn(Optional.empty());

        // When & Then
        assertThrows(BusinessException.class, () -> popupService.getPopup("P1"));
    }

    @Test
    @DisplayName("팝업 등록 성공")
    void createPopup_Success() throws Exception {
        // Given
        PopupDto dto = PopupDto.builder().popupTitleName("New").build();
        given(egovPopupManageIdGnrService.getNextStringId()).willReturn("P1");

        // When
        String id = popupService.createPopup("user", dto);

        // Then
        assertEquals("P1", id);
        verify(popupRepository).save(any(Popup.class));
    }

    @Test
    @DisplayName("팝업 수정 성공")
    void updatePopup_Success() {
        // Given
        Popup popup = createMockPopup("P1", "Old");
        given(popupRepository.findById("P1")).willReturn(Optional.of(popup));

        PopupDto dto = PopupDto.builder().popupTitleName("Updated").build();

        // When
        popupService.updatePopup("P1", "user", dto);

        // Then
        assertEquals("Updated", popup.getPopupTitleName());
    }

    @Test
    @DisplayName("팝업 삭제 성공")
    void deletePopup_Success() {
        // Given
        given(popupRepository.existsById("P1")).willReturn(true);

        // When
        popupService.deletePopup("P1");

        // Then
        verify(popupRepository).deleteById("P1");
    }

    private Popup createMockPopup(String id, String title) {
        return Popup.builder()
                .popupId(id)
                .popupTitleName(title)
                .build();
    }
}
