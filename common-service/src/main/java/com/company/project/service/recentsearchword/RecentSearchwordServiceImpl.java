package com.company.project.service.recentsearchword;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.recentsearchword.RecentSearchword;
import com.company.project.domain.recentsearchword.RecentSearchwordManage;
import com.company.project.domain.recentsearchword.RecentSearchwordManageRepository;
import com.company.project.domain.recentsearchword.RecentSearchwordRepository;
import com.company.project.service.recentsearchword.dto.RecentSearchwordDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecentSearchwordServiceImpl implements RecentSearchwordService {

    private final RecentSearchwordManageRepository recentSearchwordManageRepository;
    private final RecentSearchwordRepository recentSearchwordRepository;

    @Override
    public Page<RecentSearchwordDto> getRecentSearchwordManageList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return recentSearchwordManageRepository.findAll(pageable).map(RecentSearchwordDto::from);
        }
        return recentSearchwordManageRepository.findBySearchwordManageNmContaining(keyword, pageable)
                .map(RecentSearchwordDto::from);
    }

    @Override
    public RecentSearchwordDto getRecentSearchwordManage(String manageId) {
        return recentSearchwordManageRepository.findById(Objects.requireNonNull(manageId))
                .map(RecentSearchwordDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRecentSearchwordManage(RecentSearchwordDto dto) {
        String id = "RSM_" + String.format("%013d", System.currentTimeMillis());
        RecentSearchwordManage entity = RecentSearchwordManage.builder()
                .searchwordManageId(id)
                .searchwordManageNm(dto.getSearchwordManageNm())
                .searchwordConectUrl(dto.getSearchwordConectUrl())
                .userSearchAt(dto.getUserSearchAt())
                .build();
        recentSearchwordManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateRecentSearchwordManage(RecentSearchwordDto dto) {
        RecentSearchwordManage entity = recentSearchwordManageRepository
                .findById(Objects.requireNonNull(dto.getSearchwordManageId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getSearchwordManageNm(), dto.getSearchwordConectUrl(), dto.getUserSearchAt(), null);
    }

    @Override
    @Transactional
    public void deleteRecentSearchwordManage(String manageId) {
        recentSearchwordRepository.deleteBySearchwordManageId(Objects.requireNonNull(manageId));
        recentSearchwordManageRepository.deleteById(Objects.requireNonNull(manageId));
    }

    @Override
    public Page<RecentSearchwordDto> getRecentSearchwordList(String manageId, Pageable pageable) {
        return recentSearchwordRepository.findBySearchwordManageId(manageId, pageable).map(RecentSearchwordDto::from);
    }

    @Override
    @Transactional
    public void insertRecentSearchword(String manageId, String searchwordNm) {
        String id = "RSW_" + String.format("%013d", System.currentTimeMillis());
        RecentSearchword entity = RecentSearchword.builder()
                .searchwordId(id)
                .searchwordManageId(manageId)
                .searchwordNm(searchwordNm)
                .build();
        recentSearchwordRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteRecentSearchword(String searchwordId) {
        recentSearchwordRepository.deleteById(Objects.requireNonNull(searchwordId));
    }
}