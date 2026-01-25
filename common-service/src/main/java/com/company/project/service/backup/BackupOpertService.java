package com.company.project.service.backup;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupOpertRepository;
import com.company.project.domain.backup.BackupSchdulDfk;
import com.company.project.service.backup.dto.BackupOpertDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BackupOpertService extends EgovAbstractServiceImpl implements EgovBackupOpertService {

    private final BackupOpertRepository backupOpertRepository;
    private final EgovCommonCodeService commonCodeService;

    @Override
    @Transactional(readOnly = true)
    public Page<BackupOpertDto> getBackupOpertList(String condition, String keyword, Pageable pageable) {
        Page<BackupOpert> page = backupOpertRepository.searchBackupOperts(condition, keyword, pageable);

        List<CommonCodeDto> cycleCodes = commonCodeService.getCodesByGroup("COM047");
        Map<String, String> cycleMap = cycleCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        // Fetch Weekly codes (COM074) once
        List<CommonCodeDto> dfkCodes = commonCodeService.getCodesByGroup("COM074");
        Map<String, String> dfkMap = dfkCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            BackupOpertDto dto = BackupOpertDto.from(entity);
            dto.setExecutCycleNm(cycleMap.getOrDefault(dto.getExecutCycle(), ""));
            formatSchedule(dto, dfkMap);
            return dto;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public BackupOpertDto getBackupOpert(String backupOpertId) {
        BackupOpert entity = backupOpertRepository.findById(backupOpertId)
                .orElseThrow(() -> new RuntimeException("BackupOpert not found: " + backupOpertId));

        BackupOpertDto dto = BackupOpertDto.from(entity);

        List<CommonCodeDto> cycleCodes = commonCodeService.getCodesByGroup("COM047");
        dto.setExecutCycleNm(cycleCodes.stream()
                .filter(c -> c.code().equals(dto.getExecutCycle()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        List<CommonCodeDto> cmprsCodes = commonCodeService.getCodesByGroup("COM049");
        dto.setCmprsSeNm(cmprsCodes.stream()
                .filter(c -> c.code().equals(dto.getCmprsSe()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        // Fetch Weekly codes (COM074) once
        List<CommonCodeDto> dfkCodes = commonCodeService.getCodesByGroup("COM074");
        Map<String, String> dfkMap = dfkCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        formatSchedule(dto, dfkMap);
        return dto;
    }

    @Override
    @Transactional
    public String createBackupOpert(String userId, BackupOpertDto dto) {
        BackupOpert entity = BackupOpert.builder()
                .backupOpertId(dto.getBackupOpertId())
                .backupOpertNm(dto.getBackupOpertNm())
                .backupOrginlDrctry(dto.getBackupOrginlDrctry())
                .backupStreDrctry(dto.getBackupStreDrctry())
                .cmprsSe(dto.getCmprsSe())
                .executCycle(dto.getExecutCycle())
                .executSchdulDe(dto.getExecutSchdulDe())
                .executSchdulHour(dto.getExecutSchdulHour())
                .executSchdulMnt(dto.getExecutSchdulMnt())
                .executSchdulSecnd(dto.getExecutSchdulSecnd())
                .useAt("Y")
                .frstRegisterId(userId)
                .lastUpdusrId(userId)
                .build();

        if (dto.getExecutSchdulDfkSes() != null) {
            for (String dfk : dto.getExecutSchdulDfkSes()) {
                entity.getExecutSchdulDfkSes().add(BackupSchdulDfk.builder()
                        .backupOpertId(dto.getBackupOpertId())
                        .executSchdulDfkSe(dfk)
                        .backupOpert(entity)
                        .build());
            }
        }

        return backupOpertRepository.save(entity).getBackupOpertId();
    }

    @Override
    @Transactional
    public void updateBackupOpert(String backupOpertId, String userId, BackupOpertDto dto) {
        BackupOpert entity = backupOpertRepository.findById(backupOpertId)
                .orElseThrow(() -> new RuntimeException("BackupOpert not found: " + backupOpertId));

        entity.setBackupOpertNm(dto.getBackupOpertNm());
        entity.setBackupOrginlDrctry(dto.getBackupOrginlDrctry());
        entity.setBackupStreDrctry(dto.getBackupStreDrctry());
        entity.setCmprsSe(dto.getCmprsSe());
        entity.setExecutCycle(dto.getExecutCycle());
        entity.setExecutSchdulDe(dto.getExecutSchdulDe());
        entity.setExecutSchdulHour(dto.getExecutSchdulHour());
        entity.setExecutSchdulMnt(dto.getExecutSchdulMnt());
        entity.setExecutSchdulSecnd(dto.getExecutSchdulSecnd());
        entity.setLastUpdusrId(userId);

        entity.getExecutSchdulDfkSes().clear();
        if (dto.getExecutSchdulDfkSes() != null) {
            for (String dfk : dto.getExecutSchdulDfkSes()) {
                entity.getExecutSchdulDfkSes().add(BackupSchdulDfk.builder()
                        .backupOpertId(backupOpertId)
                        .executSchdulDfkSe(dfk)
                        .backupOpert(entity)
                        .build());
            }
        }
    }

    @Override
    @Transactional
    public void deleteBackupOpert(String backupOpertId) {
        BackupOpert entity = backupOpertRepository.findById(backupOpertId)
                .orElseThrow(() -> new RuntimeException("BackupOpert not found: " + backupOpertId));
        entity.setUseAt("N");
    }

    private void formatSchedule(BackupOpertDto dto, Map<String, String> dfkMap) {
        StringBuilder sb = new StringBuilder();
        String de = dto.getExecutSchdulDe();

        if ("03".equals(dto.getExecutCycle()) && de != null && de.length() >= 8) { // Monthly
            sb.append(de.substring(6, 8)).append("일 ");
        } else if ("04".equals(dto.getExecutCycle()) && de != null && de.length() >= 8) { // Yearly
            sb.append(de.substring(4, 6)).append("-").append(de.substring(6, 8)).append(" ");
        } else if ("06".equals(dto.getExecutCycle()) && de != null && de.length() >= 8) { // Once
            sb.append(de.substring(0, 4)).append("-").append(de.substring(4, 6)).append("-").append(de.substring(6, 8))
                    .append(" ");
        }

        if ("02".equals(dto.getExecutCycle()) && dto.getExecutSchdulDfkSes() != null) { // Weekly
            List<String> dfkNames = new ArrayList<>();
            for (String dfk : dto.getExecutSchdulDfkSes()) {
                dfkNames.add(dfkMap.getOrDefault(dfk, ""));
            }
            if (!dfkNames.isEmpty()) {
                sb.append(String.join(",", dfkNames)).append(" ");
            }
        }

        sb.append(dto.getExecutSchdulHour()).append(":")
                .append(dto.getExecutSchdulMnt()).append(":")
                .append(dto.getExecutSchdulSecnd());

        dto.setExecutSchdul(sb.toString());
    }
}
