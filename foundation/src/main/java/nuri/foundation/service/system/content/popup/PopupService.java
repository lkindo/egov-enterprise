package nuri.foundation.service.system.content.popup;

import nuri.foundation.service.system.content.popup.dto.PopupDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface PopupService {
    Page<PopupDto> getPopupList(String keyword, Pageable pageable);

    List<PopupDto> getActivePopups();

    PopupDto getPopup(String popupId);

    String createPopup(String userId, PopupDto dto);

    void updatePopup(String popupId, String userId, PopupDto dto);

    void deletePopup(String popupId);

    List<String> getPopupWhiteList();
}
