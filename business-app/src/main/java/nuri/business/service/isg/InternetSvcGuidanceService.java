package nuri.business.service.isg;

import nuri.business.domain.isg.InternetSvcGuidance;
import nuri.business.domain.isg.InternetSvcGuidanceRepository;
import nuri.business.service.isg.dto.InternetSvcGuidanceDto;
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

    public InternetSvcGuidanceDto getIntnetSvcGuidance(String intnetSvcId) {
        return internetSvcGuidanceRepository.findById(Objects.requireNonNull(intnetSvcId))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Transactional
    public void registerIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        InternetSvcGuidance isg = InternetSvcGuidance.builder()
                .itntSvcId(dto.getIntnetSvcId())
                .itntSvcNm(dto.getIntnetSvcNm())
                .itntSvcExpln(dto.getIntnetSvcDc())
                .rfltYn(dto.getReflctAt())
                .build();
        internetSvcGuidanceRepository.save(Objects.requireNonNull(isg));
    }

    @Transactional
    public void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto) {
        internetSvcGuidanceRepository.findById(Objects.requireNonNull(dto.getIntnetSvcId()))
                .ifPresent(isg -> isg.update(dto.getIntnetSvcNm(), dto.getIntnetSvcDc(), dto.getReflctAt()));
    }

    @Transactional
    public void deleteIntnetSvcGuidance(String intnetSvcId) {
        internetSvcGuidanceRepository.deleteById(Objects.requireNonNull(intnetSvcId));
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
                .intnetSvcId(isg.getItntSvcId())
                .intnetSvcNm(isg.getItntSvcNm())
                .intnetSvcDc(isg.getItntSvcExpln())
                .reflctAt(isg.getRfltYn())
                .userId(isg.getLastMdfrId())
                .regDate(isg.getMdfcnDt())
                .build();
    }
}
