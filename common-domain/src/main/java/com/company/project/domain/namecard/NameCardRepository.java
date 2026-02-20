package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 嶺뚮ㅏ援잓뇡?Repository
 */
public interface NameCardRepository extends JpaRepository<NameCard, String>, NameCardRepositoryCustom {

    Page<NameCard> findByNcrdNmContaining(String ncrdNm, Pageable pageable);

    Page<NameCard> findByCmpnyNmContaining(String cmpnyNm, Pageable pageable);

    Page<NameCard> findByNcrdTrgterId(String ncrdTrgterId, Pageable pageable);
}
