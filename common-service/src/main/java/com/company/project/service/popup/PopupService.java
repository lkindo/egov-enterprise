package com.company.project.service.popup;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.popup.Popup;
import com.company.project.domain.popup.PopupRepository;
import com.company.project.service.popup.dto.PopupDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 팝업창 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PopupService implements EgovPopupService {

    private final PopupRepository popupRepository;

    @Override
    public Page<PopupDto> getPopupList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return popupRepository.findAll(pageable).map(PopupDto::from);
        }
        return popupRepository.findByPopupTitleNmContaining(keyword, pageable).map(PopupDto::from);
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
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return PopupDto.from(popup);
    }

    @Override
    @Transactional
    public String createPopup(String userId, PopupDto dto) {
        String popupId = "POP_" + String.format("%016d", System.currentTimeMillis());

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

        popupRepository.save(popup);
        return popupId;
    }

    @Override
    @Transactional
    public void updatePopup(String popupId, String userId, PopupDto dto) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        popup.update(dto.getPopupTitleNm(), dto.getFileUrl(), dto.getPopupWlc(), dto.getPopupHlc(),
                dto.getPopupHSize(), dto.getPopupWSize(), dto.getNtceBgnde(), dto.getNtceEndde(),
                dto.getStopVewAt(), dto.getNtceAt(), userId);
    }

    @Override
    @Transactional
    public void deletePopup(String popupId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        popupRepository.delete(popup);
    }

    @Override
    public List<String> getPopupWhiteList() {
        return popupRepository.findAll().stream()
                .map(Popup::getFileUrl)
                .collect(Collectors.toList());
    }
}
