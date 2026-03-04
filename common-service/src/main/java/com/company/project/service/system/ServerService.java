package com.company.project.service.system;

import com.company.project.domain.system.Server;
import com.company.project.domain.system.ServerRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.dto.ServerDto;
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
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServerService extends EgovAbstractServiceImpl {

    private final ServerRepository serverRepository;
    private final EgovCommonCodeService commonCodeService;

    @Transactional(readOnly = true)
    public Page<ServerDto> getServerList(String serverNm, Pageable pageable) {
        Page<Server> page = serverRepository.findByServerNmContaining(serverNm == null ? "" : serverNm,
                Objects.requireNonNull(pageable));

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM064");
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            ServerDto dto = ServerDto.from(entity);
            dto.setServerKndNm(codeMap.getOrDefault(dto.getServerKnd(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public ServerDto getServer(String serverId) {
        Server entity = serverRepository.findById(Objects.requireNonNull(serverId))
                .orElseThrow(() -> new RuntimeException("Server not found: " + serverId));
        ServerDto dto = ServerDto.from(entity);

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM064");
        dto.setServerKndNm(codes.stream()
                .filter(c -> c.code().equals(dto.getServerKnd()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));
        return dto;
    }

    @Transactional
    public void createServer(ServerDto dto) {
        Server entity = Server.builder()
                .serverId(dto.getServerId())
                .serverNm(dto.getServerNm())
                .serverKnd(dto.getServerKnd())
                .regstYmd(LocalDate.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        serverRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateServer(ServerDto dto) {
        Server entity = serverRepository.findById(Objects.requireNonNull(dto.getServerId()))
                .orElseThrow(() -> new RuntimeException("Server not found"));

        entity.setServerNm(dto.getServerNm());
        entity.setServerKnd(dto.getServerKnd());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteServer(String serverId) {
        serverRepository.deleteById(Objects.requireNonNull(serverId));
    }
}