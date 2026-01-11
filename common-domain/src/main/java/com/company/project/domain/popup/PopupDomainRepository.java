package com.company.project.domain.popup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 팝업창 Repository
 */
public interface PopupDomainRepository extends JpaRepository<Popup, String> {

    Page<Popup> findByPopupTitleNmContaining(String popupTitleNm, Pageable pageable);

    @Query("SELECT p FROM Popup p WHERE p.ntceAt = 'Y' AND :now BETWEEN p.ntceBgnde AND p.ntceEndde")
    List<Popup> findActivePopups(@Param("now") String now);
}
