package com.company.project.service.popup;

import com.company.project.service.popup.dto.PopupDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 팝업창 서비스 인터페이스
 */
public interface EgovPopupService {

    Page<PopupDto> getPopupList(String keyword, Pageable pageable);

    List<PopupDto> getActivePopups();

    PopupDto getPopup(String popupId);

    String createPopup(String userId, PopupDto dto);

    void updatePopup(String popupId, String userId, PopupDto dto);

    void deletePopup(String popupId);

    List<String> getPopupWhiteList();
}
