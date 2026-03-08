package com.company.project.service.syshistory;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.syshistory.SystemHistory;
import com.company.project.domain.syshistory.SystemHistoryRepository;
import com.company.project.service.syshistory.dto.SystemHistoryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * ??뒪????????퉬???ы쁽?
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SystemHistoryService implements EgovSystemHistoryService {

    private final SystemHistoryRepository systemHistoryRepository;

    @Override
    public Page<SystemHistoryDto> getSystemHistoryList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return systemHistoryRepository.findAll(Objects.requireNonNull(pageable)).map(SystemHistoryDto::from);
        }
        return systemHistoryRepository.searchByKeyword(keyword, Objects.requireNonNull(pageable))
                .map(SystemHistoryDto::from);
    }

    @Override
    public SystemHistoryDto getSystemHistory(String histId) {
        SystemHistory history = systemHistoryRepository.findById(Objects.requireNonNull(histId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SystemHistoryDto.from(history);
    }

    @Override
    @Transactional
    public String createSystemHistory(String userId, SystemHistoryDto dto) {
        // ID ??꽦: HIST_ + timestamp
        String histId = "HIST_" + String.format("%013d", System.currentTimeMillis());

        SystemHistory history = SystemHistory.builder()
                .histId(histId)
                .sysNm(dto.getSysNm())
                .histSeCode(dto.getHistSeCode())
                .histCn(dto.getHistCn())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();

        systemHistoryRepository.save(Objects.requireNonNull(history));
        return histId;
    }

    @Override
    @Transactional
    public void updateSystemHistory(String histId, String userId, SystemHistoryDto dto) {
        SystemHistory history = systemHistoryRepository.findById(Objects.requireNonNull(histId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        history.update(dto.getSysNm(), dto.getHistSeCode(), dto.getHistCn(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteSystemHistory(String histId, String userId) {
        SystemHistory history = systemHistoryRepository.findById(Objects.requireNonNull(histId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        systemHistoryRepository.delete(Objects.requireNonNull(history));
    }
}
