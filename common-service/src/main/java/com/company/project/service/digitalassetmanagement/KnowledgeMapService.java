package com.company.project.service.digitalassetmanagement;

import com.company.project.domain.digitalassetmanagement.MapKnoSearchResult;
import com.company.project.service.digitalassetmanagement.dto.MapKnoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface KnowledgeMapService {
    Page<MapKnoSearchResult> selectKnowledgeMapList(String searchCondition, String searchKeyword, Pageable pageable);

    MapKnoDto selectKnowledgeMapDetail(String knoTypeCd);

    void insertKnowledgeMap(MapKnoDto mapKnoDto);

    void updateKnowledgeMap(MapKnoDto mapKnoDto);

    void deleteKnowledgeMap(String knoTypeCd);
}
