package nuri.business.service.system.content.popup;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.system.content.popup.PopupDomainRepository;
import nuri.business.service.system.content.popup.dto.PopupDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PopupService {

    private final PopupDomainRepository popupRepository;

    public Page<PopupDto> getPopupList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return popupRepository.findAll(Objects.requireNonNull(pageable)).map(PopupDto::from);
        }
        return popupRepository.findByPopupTtlNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(PopupDto::from);
    }

    public List<PopupDto> getActivePopups() {
        return popupRepository.findActivePopups(LocalDate.now()).stream()
                .map(PopupDto::from)
                .collect(Collectors.toList());
    }

    public PopupDto getPopup(Long popupSn) {
        return popupRepository.findById(Objects.requireNonNull(popupSn))
                .map(PopupDto::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createPopup(String userId, PopupDto dto) {
        Popup popup = Popup.builder()
                .popupTtlNm(dto.getPopupTtlNm())
                .fileUrl(dto.getFileUrl())
                .popupWdthPstn(dto.getPopupWdthPstn())
                .popupVrtcPstn(dto.getPopupVrtcPstn())
                .popupVrtcSz(dto.getPopupVrtcSz())
                .popupWdthSz(dto.getPopupWdthSz())
                .ntceBgnde(dto.getNtceBgnde() != null ? LocalDate.parse(dto.getNtceBgnde()) : null)
                .ntceEndde(dto.getNtceEndde() != null ? LocalDate.parse(dto.getNtceEndde()) : null)
                .stopvewSetupYn(dto.getStopvewSetupYn())
                .ntceYn(dto.getNtceYn())
                .build();
        popup.setFrstRgtrId(userId);
        Popup saved = popupRepository.save(Objects.requireNonNull(popup));
        return saved.getPopupSn();
    }

    @Transactional
    public void updatePopup(Long popupSn, String userId, PopupDto dto) {
        Popup popup = popupRepository.findById(Objects.requireNonNull(popupSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        popup.update(dto.getPopupTtlNm(), dto.getFileUrl(), dto.getPopupWdthPstn(),
                dto.getPopupVrtcPstn(),
                dto.getPopupVrtcSz(), dto.getPopupWdthSz(),
                dto.getNtceBgnde() != null ? LocalDate.parse(dto.getNtceBgnde()) : null,
                dto.getNtceEndde() != null ? LocalDate.parse(dto.getNtceEndde()) : null,
                dto.getStopvewSetupYn(), dto.getNtceYn());
        popup.setLastMdfrId(userId);
    }

    @Transactional
    public void deletePopup(Long popupSn) {
        if (!popupRepository.existsById(Objects.requireNonNull(popupSn))) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        popupRepository.deleteById(Objects.requireNonNull(popupSn));
    }

    public List<String> getPopupWhiteList() {
        return popupRepository.findAll().stream()
                .map(p -> p.getFileUrl())
                .collect(Collectors.toList());
    }
}
