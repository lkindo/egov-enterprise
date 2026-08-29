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
import java.util.List;
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
                .itntSvcNm(dto.getIntnetSvcNm())
                .itntSvcExpln(dto.getIntnetSvcDc())
                .rfltYn(dto.getReflctAt())
                .build();
        InternetSvcGuidance saved = internetSvcGuidanceRepository.save(Objects.requireNonNull(isg));
        return saved.getItntSrvcSn();
    }

    @Transactional
    public void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        internetSvcGuidanceRepository.findById(Objects.requireNonNull(dto.getItntSrvcSn()))
                .ifPresent(isg -> isg.update(dto.getIntnetSvcNm(), dto.getIntnetSvcDc(), dto.getReflctAt()));
    }

    @Transactional
    public void deleteIntnetSvcGuidance(Long itntSrvcSn) {
        internetSvcGuidanceRepository.deleteById(Objects.requireNonNull(itntSrvcSn));
    }

    public Page<InternetSvcGuidanceDto> getIntnetSvcGuidanceList(String searchKeyword, Pageable pageable) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return internetSvcGuidanceRepository.findByItntSvcNmContaining(searchKeyword, pageable)
                    .map(this::convertToDto);
        }
        return internetSvcGuidanceRepository.findAll(Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    public List<InternetSvcGuidanceDto> getIntnetSvcGuidanceResult() {
        return java.util.Collections.emptyList();
    }

    private InternetSvcGuidanceDto convertToDto(InternetSvcGuidance isg) {
        return InternetSvcGuidanceDto.builder()
                .itntSrvcSn(isg.getItntSrvcSn())
                .intnetSvcNm(isg.getItntSvcNm())
                .intnetSvcDc(isg.getItntSvcExpln())
                .reflctAt(isg.getRfltYn())
                .userId(isg.getLastMdfrId())
                .regDate(isg.getMdfcnDt())
                .build();
    }
}
