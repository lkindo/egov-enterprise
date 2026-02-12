package com.company.project.service.dam;

import com.company.project.service.dam.dto.MapTeamDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMapTeamService {
    Page<MapTeamDto> selectMapTeamList(String searchCondition, String searchKeyword, Pageable pageable);

    MapTeamDto selectMapTeamDetail(String orgnztId);

    void insertMapTeam(MapTeamDto mapTeamDto);

    void updateMapTeam(MapTeamDto mapTeamDto);

    void deleteMapTeam(String orgnztId);
}
