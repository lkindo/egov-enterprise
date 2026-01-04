package com.company.project.service.sanctn;

import com.company.project.domain.sanctn.InformalSanctn;
import com.company.project.domain.sanctn.InformalSanctnRepository;
import com.company.project.service.sanctn.dto.InformalSanctnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctnService implements EgovInformalSanctnService {

    private final InformalSanctnRepository informalSanctnRepository;

    @Override
    public InformalSanctnDto getInfrmlSanctn(String infrmlSanctnId) {
        return informalSanctnRepository.findById(infrmlSanctnId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerInfrmlSanctn(InformalSanctnDto dto) {
        InformalSanctn sanctn = InformalSanctn.builder()
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .jobSeCode(dto.getJobSeCode())
                .applcntId(dto.getApplcntId())
                .reqstDe(dto.getReqstDe())
                .sanctnerId(dto.getSanctnerId())
                .confmAt("N")
                .frstRegisterId(dto.getApplcntId())
                .lastUpdusrId(dto.getApplcntId())
                .build();
        informalSanctnRepository.save(sanctn);
    }

    @Override
    @Transactional
    public void updateInfrmlSanctn(InformalSanctnDto dto) {
        informalSanctnRepository.findById(dto.getInfrmlSanctnId())
                .ifPresent(s -> {
                    // 필드 업데이트 로직
                });
    }

    @Override
    @Transactional
    public void deleteInfrmlSanctn(String infrmlSanctnId) {
        informalSanctnRepository.deleteById(infrmlSanctnId);
    }

    @Override
    @Transactional
    public void confirmInfrmlSanctn(InformalSanctnDto dto) {
        informalSanctnRepository.findById(dto.getInfrmlSanctnId())
                .ifPresent(s -> {
                    // 승인 여부 및 반려 사유 업데이트
                });
    }

    private InformalSanctnDto convertToDto(InformalSanctn s) {
        return InformalSanctnDto.builder()
                .infrmlSanctnId(s.getInfrmlSanctnId())
                .jobSeCode(s.getJobSeCode())
                .applcntId(s.getApplcntId())
                .reqstDe(s.getReqstDe())
                .sanctnerId(s.getSanctnerId())
                .confmAt(s.getConfmAt())
                .sanctnDt(s.getSanctnDt())
                .returnResn(s.getReturnResn())
                .build();
    }
}
