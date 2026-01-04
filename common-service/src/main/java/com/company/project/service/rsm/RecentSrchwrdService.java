package com.company.project.service.rsm;

import com.company.project.domain.rsm.*;
import com.company.project.service.rsm.dto.RecentSrchwrdDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecentSrchwrdService implements EgovRecentSrchwrdService {

    private final RecentSrchwrdManageRepository manageRepository;
    private final RecentSrchwrdRepository srchwrdRepository;

    @Override
    public RecentSrchwrdDto getRecentSrchwrdManage(String manageId) {
        return manageRepository.findById(manageId)
                .map(m -> RecentSrchwrdDto.builder()
                        .srchwrdManageId(m.getSrchwrdManageId())
                        .srchwrdManageNm(m.getSrchwrdManageNm())
                        .srchwrdConectUrl(m.getSrchwrdConectUrl())
                        .userSearchAt(m.getUserSearchAt())
                        .frstRegisterId(m.getFrstRegisterId())
                        .frstRegisterPnttm(m.getCreatedDate())
                        .build())
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerRecentSrchwrdManage(RecentSrchwrdDto dto) {
        RecentSrchwrdManage manage = RecentSrchwrdManage.builder()
                .srchwrdManageId(dto.getSrchwrdManageId())
                .srchwrdManageNm(dto.getSrchwrdManageNm())
                .srchwrdConectUrl(dto.getSrchwrdConectUrl())
                .userSearchAt(dto.getUserSearchAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .lastUpdusrId(dto.getFrstRegisterId())
                .build();
        manageRepository.save(manage);
    }

    @Override
    @Transactional
    public void updateRecentSrchwrdManage(RecentSrchwrdDto dto) {
        manageRepository.findById(dto.getSrchwrdManageId())
                .ifPresent(m -> m.update(dto.getSrchwrdManageNm(), dto.getSrchwrdConectUrl(), dto.getUserSearchAt(),
                        dto.getFrstRegisterId()));
    }

    @Override
    @Transactional
    public void deleteRecentSrchwrdManage(String manageId) {
        manageRepository.deleteById(manageId);
    }

    @Override
    public Page<RecentSrchwrdDto> getRecentSrchwrdManageList(String searchKeyword, Pageable pageable) {
        return manageRepository.findAll(pageable)
                .map(m -> RecentSrchwrdDto.builder()
                        .srchwrdManageId(m.getSrchwrdManageId())
                        .srchwrdManageNm(m.getSrchwrdManageNm())
                        .srchwrdConectUrl(m.getSrchwrdConectUrl())
                        .userSearchAt(m.getUserSearchAt())
                        .build());
    }

    @Override
    @Transactional
    public void registerRecentSrchwrd(RecentSrchwrdDto dto) {
        RecentSrchwrdManage manage = manageRepository.findById(dto.getSrchwrdManageId()).orElse(null);
        if (manage != null) {
            RecentSrchwrd srchwrd = RecentSrchwrd.builder()
                    .srchwrdId(dto.getSrchwrdId())
                    .recentSrchwrdManage(manage)
                    .srchwrdNm(dto.getSrchwrdNm())
                    .frstRegisterId(dto.getFrstRegisterId())
                    .lastUpdusrId(dto.getFrstRegisterId())
                    .build();
            srchwrdRepository.save(srchwrd);
        }
    }

    @Override
    @Transactional
    public void deleteRecentSrchwrd(String srchwrdId) {
        srchwrdRepository.deleteById(srchwrdId);
    }

    @Override
    public Page<RecentSrchwrdDto> getRecentSrchwrdList(String manageId, String searchKeyword, Pageable pageable) {
        // manageId 기반 필터링 필요 (Repository 확장 시 반영 가능)
        return srchwrdRepository.findAll(pageable)
                .map(s -> RecentSrchwrdDto.builder()
                        .srchwrdId(s.getSrchwrdId())
                        .srchwrdNm(s.getSrchwrdNm())
                        .frstRegisterPnttm(s.getCreatedDate())
                        .build());
    }
}
