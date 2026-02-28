package com.company.project.service.popup;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.popup.Popup;
import com.company.project.domain.popup.PopupDomainRepository;
import com.company.project.service.popup.dto.PopupDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
        return popupRepository.findByPopupTitleNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(PopupDto::from);
    }

    @Override
    public List<PopupDto> getActivePopups() {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        return popupRepository.findActivePopups(now).stream()
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
                    .popupTitleNm(dto.getPopupTitleNm())
                    .fileUrl(dto.getFileUrl())
                    .popupWlc(dto.getPopupWlc())
                    .popupHlc(dto.getPopupHlc())
                    .popupHSize(dto.getPopupHSize())
                    .popupWSize(dto.getPopupWSize())
                    .ntceBgnde(dto.getNtceBgnde())
                    .ntceEndde(dto.getNtceEndde())
                    .stopVewAt(dto.getStopVewAt())
                    .ntceAt(dto.getNtceAt())
                    .frstRegisterId(userId)
                    .build();
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

        popup.update(dto.getPopupTitleNm(), dto.getFileUrl(), dto.getPopupWlc(), dto.getPopupHlc(),
                dto.getPopupHSize(), dto.getPopupWSize(), dto.getNtceBgnde(), dto.getNtceEndde(),
                dto.getStopVewAt(), dto.getNtceAt(), userId);
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
                .map(Popup::getFileUrl)
                .collect(Collectors.toList());
    }
}
