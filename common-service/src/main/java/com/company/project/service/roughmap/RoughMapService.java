package com.company.project.service.roughmap;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.roughmap.RoughMap;
import com.company.project.domain.roughmap.RoughMapRepository;
import com.company.project.service.roughmap.dto.RoughMapDto;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoughMapService implements EgovRoughMapService {

    private final RoughMapRepository roughMapRepository;

    public RoughMapService(
            @org.springframework.beans.factory.annotation.Qualifier("roughmapRoughMapRepository") RoughMapRepository roughMapRepository) {
        this.roughMapRepository = roughMapRepository;
    }

    @Override
    public Page<RoughMapDto> getRoughMapList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return roughMapRepository.findAll(pageable).map(RoughMapDto::from);
        }
        return roughMapRepository.findByRoughMapSjContaining(keyword, pageable).map(RoughMapDto::from);
    }

    @Override
    public RoughMapDto getRoughMap(String roughMapId) {
        return roughMapRepository.findById(Objects.requireNonNull(roughMapId))
                .map(RoughMapDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRoughMap(RoughMapDto dto) {
        String id = "ROUGH_" + String.format("%013d", System.currentTimeMillis());
        RoughMap entity = RoughMap.builder()
                .roughMapId(id)
                .roughMapSj(dto.getRoughMapSj())
                .roughMapAddress(dto.getRoughMapAddress())
                .la(dto.getLa())
                .lo(dto.getLo())
                .markerLa(dto.getMarkerLa())
                .markerLo(dto.getMarkerLo())
                .infoWindow(dto.getInfoWindow())
                .zoomLevel(dto.getZoomLevel())
                .build();
        roughMapRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateRoughMap(RoughMapDto dto) {
        RoughMap entity = roughMapRepository.findById(Objects.requireNonNull(dto.getRoughMapId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getRoughMapSj(), dto.getRoughMapAddress(), dto.getLa(), dto.getLo(),
                dto.getMarkerLa(), dto.getMarkerLo(), dto.getInfoWindow(), dto.getZoomLevel());
    }

    @Override
    @Transactional
    public void deleteRoughMap(String roughMapId) {
        roughMapRepository.deleteById(Objects.requireNonNull(roughMapId));
    }
}