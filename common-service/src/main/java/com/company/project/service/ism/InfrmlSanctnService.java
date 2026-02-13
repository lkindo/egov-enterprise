package com.company.project.service.ism;

import com.company.project.domain.notification.InfrmlSanctn;
import com.company.project.domain.notification.InfrmlSanctnRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.ism.dto.InfrmlSanctnDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InfrmlSanctnService extends EgovAbstractServiceImpl {

    private final InfrmlSanctnRepository infrmlSanctnRepository;
    private final EgovCommonCodeService commonCodeService;

    @Transactional(readOnly = true)
    public InfrmlSanctnDto getInfrmlSanctn(String infrmlSanctnId) {
        InfrmlSanctn entity = infrmlSanctnRepository.findById(infrmlSanctnId)
                .orElseThrow(() -> new RuntimeException("InfrmlSanctn not found: " + infrmlSanctnId));
        
        InfrmlSanctnDto dto = InfrmlSanctnDto.from(entity);
        
        List<CommonCodeDto> jobCodes = commonCodeService.getCodesByGroup("COM075");
        dto.setJobSeNm(jobCodes.stream()
                .filter(c -> c.code().equals(dto.getJobSeCode()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        List<CommonCodeDto> sttusCodes = commonCodeService.getCodesByGroup("COM072");
        dto.setConfmAtNm(sttusCodes.stream()
                .filter(c -> c.code().equals(dto.getConfmAt()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));
                
        return dto;
    }

    @Transactional
    public void createInfrmlSanctn(InfrmlSanctnDto dto) {
        InfrmlSanctn entity = InfrmlSanctn.builder()
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .jobSeCode(dto.getJobSeCode())
                .applcntId(dto.getApplcntId())
                .reqstDe(dto.getReqstDe())
                .sanctnerId(dto.getSanctnerId())
                .confmAt("A") // Initial status: Applied
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        infrmlSanctnRepository.save(entity);
    }

    @Transactional
    public void updateInfrmlSanctn(InfrmlSanctnDto dto) {
        InfrmlSanctn entity = infrmlSanctnRepository.findById(dto.getInfrmlSanctnId())
                .orElseThrow(() -> new RuntimeException("InfrmlSanctn not found"));
        
        entity.update(dto.getSanctnerId(), dto.getLastUpdusrId());
    }

    @Transactional
    public void confirmInfrmlSanctn(String infrmlSanctnId, String confmAt, String returnResn, String userId) {
        InfrmlSanctn entity = infrmlSanctnRepository.findById(infrmlSanctnId)
                .orElseThrow(() -> new RuntimeException("InfrmlSanctn not found"));
        
        entity.confirm(confmAt, returnResn, userId);
    }

    @Transactional
    public void deleteInfrmlSanctn(String infrmlSanctnId) {
        infrmlSanctnRepository.deleteById(infrmlSanctnId);
    }
}
