package com.company.project.service.roughmap;

import com.company.project.service.roughmap.dto.RoughMapDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRoughMapService {
    RoughMapDto getRoughMap(String roughMapId);

    void registerRoughMap(RoughMapDto dto);

    void updateRoughMap(RoughMapDto dto);

    void deleteRoughMap(String roughMapId);

    Page<RoughMapDto> getRoughMapList(String searchKeyword, Pageable pageable);
}
