package com.company.project.service.user;

import com.company.project.service.user.dto.CommuteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCommuteService {
    void registerStartWork(CommuteDto dto);

    void registerEndWork(CommuteDto dto);

    Page<CommuteDto> getCommuteList(String userId, Pageable pageable);
}
