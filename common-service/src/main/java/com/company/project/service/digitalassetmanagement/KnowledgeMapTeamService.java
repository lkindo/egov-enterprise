package com.company.project.service.digitalassetmanagement;

import com.company.project.service.digitalassetmanagement.dto.MapTeamDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeMapTeamService {
    Page<MapTeamDto> selectKnowledgeMapTeamList(String searchCondition, String searchKeyword, Pageable pageable);

    MapTeamDto selectKnowledgeMapTeamDetail(String orgnztId);

    void insertKnowledgeMapTeam(MapTeamDto mapTeamDto);

    void updateKnowledgeMapTeam(MapTeamDto mapTeamDto);

    void deleteKnowledgeMapTeam(String orgnztId);
}
