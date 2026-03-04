package com.company.project.service.system;

import com.company.project.domain.system.ServerEqpmn;
import com.company.project.domain.system.ServerEqpmnRepository;
import com.company.project.service.system.dto.ServerEqpmnDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ServerEqpmnService extends EgovAbstractServiceImpl {

    private final ServerEqpmnRepository serverEqpmnRepository;

    @Transactional(readOnly = true)
    public Page<ServerEqpmnDto> getServerEqpmnList(String serverEqpmnNm, Pageable pageable) {
        Page<ServerEqpmn> page = serverEqpmnRepository
                .findByServerEqpmnNmContaining(serverEqpmnNm == null ? "" : serverEqpmnNm, pageable);
        return page.map(ServerEqpmnDto::from);
    }

    @Transactional(readOnly = true)
    public ServerEqpmnDto getServerEqpmn(String serverEqpmnId) {
        ServerEqpmn entity = serverEqpmnRepository.findById(Objects.requireNonNull(serverEqpmnId))
                .orElseThrow(() -> new RuntimeException("ServerEqpmn not found: " + serverEqpmnId));
        return ServerEqpmnDto.from(entity);
    }

    @Transactional
    public void createServerEqpmn(ServerEqpmnDto dto) {
        ServerEqpmn entity = ServerEqpmn.builder()
                .serverEqpmnId(dto.getServerEqpmnId())
                .serverEqpmnNm(dto.getServerEqpmnNm())
                .serverEqpmnIp(dto.getServerEqpmnIp())
                .serverEqpmnMngr(dto.getServerEqpmnMngr())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .opersysmInfo(dto.getOpersysmInfo())
                .cpuInfo(dto.getCpuInfo())
                .moryInfo(dto.getMoryInfo())
                .hdDisk(dto.getHdDisk())
                .etcInfo(dto.getEtcInfo())
                .regstYmd(LocalDate.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        serverEqpmnRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateServerEqpmn(ServerEqpmnDto dto) {
        ServerEqpmn entity = serverEqpmnRepository.findById(Objects.requireNonNull(dto.getServerEqpmnId()))
                .orElseThrow(() -> new RuntimeException("ServerEqpmn not found"));

        entity.setServerEqpmnNm(dto.getServerEqpmnNm());
        entity.setServerEqpmnIp(dto.getServerEqpmnIp());
        entity.setServerEqpmnMngr(dto.getServerEqpmnMngr());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setOpersysmInfo(dto.getOpersysmInfo());
        entity.setCpuInfo(dto.getCpuInfo());
        entity.setMoryInfo(dto.getMoryInfo());
        entity.setHdDisk(dto.getHdDisk());
        entity.setEtcInfo(dto.getEtcInfo());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteServerEqpmn(String serverEqpmnId) {
        serverEqpmnRepository.deleteById(Objects.requireNonNull(serverEqpmnId));
    }
}
