package nuri.business.service.report;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.IdGenerationUtil;
import nuri.business.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkReportService extends BaseAbstractService {

    private final WorkReportRepository workReportRepository;

    @Transactional
    public void createWorkReport(String userId, WorkReportDto dto) {
        // [PK 채번] WorkReport 는 @GeneratedValue 없는 할당식 PK(varchar 20)다. 종전에는 dto.getRptId()
        //   를 그대로 써서, 등록 폼이 이 값을 보내지 않으면 null PK 로 persist 되어 500 이 났다.
        //   저장소의 다른 create 경로와 동일하게 서버가 채번한다. 'RPT_'(4) + 16 = 20자(컬럼 상한).
        String rptId = IdGenerationUtil.generateUniqueId("RPT_", 16, workReportRepository::existsById);

        WorkReport entity = WorkReport.builder()
                .rptId(rptId)
                .rptTtl(dto.getRptTtl())
                .rptCn(dto.getRptCn())
                .rptSeCd(dto.getRptSeCd())
                .rptYmd(dto.getRptYmd())
                // [작성자 고정] 종전에는 dto.getUserId() 를 그대로 복사해 ① 미전송 시 null 이 되고
                //   ② 타인 명의로 위조할 수 있었다. 인증 주체로 고정한다(Schedule·Board 와 동일 패턴).
                .userId(userId)
                .atchFileId(dto.getAtchFileId())
                .build();
        workReportRepository.save(entity);
    }

    @Transactional
    public void updateWorkReport(WorkReportDto dto) {
        WorkReport entity = workReportRepository.findById(Objects.requireNonNull(dto.getRptId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 작성자(frstRgtrId=loginId) 본인 또는 관리자만 수정 가능.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        entity.update(dto.getRptTtl(), dto.getRptCn(), dto.getAtchFileId(), dto.getRptSeCd());
        // lastMdfrId 는 @LastModifiedBy 감사자가 loginId 로 기록한다.
        // 클라이언트 DTO 값(dto.getUserId())으로 세팅하면 감사자 위조가 되므로 수동 설정하지 않는다.
    }

    @Transactional
    public void deleteWorkReport(@NonNull String rptId) {
        WorkReport entity = workReportRepository.findById(rptId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 작성자 본인 또는 관리자만 삭제 가능.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        workReportRepository.delete(entity);
    }

    public Page<WorkReportDto> getWorkReportList(String searchId, String searchSe, String searchWrd, @NonNull Pageable pageable) {
        return workReportRepository.searchWorkReports(searchId, null, null, null, null, searchWrd, null, searchSe, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public WorkReportDto getWorkReport(@NonNull String rptId) {
        return workReportRepository.findById(rptId)
                .map(this::toDto)
                .orElse(null);
    }

    private WorkReportDto toDto(WorkReport entity) {
        return WorkReportDto.builder()
                .rptId(entity.getRptId())
                .rptTtl(entity.getRptTtl())
                .rptCn(entity.getRptCn())
                .rptSeCd(entity.getRptSeCd())
                .userId(entity.getUserId())
                .atchFileId(entity.getAtchFileId())
                .build();
    }
}
