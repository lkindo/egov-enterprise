package com.company.project.service.system;

import com.company.project.domain.system.SynchrnServerSystem;
import com.company.project.domain.system.SynchrnServerSystemRepository;
import com.company.project.service.system.dto.SynchrnServerDto;
import lombok.RequiredArgsConstructor;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SynchrnServerService extends EgovAbstractServiceImpl {

    private final SynchrnServerSystemRepository synchrnServerRepository;

    @Transactional(readOnly = true)
    public Page<SynchrnServerDto> getSynchrnServerList(String serverNm, Pageable pageable) {
        Page<SynchrnServerSystem> page = synchrnServerRepository
                .findByServerNmContaining(serverNm == null ? "" : serverNm, pageable);
        return page.map(SynchrnServerDto::from);
    }

    @Transactional(readOnly = true)
    public SynchrnServerDto getSynchrnServer(String serverId) {
        SynchrnServerSystem entity = synchrnServerRepository.findById(Objects.requireNonNull(serverId))
                .orElseThrow(() -> new RuntimeException("Sync server not found: " + serverId));
        return SynchrnServerDto.from(entity);
    }

    @Transactional
    public void createSynchrnServer(SynchrnServerDto dto) {
        SynchrnServerSystem entity = SynchrnServerSystem.builder()
                .serverId(dto.getServerId())
                .serverNm(dto.getServerNm())
                .serverIp(dto.getServerIp())
                .serverPort(dto.getServerPort())
                .ftpId(dto.getFtpId())
                .ftpPassword(dto.getFtpPassword())
                .synchrnLc(dto.getSynchrnLc())
                .reflctAt("N")
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        synchrnServerRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateSynchrnServer(SynchrnServerDto dto) {
        SynchrnServerSystem entity = synchrnServerRepository.findById(Objects.requireNonNull(dto.getServerId()))
                .orElseThrow(() -> new RuntimeException("Sync server not found"));

        entity.setServerNm(dto.getServerNm());
        entity.setServerIp(dto.getServerIp());
        entity.setServerPort(dto.getServerPort());
        entity.setFtpId(dto.getFtpId());
        entity.setFtpPassword(dto.getFtpPassword());
        entity.setSynchrnLc(dto.getSynchrnLc());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteSynchrnServer(String serverId) {
        synchrnServerRepository.deleteById(Objects.requireNonNull(serverId));
    }

    @Transactional(readOnly = true)
    public List<String> getFtpFileList(String serverId) throws Exception {
        SynchrnServerSystem entity = synchrnServerRepository.findById(Objects.requireNonNull(serverId))
                .orElseThrow(() -> new RuntimeException("Sync server not found"));

        List<String> list = new ArrayList<>();
        FTPClient ftpClient = new FTPClient();

        try {
            ftpClient.setControlEncoding("UTF-8");
            ftpClient.connect(entity.getServerIp(), Integer.parseInt(entity.getServerPort()));
            boolean isLogin = ftpClient.login(entity.getFtpId(), entity.getFtpPassword());

            if (!isLogin) {
                throw new RuntimeException("FTP login failed");
            }

            ftpClient.changeWorkingDirectory(entity.getSynchrnLc());
            FTPFile[] files = ftpClient.listFiles();

            for (FTPFile file : files) {
                if (file.isFile()) {
                    list.add(file.getName());
                }
            }
            ftpClient.logout();
        } finally {
            if (ftpClient.isConnected()) {
                ftpClient.disconnect();
            }
        }
        return list;
    }
}
