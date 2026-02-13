package com.company.project.service.system;

import com.company.project.domain.system.Ntwrk;
import com.company.project.domain.system.NtwrkRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.dto.NtwrkDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NtwrkService extends EgovAbstractServiceImpl {

    private final NtwrkRepository ntwrkRepository;
    private final EgovCommonCodeService commonCodeService;

    @Transactional(readOnly = true)
    public Page<NtwrkDto> getNtwrkList(String manageIem, String userNm, Pageable pageable) {
        Page<Ntwrk> page = ntwrkRepository.searchNtwrks(manageIem, userNm, pageable);

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM067");
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            NtwrkDto dto = NtwrkDto.from(entity);
            dto.setManageIemNm(codeMap.getOrDefault(dto.getManageIem(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public NtwrkDto getNtwrk(String ntwrkId) {
        Ntwrk entity = ntwrkRepository.findById(ntwrkId)
                .orElseThrow(() -> new RuntimeException("Ntwrk not found: " + ntwrkId));
        NtwrkDto dto = NtwrkDto.from(entity);
        
        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM067");
        dto.setManageIemNm(codes.stream()
                .filter(c -> c.code().equals(dto.getManageIem()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));
                
        return dto;
    }

    @Transactional
    public void createNtwrk(NtwrkDto dto) {
        Ntwrk entity = Ntwrk.builder()
                .ntwrkId(dto.getNtwrkId())
                .ntwrkIp(dto.getNtwrkIp())
                .gtwy(dto.getGtwy())
                .subnet(dto.getSubnet())
                .domnServer(dto.getDomnServer())
                .manageIem(dto.getManageIem())
                .userNm(dto.getUserNm())
                .useAt("Y")
                .regstYmd(LocalDate.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        ntwrkRepository.save(entity);
    }

    @Transactional
    public void updateNtwrk(NtwrkDto dto) {
        Ntwrk entity = ntwrkRepository.findById(dto.getNtwrkId())
                .orElseThrow(() -> new RuntimeException("Ntwrk not found"));
        
        entity.setNtwrkIp(dto.getNtwrkIp());
        entity.setGtwy(dto.getGtwy());
        entity.setSubnet(dto.getSubnet());
        entity.setDomnServer(dto.getDomnServer());
        entity.setManageIem(dto.getManageIem());
        entity.setUserNm(dto.getUserNm());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteNtwrk(String ntwrkId) {
        Ntwrk entity = ntwrkRepository.findById(ntwrkId)
                .orElseThrow(() -> new RuntimeException("Ntwrk not found"));
        entity.setUseAt("N");
    }
}
