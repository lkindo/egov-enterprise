package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.MapKnoSearchResult;
import com.company.project.service.digitalassetmanagement.dto.MapKnoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 지식맵 서비스 인터페이스
 */
public interface KnowledgeMapService {
    /**
     * 지식맵 목록 조회
     */
    Page<MapKnoSearchResult> selectKnowledgeMapList(String searchCondition, String searchKeyword, Pageable pageable);

    /**
     * 지식맵 상세 조회
     */
    MapKnoDto selectKnowledgeMapDetail(String typeCode);

    /**
     * 지식맵 등록
     */
    void insertKnowledgeMap(MapKnoDto mapKnoDto);

    /**
     * 지식맵 수정
     */
    void updateKnowledgeMap(MapKnoDto mapKnoDto);

    /**
     * 지식맵 삭제
     */
    void deleteKnowledgeMap(String typeCode);
}
