package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 명함 Repository Custom 인터페이스
 */
public interface NameCardRepositoryCustom {
    Page<NameCard> searchNameCards(String keyword, Pageable pageable);
}
