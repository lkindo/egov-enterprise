package com.company.project.service.rsm;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.rsm.RecentSrchwrd;
import com.company.project.domain.rsm.RecentSrchwrdManage;
import com.company.project.domain.rsm.RecentSrchwrdManageRepository;
import com.company.project.domain.rsm.RecentSrchwrdRepository;
import com.company.project.service.rsm.dto.RecentSrchwrdDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecentSrchwrdService implements EgovRecentSrchwrdService {

    private final RecentSrchwrdManageRepository recentSrchwrdManageRepository;
    private final RecentSrchwrdRepository recentSrchwrdRepository;

    @Override
    public Page<RecentSrchwrdDto> getRecentSrchwrdManageList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return recentSrchwrdManageRepository.findAll(pageable).map(RecentSrchwrdDto::from);
        }
        return recentSrchwrdManageRepository.findBySrchwrdManageNmContaining(keyword, pageable)
                .map(RecentSrchwrdDto::from);
    }

    @Override
    public RecentSrchwrdDto getRecentSrchwrdManage(String manageId) {
        return recentSrchwrdManageRepository.findById(Objects.requireNonNull(manageId))
                .map(RecentSrchwrdDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRecentSrchwrdManage(RecentSrchwrdDto dto) {
        String id = "RSM_" + String.format("%013d", System.currentTimeMillis());
        RecentSrchwrdManage entity = RecentSrchwrdManage.builder()
                .srchwrdManageId(id)
                .srchwrdManageNm(dto.getSrchwrdManageNm())
                .srchwrdConectUrl(dto.getSrchwrdConectUrl())
                .userSearchAt(dto.getUserSearchAt())
                .build();
        recentSrchwrdManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateRecentSrchwrdManage(RecentSrchwrdDto dto) {
        RecentSrchwrdManage entity = recentSrchwrdManageRepository
                .findById(Objects.requireNonNull(dto.getSrchwrdManageId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSrchwrdManageNm(), dto.getSrchwrdConectUrl(), dto.getUserSearchAt(), null);
    }

    @Override
    @Transactional
    public void deleteRecentSrchwrdManage(String manageId) {
        recentSrchwrdRepository.deleteBySrchwrdManageId(Objects.requireNonNull(manageId));
        recentSrchwrdManageRepository.deleteById(Objects.requireNonNull(manageId));
    }

    @Override
    public Page<RecentSrchwrdDto> getRecentSrchwrdList(String manageId, Pageable pageable) {
        return recentSrchwrdRepository.findBySrchwrdManageId(manageId, pageable).map(RecentSrchwrdDto::from);
    }

    @Override
    @Transactional
    public void insertRecentSrchwrd(String manageId, String srchwrdNm) {
        String id = "RSW_" + String.format("%013d", System.currentTimeMillis());
        RecentSrchwrd entity = RecentSrchwrd.builder()
                .srchwrdId(id)
                .srchwrdManageId(manageId)
                .srchwrdNm(srchwrdNm)
                .build();
        recentSrchwrdRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteRecentSrchwrd(String srchwrdId) {
        recentSrchwrdRepository.deleteById(Objects.requireNonNull(srchwrdId));
    }
}
