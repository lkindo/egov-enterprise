package com.company.project.service.namecard;

import com.company.project.service.namecard.dto.NameCardDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 명함 서비스 인터페이스
 */
public interface EgovNameCardService {

    Page<NameCardDto> getNameCardList(String keyword, Pageable pageable);

    Page<NameCardDto> getMyNameCards(String userId, Pageable pageable);

    NameCardDto getNameCard(String ncrdId);

    String createNameCard(String userId, NameCardDto dto);

    void updateNameCard(String ncrdId, String userId, NameCardDto dto);

    void deleteNameCard(String ncrdId);
}
