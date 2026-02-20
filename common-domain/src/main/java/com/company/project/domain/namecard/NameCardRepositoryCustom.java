package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 筌뤿굟釉?Repository Custom ?紐낃숲??륁뵠??
 */
public interface NameCardRepositoryCustom {
    Page<NameCard> searchNameCards(String keyword, Pageable pageable);
}
