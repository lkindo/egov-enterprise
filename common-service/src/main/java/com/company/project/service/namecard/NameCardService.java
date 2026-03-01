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
 * ÔßèÎÇáÎ∏???ïÌâ¨???¥—ãÏÅΩÔß?
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
        // ??? ÔßûÍ≥∏???ÍπÖÏ§â??ÔßèÎÇáÎ∏?Ôßè‚ë∏Ï§?        return nameCardRepository.findByNcrdTrgterId(userId, pageable).map(NameCardDto::from);
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

        nameCardRepository.save(Objects.requireNonNull(nameCard));

        // ?ÍπÖÏ§â ????ÔßèÎÇáÎ∏øÔß£?πÎøâ???Î®?£û ?∞Î∂Ω?
        addMyNameCard(userId, ncrdId);

        return ncrdId;
    }

    @Override
    @Transactional
    public void updateNameCard(String ncrdId, String userId, NameCardDto dto) {
        NameCard nameCard = nameCardRepository.findById(Objects.requireNonNull(ncrdId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        nameCard.update(dto.getNcrdNm(), dto.getCmpnyNm(), dto.getDeptNm(), dto.getClsfNm(),
                dto.getOfcpsNm(), dto.getEmailAdres(), dto.getTelNo(), dto.getMbtlNum(),
                dto.getAdres(), dto.getDetailAdres(), dto.getZipCode(), dto.getRemark(),
                dto.getOthbcAt(), dto.getExtrlUserAt());
    }

    @Override
    @Transactional
    public void deleteNameCard(String ncrdId) {
        NameCard nameCard = nameCardRepository.findById(Objects.requireNonNull(ncrdId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // ?ø¬Ä???Í≥óÏî†???íÏá±? ????(?Î®?íó ??∞‚îÅ ????Ôß£ÏÑé??
        // ??Î¶??ïÎíó ??•Îãö ?æÏá∞?????£Êø°??¥—ãÏÅΩ
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
                        () -> nameCardUserRepository.save(Objects.requireNonNull(NameCardUser.builder()
                                .ncrdId(ncrdId)
                                .emplyrId(userId)
                                .useAt("Y")
                                .registSeCode("REGC01") // Êπ≤Í≥ï???ÍπÖÏ§â ?ÑÎ∂æÎ±?                                .build())));
    }

    @Override
    @Transactional
    public void removeMyNameCard(String userId, String ncrdId) {
        nameCardUserRepository.findByNcrdIdAndEmplyrId(ncrdId, userId)
                .ifPresent(nu -> nu.updateUseAt("N"));
    }
}
