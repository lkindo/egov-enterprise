package com.company.project.service.dam;

import com.company.project.domain.dam.MapKnoSearchResult;
import com.company.project.service.dam.dto.MapKnoDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMapKnoService {
    Page<MapKnoSearchResult> selectMapKnoList(String searchCondition, String searchKeyword, Pageable pageable);

    MapKnoDto selectMapKnoDetail(String knoTypeCd);

    void insertMapKno(MapKnoDto mapKnoDto);

    void updateMapKno(MapKnoDto mapKnoDto);

    void deleteMapKno(String knoTypeCd);
}
