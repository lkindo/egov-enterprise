package com.company.project.service.digitalassetmanagement;

import com.company.project.service.digitalassetmanagement.dto.MapTeamDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식맵(조직분류) 서비스 인터페이스
 */
public interface KnowledgeMapTeamService {
    /**
     * 지식맵(조직분류) 목록 조회
     */
    Page<MapTeamDto> selectKnowledgeMapTeamList(String searchCondition, String searchKeyword, Pageable pageable);

    /**
     * 지식맵(조직분류) 상세 조회
     */
    MapTeamDto selectKnowledgeMapTeamDetail(String organizationId);

    /**
     * 지식맵(조직분류) 등록
     */
    void insertKnowledgeMapTeam(MapTeamDto mapTeamDto);

    /**
     * 지식맵(조직분류) 수정
     */
    void updateKnowledgeMapTeam(MapTeamDto mapTeamDto);

    /**
     * 지식맵(조직분류) 삭제
     */
    void deleteKnowledgeMapTeam(String organizationId);
}