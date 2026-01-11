package com.company.project.service.roughmap;

import com.company.project.domain.roughmap.RoughMap;
import com.company.project.domain.roughmap.RoughMapDomainRepository;
import com.company.project.service.roughmap.dto.RoughMapDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoughMapService implements EgovRoughMapService {

    private final RoughMapDomainRepository roughMapRepository;

    @Override
    public RoughMapDto getRoughMap(String roughMapId) {
        return roughMapRepository.findById(roughMapId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerRoughMap(RoughMapDto dto) {
        RoughMap roughMap = RoughMap.builder()
                .roughMapId(dto.getRoughMapId())
                .roughMapSj(dto.getRoughMapSj())
                .roughMapAddress(dto.getRoughMapAddress())
                .la(dto.getLa())
                .lo(dto.getLo())
                .markerLa(dto.getMarkerLa())
                .markerLo(dto.getMarkerLo())
                .infoWindow(dto.getInfoWindow())
                .zoomLevel(dto.getZoomLevel())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        roughMapRepository.save(roughMap);
    }

    @Override
    @Transactional
    public void updateRoughMap(RoughMapDto dto) {
        roughMapRepository.findById(dto.getRoughMapId())
                .ifPresent(rm -> rm.update(dto.getRoughMapSj(), dto.getRoughMapAddress(), dto.getLa(), dto.getLo(),
                        dto.getMarkerLa(), dto.getMarkerLo(), dto.getInfoWindow(), dto.getZoomLevel(), "SYSTEM"));
    }

    @Override
    @Transactional
    public void deleteRoughMap(String roughMapId) {
        roughMapRepository.deleteById(roughMapId);
    }

    @Override
    public Page<RoughMapDto> getRoughMapList(String searchKeyword, Pageable pageable) {
        return roughMapRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private RoughMapDto convertToDto(RoughMap rm) {
        return RoughMapDto.builder()
                .roughMapId(rm.getRoughMapId())
                .roughMapSj(rm.getRoughMapSj())
                .roughMapAddress(rm.getRoughMapAddress())
                .la(rm.getLa())
                .lo(rm.getLo())
                .markerLa(rm.getMarkerLa())
                .markerLo(rm.getMarkerLo())
                .infoWindow(rm.getInfoWindow())
                .zoomLevel(rm.getZoomLevel())
                .build();
    }
}
