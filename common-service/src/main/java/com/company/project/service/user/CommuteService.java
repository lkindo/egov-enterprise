package com.company.project.service.user;

import com.company.project.domain.user.entity.Commute;
import com.company.project.domain.user.repository.CommuteRepository;
import com.company.project.service.user.dto.CommuteDto;
import lombok.RequiredArgsConstructor;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommuteService implements EgovCommuteService {

    private final CommuteRepository commuteRepository;

    @Override
    @Transactional
    public void registerStartWork(CommuteDto dto) {
        Commute commute = Commute.builder()
                .commuteId(dto.getCommuteId())
                .userId(dto.getUserId())
                .startTime(dto.getStartTime())
                .startStatus(dto.getStartStatus())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        commuteRepository.save(Objects.requireNonNull(commute));
    }

    @Override
    @Transactional
    public void registerEndWork(CommuteDto dto) {
        commuteRepository.findByUserIdAndStartTimeIsNotNullAndEndTimeIsNull(dto.getUserId())
                .ifPresent(c -> c.updateEndTime(
                        dto.getEndTime(),
                        dto.getWorkHours(),
                        dto.getOvertimeHours(),
                        dto.getEndStatus(),
                        dto.getUserId()));
    }

    @Override
    public Page<CommuteDto> getCommuteList(String userId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return commuteRepository.findAll(pageable)
                .map(c -> CommuteDto.builder()
                        .commuteId(c.getCommuteId())
                        .userId(c.getUserId())
                        .startTime(c.getStartTime())
                        .endTime(c.getEndTime())
                        .workHours(c.getWorkHours())
                        .build());
    }
}
