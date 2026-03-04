package com.company.project.service.roughmap;

import com.company.project.service.roughmap.dto.RoughMapDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRoughMapService {
    Page<RoughMapDto> getRoughMapList(String keyword, Pageable pageable);
    RoughMapDto getRoughMap(String roughMapId);
    void insertRoughMap(RoughMapDto dto);
    void updateRoughMap(RoughMapDto dto);
    void deleteRoughMap(String roughMapId);
}