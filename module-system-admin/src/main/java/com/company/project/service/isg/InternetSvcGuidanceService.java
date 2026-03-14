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
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InternetSvcGuidanceService implements EgovInternetSvcGuidanceService {

    private final InternetSvcGuidanceRepository internetSvcGuidanceRepository;

    @Override
    public InternetSvcGuidanceDto getIntnetSvcGuidance(String intnetSvcId) {
        return internetSvcGuidanceRepository.findById(Objects.requireNonNull(intnetSvcId))
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
                .build();
        internetSvcGuidanceRepository.save(Objects.requireNonNull(isg));
    }

    @Override
    @Transactional
    public void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        internetSvcGuidanceRepository.findById(Objects.requireNonNull(dto.getIntnetSvcId()))
                .ifPresent(isg -> isg.update(dto.getIntnetSvcNm(), dto.getIntnetSvcDc(), dto.getReflctAt()));
    }

    @Override
    @Transactional
    public void deleteIntnetSvcGuidance(String intnetSvcId) {
        internetSvcGuidanceRepository.deleteById(Objects.requireNonNull(intnetSvcId));
    }

    @Override
    public Page<InternetSvcGuidanceDto> getIntnetSvcGuidanceList(String searchKeyword, Pageable pageable) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return internetSvcGuidanceRepository.findByIntnetSvcNmContaining(searchKeyword, pageable)
                    .map(this::convertToDto);
        }
        return internetSvcGuidanceRepository.findAll(Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public List<InternetSvcGuidanceDto> getIntnetSvcGuidanceResult() {
        return java.util.Collections.emptyList();
    }

    private InternetSvcGuidanceDto convertToDto(InternetSvcGuidance isg) {
        return InternetSvcGuidanceDto.builder()
                .intnetSvcId(isg.getIntnetSvcId())
                .intnetSvcNm(isg.getIntnetSvcNm())
                .intnetSvcDc(isg.getIntnetSvcDc())
                .reflctAt(isg.getReflctAt())
                .userId(isg.getLastModifiedBy())
                .regDate(isg.getLastModifiedDate())
                .build();
    }
}
