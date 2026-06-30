package nuri.business.service.system.content.popup;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.system.content.popup.Popup;
import nuri.business.domain.system.content.popup.PopupDomainRepository;
import nuri.business.service.system.content.popup.dto.PopupDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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
public class PopupServiceImpl implements PopupService {

    private final PopupDomainRepository popupRepository;
    private final EgovIdGnrService egovPopupManageIdGnrService;

    @Override
    public Page<PopupDto> getPopupList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return popupRepository.findAll(Objects.requireNonNull(pageable)).map(PopupDto::from);
        }
        return popupRepository.findByPopupTtlNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(PopupDto::from);
    }

    @Override
    public List<PopupDto> getActivePopups() {
        return popupRepository.findActivePopups(LocalDate.now()).stream()
                .map(PopupDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public PopupDto getPopup(String popupId) {
        return popupRepository.findById(Objects.requireNonNull(popupId))
                .map(PopupDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createPopup(String userId, PopupDto dto) {
        try {
            String popupId = egovPopupManageIdGnrService.getNextStringId();
            Popup popup = Popup.builder()
                    .popupId(popupId)
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
            popupRepository.save(Objects.requireNonNull(popup));
            return popupId;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate popup ID", e);
        }
    }

    @Override
    @Transactional
    public void updatePopup(String popupId, String userId, PopupDto dto) {
        Popup popup = popupRepository.findById(Objects.requireNonNull(popupId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        popup.update(dto.getPopupTtlNm(), dto.getFileUrl(), dto.getPopupWdthPstn(),
                dto.getPopupVrtcPstn(),
                dto.getPopupVrtcSz(), dto.getPopupWdthSz(),
                dto.getNtceBgnde() != null ? LocalDate.parse(dto.getNtceBgnde()) : null,
                dto.getNtceEndde() != null ? LocalDate.parse(dto.getNtceEndde()) : null,
                dto.getStopvewSetupYn(), dto.getNtceYn());
        popup.setLastMdfrId(userId);
    }

    @Override
    @Transactional
    public void deletePopup(String popupId) {
        if (!popupRepository.existsById(Objects.requireNonNull(popupId))) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        popupRepository.deleteById(Objects.requireNonNull(popupId));
    }

    @Override
    public List<String> getPopupWhiteList() {
        return popupRepository.findAll().stream()
                .map(p -> p.getFileUrl())
                .collect(Collectors.toList());
    }
}
