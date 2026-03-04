package com.company.project.service.congratulation;

import com.company.project.service.congratulation.dto.CongratulationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

public interface CongratulationService {
    CongratulationDto getCongratulation(@NonNull String congratulationId);

    String createCongratulation(String userId, CongratulationDto dto);

    void updateCongratulation(String congratulationId, String userId, CongratulationDto dto);

    void deleteCongratulation(@NonNull String congratulationId);

    void approveCongratulation(@NonNull String congratulationId, String sanctnerId, String confmAt, String returnResn);

    Page<CongratulationDto> getCongratulationList(String searchKeyword, Pageable pageable);
}