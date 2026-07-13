package nuri.business.service.scrap;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.security.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapService extends BaseAbstractService implements EgovScrapService {

    private final ScrapRepository scrapRepository;
    private final EgovIdGnrService egovScrapIdGnrService;

    @Override
    public Page<ScrapDto> getScrapList(String userId, @NonNull Pageable pageable) {
        return scrapRepository
                .findByFrstRgtrIdAndUseYn(Objects.requireNonNull(userId), "Y", Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public ScrapDto getScrap(@NonNull String scrapId) {
        Scrap entity = scrapRepository.findById(scrapId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 조회
        return convertToDto(entity);
    }

    @Override
    @Transactional
    public void createScrap(String userId, ScrapDto dto) throws Exception {
        String scrapId = egovScrapIdGnrService.getNextStringId();
        Scrap entity = Scrap.builder()
                .scrapId(scrapId)
                .scrapNm(dto.getScrapNm())
                .build();
        scrapRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateScrap(String userId, ScrapDto dto) {
        Scrap entity = scrapRepository.findById(Objects.requireNonNull(dto.getScrapId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정
        entity.update(dto.getScrapNm(), entity.getScrapUrl(), entity.getScrapExpln(), entity.getUseYn());
        entity.setLastMdfrId(userId);
    }

    @Override
    @Transactional
    public void deleteScrap(@NonNull String scrapId) {
        Scrap entity = scrapRepository.findById(scrapId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 삭제
        scrapRepository.delete(entity);
    }

    private ScrapDto convertToDto(Scrap entity) {
        return ScrapDto.builder()
                .scrapId(entity.getScrapId())
                .scrapNm(entity.getScrapNm())
                .userId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
