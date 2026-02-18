package com.company.project.service.namecard;

import com.company.project.service.namecard.dto.NameCardDto;
import com.company.project.service.namecard.dto.NameCardUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 명함 서비스 인터페이스
 */
public interface EgovNameCardService {

    Page<NameCardDto> getNameCardList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    Page<NameCardDto> getMyNameCards(String userId, @org.springframework.lang.NonNull Pageable pageable);

    NameCardDto getNameCard(String ncrdId);

    String createNameCard(String userId, NameCardDto dto);

    void updateNameCard(String ncrdId, String userId, NameCardDto dto);

    void deleteNameCard(String ncrdId);

    // 내 명함첩 관리
    Page<NameCardUserDto> getMyNameCardFolder(String userId, @org.springframework.lang.NonNull Pageable pageable);

    void addMyNameCard(String userId, String ncrdId);

    void removeMyNameCard(String userId, String ncrdId);
}
