package com.company.project.service.namecard;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.namecard.NameCard;
import com.company.project.domain.namecard.NameCardRepository;
import com.company.project.domain.namecard.NameCardUser;
import com.company.project.domain.namecard.NameCardUserRepository;
import com.company.project.service.namecard.dto.NameCardDto;
import com.company.project.service.namecard.dto.NameCardUserDto;
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
    private final NameCardUserRepository nameCardUserRepository;

    @Override
    public Page<NameCardDto> getNameCardList(String keyword, Pageable pageable) {
        return nameCardRepository.searchNameCards(keyword, pageable).map(NameCardDto::from);
    }

    @Override
    public Page<NameCardDto> getMyNameCards(String userId, Pageable pageable) {
        // 내가 직접 등록한 명함 목록
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
                .extrlUserAt(dto.getExtrlUserAt())
                .build();

        nameCardRepository.save(nameCard);
        
        // 등록 시 내 명함첩에도 자동 추가
        addMyNameCard(userId, ncrdId);
        
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
                dto.getOthbcAt(), dto.getExtrlUserAt());
    }

    @Override
    @Transactional
    public void deleteNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(ncrdId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        // 관계 데이터 먼저 삭제 (또는 논리 삭제 처리)
        // 여기서는 단순 물리 삭제로 구현
        nameCardRepository.delete(nameCard);
    }

    @Override
    public Page<NameCardUserDto> getMyNameCardFolder(String userId, Pageable pageable) {
        return nameCardUserRepository.findMyNameCardUsers(userId, pageable)
                .map(nu -> {
                    NameCard nc = nameCardRepository.findById(nu.getNcrdId()).orElse(null);
                    return NameCardUserDto.from(nu, nc);
                });
    }

    @Override
    @Transactional
    public void addMyNameCard(String userId, String ncrdId) {
        nameCardUserRepository.findByNcrdIdAndEmplyrId(ncrdId, userId)
                .ifPresentOrElse(
                    nu -> nu.updateUseAt("Y"),
                    () -> nameCardUserRepository.save(NameCardUser.builder()
                            .ncrdId(ncrdId)
                            .emplyrId(userId)
                            .useAt("Y")
                            .registSeCode("REGC01") // 기본 등록 코드
                            .build())
                );
    }

    @Override
    @Transactional
    public void removeMyNameCard(String userId, String ncrdId) {
        nameCardUserRepository.findByNcrdIdAndEmplyrId(ncrdId, userId)
                .ifPresent(nu -> nu.updateUseAt("N"));
    }
}
