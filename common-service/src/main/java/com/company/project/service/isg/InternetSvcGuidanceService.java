package com.company.project.service.isg;

import com.company.project.domain.isg.InternetSvcGuidance;
import com.company.project.domain.isg.InternetSvcGuidanceRepository;
import com.company.project.service.isg.dto.InternetSvcGuidanceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InternetSvcGuidanceService implements EgovInternetSvcGuidanceService {

    private final InternetSvcGuidanceRepository internetSvcGuidanceRepository;

    @Override
    public InternetSvcGuidanceDto getIntnetSvcGuidance(String intnetSvcId) {
        return internetSvcGuidanceRepository.findById(intnetSvcId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        InternetSvcGuidance isg = InternetSvcGuidance.builder()
                .intnetSvcId(dto.getIntnetSvcId())
                .intnetSvcNm(dto.getIntnetSvcNm())
                .intnetSvcDc(dto.getIntnetSvcDc())
                .reflctAt(dto.getReflctAt())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        internetSvcGuidanceRepository.save(isg);
    }

    @Override
    @Transactional
    public void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        internetSvcGuidanceRepository.findById(dto.getIntnetSvcId())
                .ifPresent(isg -> {
                    // InternetSvcGuidance 엔티티에 update 메소드 추가 필요 시 반영
                });
    }

    @Override
    @Transactional
    public void deleteIntnetSvcGuidance(String intnetSvcId) {
        internetSvcGuidanceRepository.deleteById(intnetSvcId);
    }

    @Override
    public Page<InternetSvcGuidanceDto> getIntnetSvcGuidanceList(String searchKeyword, Pageable pageable) {
        return internetSvcGuidanceRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    @Override
    public List<InternetSvcGuidanceDto> getIntnetSvcGuidanceResult() {
        // ReflectionAt == 'Y' 게시 대상 조회 (Repository 확장 필요)
        return null; // 구현 생략
    }

    private InternetSvcGuidanceDto convertToDto(InternetSvcGuidance isg) {
        return InternetSvcGuidanceDto.builder()
                .intnetSvcId(isg.getIntnetSvcId())
                .intnetSvcNm(isg.getIntnetSvcNm())
                .intnetSvcDc(isg.getIntnetSvcDc())
                .reflctAt(isg.getReflctAt())
                .userId(isg.getLastUpdusrId())
                .regDate(isg.getLastUpdtPnttm())
                .build();
    }
}
