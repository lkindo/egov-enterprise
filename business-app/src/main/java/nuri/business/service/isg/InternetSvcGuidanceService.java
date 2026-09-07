package nuri.business.service.isg;

import nuri.business.domain.isg.InternetSvcGuidance;
import nuri.business.domain.isg.InternetSvcGuidanceRepository;
import nuri.business.service.isg.dto.InternetSvcGuidanceDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InternetSvcGuidanceService {

    private final InternetSvcGuidanceRepository internetSvcGuidanceRepository;

    public InternetSvcGuidanceDto getIntnetSvcGuidance(Long itntSrvcSn) {
        return internetSvcGuidanceRepository.findById(Objects.requireNonNull(itntSrvcSn))
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "인터넷서비스 안내를 찾을 수 없습니다: " + itntSrvcSn));
    }

    @Transactional
    public Long registerIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        InternetSvcGuidance isg = InternetSvcGuidance.builder()
                .itntSvcNm(dto.getItntSvcNm())
                .itntSvcExpln(dto.getItntSvcExpln())
                .rfltYn(dto.getRfltYn())
                .build();
        InternetSvcGuidance saved = internetSvcGuidanceRepository.save(Objects.requireNonNull(isg));
        return saved.getItntSrvcSn();
    }

    /**
     * [2026-09-02] 없는 id 는 404 다. 종전 {@code ifPresent} 는 존재하지 않는 항목의 수정 요청을
     * <b>조용히 무시하고 200</b> 을 돌려줬다 — 호출자는 저장됐다고 믿는다. 같은 pack 의
     * Banner·Popup 서비스가 쓰는 {@code orElseThrow(RESOURCE_NOT_FOUND)} 규약에 맞춘다.
     */
    @Transactional
    public void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        InternetSvcGuidance isg = internetSvcGuidanceRepository
                .findById(Objects.requireNonNull(dto.getItntSrvcSn()))
                .orElseThrow(() -> new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND));
        isg.update(dto.getItntSvcNm(), dto.getItntSvcExpln(), dto.getRfltYn());
    }

    /** 존재 확인 — 수정과 같은 이유(없는 id 가 조용히 200 으로 끝나지 않게). */
    @Transactional
    public void deleteIntnetSvcGuidance(Long itntSrvcSn) {
        InternetSvcGuidance isg = internetSvcGuidanceRepository
                .findById(Objects.requireNonNull(itntSrvcSn))
                .orElseThrow(() -> new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND));
        internetSvcGuidanceRepository.delete(isg);
    }

    public Page<InternetSvcGuidanceDto> getIntnetSvcGuidanceList(String searchKeyword, Pageable pageable) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return internetSvcGuidanceRepository.findByItntSvcNmContaining(searchKeyword, pageable)
                    .map(this::convertToDto);
        }
        return internetSvcGuidanceRepository.findAll(Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    private InternetSvcGuidanceDto convertToDto(InternetSvcGuidance isg) {
        return InternetSvcGuidanceDto.builder()
                .itntSrvcSn(isg.getItntSrvcSn())
                .itntSvcNm(isg.getItntSvcNm())
                .itntSvcExpln(isg.getItntSvcExpln())
                .rfltYn(isg.getRfltYn())
                .lastMdfrId(isg.getLastMdfrId())
                .mdfcnDt(isg.getMdfcnDt())
                .build();
    }
}
