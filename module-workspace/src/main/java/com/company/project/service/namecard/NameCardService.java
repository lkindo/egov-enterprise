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
import java.util.Objects;

/**
 * 명함 관리 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NameCardService implements EgovNameCardService {

    private final NameCardRepository nameCardRepository;
    private final NameCardUserRepository nameCardUserRepository;

    @Override
    public Page<NameCardDto> getNameCardList(String keyword, @org.springframework.lang.NonNull Pageable pageable) {
        return nameCardRepository.searchNameCards(keyword, pageable).map(NameCardDto::from);
    }

    @Override
    public Page<NameCardDto> getMyNameCards(String userId, @org.springframework.lang.NonNull Pageable pageable) {
        // 특정 사용자가 등록한 명함 목록
        return nameCardRepository.findByTargetUserId(userId, pageable).map(NameCardDto::from);
    }

    @Override
    public NameCardDto getNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(Objects.requireNonNull(ncrdId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return NameCardDto.from(nameCard);
    }

    @Override
    @Transactional
    public String createNameCard(String userId, NameCardDto dto) {
        String ncrdId = "NCRD_" + String.format("%013d", System.currentTimeMillis());

        NameCard nameCard = NameCard.builder()
                .ncrdId(ncrdId)
                .name(dto.getName())
                .companyName(dto.getCompanyName())
                .departmentName(dto.getDepartmentName())
                .rankName(dto.getRankName())
                .positionName(dto.getPositionName())
                .emailAddress(dto.getEmailAddress())
                .telNumber(dto.getTelNumber())
                .mobileNumber(dto.getMobileNumber())
                .address(dto.getAddress())
                .detailAddress(dto.getDetailAddress())
                .zipCode(dto.getZipCode())
                .remark(dto.getRemark())
                .isPublic(dto.getIsPublic())
                .targetUserId(userId)
                .isExternalUser(dto.getIsExternalUser())
                .build();

        nameCardRepository.save(Objects.requireNonNull(nameCard));

        // 등록자 본인의 명함첩에도 자동 추가
        addMyNameCard(userId, ncrdId);

        return ncrdId;
    }

    @Override
    @Transactional
    public void updateNameCard(String ncrdId, String userId, NameCardDto dto) {
        NameCard nameCard = nameCardRepository.findById(Objects.requireNonNull(ncrdId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        nameCard.update(dto.getName(), dto.getCompanyName(), dto.getDepartmentName(), dto.getRankName(),
                dto.getPositionName(), dto.getEmailAddress(), dto.getTelNumber(), dto.getMobileNumber(),
                dto.getAddress(), dto.getDetailAddress(), dto.getZipCode(), dto.getRemark(),
                dto.getIsPublic(), dto.getIsExternalUser());
    }

    @Override
    @Transactional
    public void deleteNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(Objects.requireNonNull(ncrdId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        nameCardRepository.delete(Objects.requireNonNull(nameCard));
    }

    @Override
    public Page<NameCardUserDto> getMyNameCardFolder(String userId,
            @org.springframework.lang.NonNull Pageable pageable) {
        return nameCardUserRepository.findMyNameCardUsers(userId, pageable)
                .map(nu -> {
                    NameCard nc = nameCardRepository.findById(Objects.requireNonNull(nu.getNcrdId())).orElse(null);
                    return NameCardUserDto.from(nu, nc);
                });
    }

    @Override
    @Transactional
    public void addMyNameCard(String userId, String ncrdId) {
        nameCardUserRepository.findByNcrdIdAndEmplyrId(ncrdId, userId)
                .ifPresentOrElse(
                        nu -> nu.updateUseAt("Y"),
                        () -> {
                            nameCardUserRepository.save(Objects.requireNonNull(NameCardUser.builder()
                                    .ncrdId(ncrdId)
                                    .emplyrId(userId)
                                    .useAt("Y")
                                    .registSeCode("REGC01") // 등록구분: 사용자등록
                                    .build()));
                        });
    }

    @Override
    @Transactional
    public void removeMyNameCard(String userId, String ncrdId) {
        nameCardUserRepository.findByNcrdIdAndEmplyrId(ncrdId, userId)
                .ifPresent(nu -> nu.updateUseAt("N"));
    }
}
