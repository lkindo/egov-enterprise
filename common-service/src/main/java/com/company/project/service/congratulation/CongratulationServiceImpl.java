package com.company.project.service.congratulation;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.congratulation.Congratulation;
import com.company.project.domain.congratulation.CongratulationRepository;
import com.company.project.service.congratulation.dto.CongratulationDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CongratulationServiceImpl implements CongratulationService {

    private final CongratulationRepository congratulationRepository;
    private final EgovIdGnrService egovCtsnnIdGnrService;

    @Override
    public CongratulationDto getCongratulation(@NonNull String congratulationId) {
        return congratulationRepository.findById(Objects.requireNonNull(congratulationId))
                .map(CongratulationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createCongratulation(String userId, CongratulationDto dto) {
        try {
            String id = egovCtsnnIdGnrService.getNextStringId();
            Congratulation entity = Congratulation.builder()
                    .congratulationId(id)
                    .userId(dto.getUserId())
                    .congratulationCode(dto.getCongratulationCode())
                    .requestDate(dto.getRequestDate())
                    .congratulationName(dto.getCongratulationName())
                    .trgterName(dto.getTrgterName())
                    .birthday(dto.getBirthday())
                    .occurrenceDate(dto.getOccurrenceDate())
                    .relate(dto.getRelate())
                    .remark(dto.getRemark())
                    .confmAt("R")
                    .frstRegisterId(userId)
                    .lastUpdusrId(userId)
                    .build();
            congratulationRepository.save(Objects.requireNonNull(entity));
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Congratulation ID", e);
        }
    }

    @Override
    @Transactional
    public void updateCongratulation(String congratulationId, String userId, CongratulationDto dto) {
        congratulationRepository.findById(Objects.requireNonNull(congratulationId))
                .ifPresent(c -> c.update(dto.getCongratulationCode(), dto.getCongratulationName(), dto.getRequestDate(),
                        dto.getTrgterName(), dto.getBirthday(), dto.getOccurrenceDate(), dto.getRelate(),
                        dto.getRemark(), userId));
    }

    @Override
    @Transactional
    public void deleteCongratulation(@NonNull String congratulationId) {
        congratulationRepository.deleteById(Objects.requireNonNull(congratulationId));
    }

    @Override
    @Transactional
    public void approveCongratulation(@NonNull String congratulationId, String sanctnerId, String confmAt,
            String returnResn) {
        congratulationRepository.findById(Objects.requireNonNull(congratulationId))
                .ifPresent(c -> c.approve(confmAt, returnResn, sanctnerId));
    }

    @Override
    public Page<CongratulationDto> getCongratulationList(String searchKeyword, @NonNull Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return congratulationRepository.findAll(Objects.requireNonNull(pageable))
                    .map(CongratulationDto::from);
        }
        return congratulationRepository.findByCongratulationNameContaining(searchKeyword, pageable)
                .map(CongratulationDto::from);
    }
}
