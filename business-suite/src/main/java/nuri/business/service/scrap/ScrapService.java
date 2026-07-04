package nuri.business.service.scrap;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
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
        return scrapRepository.findById(scrapId)
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void createScrap(String userId, ScrapDto dto) throws Exception {
        String scrapId = egovScrapIdGnrService.getNextStringId();
        Scrap entity = Scrap.builder()
                .scrapId(scrapId)
                .scrapNm(dto.getScrapNm())
                .frstRgtrId(userId)
                .build();
        scrapRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateScrap(String userId, ScrapDto dto) {
        Scrap entity = scrapRepository.findById(Objects.requireNonNull(dto.getScrapId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getScrapNm(), entity.getScrapUrl(), entity.getScrapExpln(), entity.getUseYn());
        entity.setLastMdfrId(userId);
    }

    @Override
    @Transactional
    public void deleteScrap(@NonNull String scrapId) {
        // 소프트삭제(use_yn='N'). Scrap 은 @Filter softDeleteFilter 대상이라 물리삭제는 설계와 어긋난다.
        // 존재하지 않는 id 는 과거 deleteById() 와 동일하게 예외로 알린다(조용한 no-op 방지).
        scrapRepository.findById(scrapId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND))
                .delete();
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
