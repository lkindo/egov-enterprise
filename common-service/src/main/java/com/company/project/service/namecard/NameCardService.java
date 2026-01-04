package com.company.project.service.namecard;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.namecard.NameCard;
import com.company.project.domain.namecard.NameCardRepository;
import com.company.project.service.namecard.dto.NameCardDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 명함 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NameCardService implements EgovNameCardService {

    private final NameCardRepository nameCardRepository;

    @Override
    public Page<NameCardDto> getNameCardList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return nameCardRepository.findAll(pageable).map(NameCardDto::from);
        }
        return nameCardRepository.searchByKeyword(keyword, pageable).map(NameCardDto::from);
    }

    @Override
    public Page<NameCardDto> getMyNameCards(String userId, Pageable pageable) {
        return nameCardRepository.findByNcrdTrgterId(userId, pageable).map(NameCardDto::from);
    }

    @Override
    public NameCardDto getNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(ncrdId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return NameCardDto.from(nameCard);
    }

    @Override
    @Transactional
    public String createNameCard(String userId, NameCardDto dto) {
        String ncrdId = "NCRD_" + String.format("%013d", System.currentTimeMillis());

        NameCard nameCard = NameCard.builder()
                .ncrdId(ncrdId)
                .ncrdNm(dto.getNcrdNm())
                .cmpnyNm(dto.getCmpnyNm())
                .deptNm(dto.getDeptNm())
                .clsfNm(dto.getClsfNm())
                .ofcpsNm(dto.getOfcpsNm())
                .emailAdres(dto.getEmailAdres())
                .telNo(dto.getTelNo())
                .mbtlNum(dto.getMbtlNum())
                .adres(dto.getAdres())
                .detailAdres(dto.getDetailAdres())
                .zipCode(dto.getZipCode())
                .remark(dto.getRemark())
                .othbcAt(dto.getOthbcAt())
                .ncrdTrgterId(userId)
                .frstRegisterId(userId)
                .build();

        nameCardRepository.save(nameCard);
        return ncrdId;
    }

    @Override
    @Transactional
    public void updateNameCard(String ncrdId, String userId, NameCardDto dto) {
        NameCard nameCard = nameCardRepository.findById(ncrdId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        nameCard.update(dto.getNcrdNm(), dto.getCmpnyNm(), dto.getDeptNm(), dto.getClsfNm(),
                dto.getOfcpsNm(), dto.getEmailAdres(), dto.getTelNo(), dto.getMbtlNum(),
                dto.getAdres(), dto.getDetailAdres(), dto.getZipCode(), dto.getRemark(),
                dto.getOthbcAt(), userId);
    }

    @Override
    @Transactional
    public void deleteNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(ncrdId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        nameCardRepository.delete(nameCard);
    }
}
