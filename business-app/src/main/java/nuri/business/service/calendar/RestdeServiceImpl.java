package nuri.business.service.calendar;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.calendar.Restde;
import nuri.business.domain.calendar.RestdeRepository;
import nuri.business.service.calendar.dto.RestdeDto;
import nuri.business.service.calendar.dto.RestdeMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 휴일 관리 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestdeServiceImpl implements RestdeService {

    private final RestdeRepository restdeRepository;
    private final RestdeMapper restdeMapper;

    @Override
    public Page<RestdeDto> getRestdeList(String searchCondition, String searchKeyword, Pageable pageable) {
        return restdeRepository.searchRestde(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(restdeMapper::toDto);
    }

    @Override
    public RestdeDto getRestde(Integer hldySn) {
        return restdeRepository.findById(Objects.requireNonNull(hldySn))
                .map(restdeMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public Integer createRestde(RestdeDto dto) {
        Objects.requireNonNull(dto);
        Restde entity = Restde.builder()
                .hldyYmd(dto.getHldyYmd())
                .hldyNm(dto.getHldyNm())
                .hldyExpln(dto.getHldyExpln())
                .hldySeCd(dto.getHldySeCd())
                .build();
        restdeRepository.save(entity);
        return entity.getHldySn();
    }

    @Override
    @Transactional
    public void updateRestde(Integer hldySn, RestdeDto dto) {
        Objects.requireNonNull(hldySn);
        Objects.requireNonNull(dto);
        Restde entity = restdeRepository.findById(hldySn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(
                dto.getHldyYmd(),
                dto.getHldyNm(),
                dto.getHldyExpln(),
                dto.getHldySeCd()
        );
    }

    @Override
    @Transactional
    public void deleteRestde(Integer hldySn) {
        Objects.requireNonNull(hldySn);
        Restde entity = restdeRepository.findById(hldySn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        restdeRepository.delete(entity);
    }
}
