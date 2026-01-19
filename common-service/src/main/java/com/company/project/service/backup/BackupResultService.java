package com.company.project.service.backup;

import com.company.project.domain.backup.BackupResult;
import com.company.project.domain.backup.BackupResultRepository;
import com.company.project.service.backup.dto.BackupResultDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BackupResultService extends EgovAbstractServiceImpl implements EgovBackupResultService {

    private final BackupResultRepository backupResultRepository;
    private final EgovCommonCodeService commonCodeService;

    @Override
    @Transactional(readOnly = true)
    public Page<BackupResultDto> getBackupResultList(String sttus, String searchFrom, String searchTo, String condition,
            String keyword, Pageable pageable) {
        Page<BackupResult> page = backupResultRepository.searchBackupResults(sttus, searchFrom, searchTo, condition,
                keyword, pageable);

        List<CommonCodeDto> statusCodes = commonCodeService.getCodesByGroup("COM041");
        Map<String, String> statusMap = statusCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            BackupResultDto dto = BackupResultDto.from(entity);
            dto.setSttusNm(statusMap.getOrDefault(dto.getSttus(), ""));
            return dto;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public BackupResultDto getBackupResult(String backupResultId) {
        BackupResult entity = backupResultRepository.findById(backupResultId)
                .orElseThrow(() -> new RuntimeException("BackupResult not found: " + backupResultId));

        BackupResultDto dto = BackupResultDto.from(entity);

        List<CommonCodeDto> statusCodes = commonCodeService.getCodesByGroup("COM041");
        dto.setSttusNm(statusCodes.stream()
                .filter(c -> c.code().equals(dto.getSttus()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        return dto;
    }

    @Override
    @Transactional
    public void deleteBackupResult(String backupResultId) {
        backupResultRepository.deleteById(backupResultId);
    }
}
