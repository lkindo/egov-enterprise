package nuri.business.service.report;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.report.WorkReport;
import nuri.business.domain.report.WorkReportRepository;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.IdGenerationUtil;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.security.AuthorityConstants;
import nuri.business.security.util.SecurityUtil;
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

    /**
     * 업무보고 목록.
     *
     * <p>[2026-07-29 IDOR 수정] 종전에는 작성자 필터 없이 <b>전원의 보고서를 본문(rptCn)까지</b> 반환했다.
     * 이 엔드포인트의 유일한 소비처는 개인 착지점인 {@code /admin/work-hub} 이고(별도 관리자 콘솔 없음),
     * 같은 엔티티의 수정·삭제는 이미 {@link SecurityUtil#assertOwnerOrAdmin} 로 작성자에 묶여 있다.
     * 읽기만 전원 공개인 것은 비대칭이므로 쓰기와 같은 경계로 좁힌다 — <b>작성자 본인, 관리자는 전체</b>.
     *
     * <p>⚠ 축 정합: {@code searchId} 는 리포지토리에서 {@code userId.eq(...)} 로 쓰이고 그 {@code userId} 는
     * 등록 시 {@code getCurrentLoginId()} 로 고정된다. 쓰기 가드가 보는 {@code frstRgtrId} 도 loginId 축이라
     * 두 축이 일치한다(정체성 축 혼용 함정 없음).
     *
     * <p>부서 단위 열람이 필요해지면 dept-jobs 처럼 <b>명시적 스코프 파라미터</b>로 넓혀야 한다.
     * 무제한 공개로 되돌리지 말 것.
     */
    public Page<WorkReportDto> getWorkReportList(String searchId, String searchSe, String searchWrd, @NonNull Pageable pageable) {
        String scopedId = searchId;
        if (!SecurityUtil.hasRole(AuthorityConstants.ROLE_ADMIN) && !SecurityUtil.hasRole(AuthorityConstants.ROLE_SYSTEM)) {
            scopedId = SecurityUtil.getCurrentLoginId().orElse(null);
            if (scopedId == null) {
                // 인증 주체를 알 수 없으면 열지 않는다(무인증 전량 조회 방지).
                return Page.empty(pageable);
            }
        }
        return workReportRepository.searchWorkReports(scopedId, null, null, null, null, searchWrd, null, searchSe, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    /**
     * 업무보고 상세.
     *
     * <p>[2026-07-29 IDOR 수정] 종전에는 {@code findById} 결과를 무가드로 반환해, 인증만 되면 누구나
     * 임의 {@code rptId} 로 타인의 보고 본문을 읽을 수 있었다. 같은 엔티티의 update(53행)·delete(66행)가
     * 이미 쓰는 가드를 읽기에도 동일하게 적용한다(관리자 대리 열람은 허용 — 쓰기와 같은 판정).
     */
    public WorkReportDto getWorkReport(@NonNull String rptId) {
        return workReportRepository.findById(rptId)
                .map(entity -> {
                    SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());
                    return toDto(entity);
                })
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
