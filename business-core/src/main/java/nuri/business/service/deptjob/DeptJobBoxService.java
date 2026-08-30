package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 부서업무함 서비스
 */
@Service("deptJobBoxService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeptJobBoxService {

    private final DeptJobBoxRepository deptJobBoxRepository;
    /** 삭제 전 산하 업무 존재 검사용 — 업무함과 업무는 별개 엔티티다(연관관계 매핑 없음). */
    private final DeptJobRepository deptJobRepository;

    public Page<DeptJobBoxDto> getDeptJobBoxList(String keyword, Pageable pageable) {
        return deptJobBoxRepository.findByKeyword(keyword, Objects.requireNonNull(pageable))
                .map(DeptJobBoxDto::fromEntity);
    }

    public Page<DeptJobBoxDto> getDeptJobBoxListByDept(String deptId, Pageable pageable) {
        return deptJobBoxRepository.findByDeptId(deptId, Objects.requireNonNull(pageable))
                .map(DeptJobBoxDto::fromEntity);
    }

    public DeptJobBoxDto getDeptJobBox(Long deptTaskBoxSn) {
        return deptJobBoxRepository.findById(Objects.requireNonNull(deptTaskBoxSn))
                .map(DeptJobBoxDto::fromEntity)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "부서업무함을 찾을 수 없습니다: " + deptTaskBoxSn));
    }

    @Transactional
    public Long createDeptJobBox(String userId, DeptJobBoxDto dto) {
        // [헌법 제8조 이중검증] 컨트롤러 @PreAuthorize(1차) + 서비스 2차 가드. 부서 업무함은
        // 소유 모델이 없는 공유 관리 자원 → ADMIN/SYSTEM 전용(소유 스코프 승격 시 이 가드를 교체).
        SecurityUtil.assertAdmin();
        DeptJobBox entity = DeptJobBox.builder()
                .deptTaskBoxNm(dto.getDeptTaskBoxNm())
                .deptId(dto.getDeptId())
                .sortOrdr(dto.getSortOrdr())
                .build();
        return deptJobBoxRepository.save(Objects.requireNonNull(entity)).getDeptTaskBoxSn();
    }

    @Transactional
    public void updateDeptJobBox(Long deptTaskBoxSn, String userId, DeptJobBoxDto dto) {
        SecurityUtil.assertAdmin();
        DeptJobBox entity = deptJobBoxRepository.findById(Objects.requireNonNull(deptTaskBoxSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "부서업무함을 찾을 수 없습니다: " + deptTaskBoxSn));

        entity.update(
                dto.getDeptTaskBoxNm(),
                dto.getDeptId(),
                dto.getSortOrdr());
    }

    /**
     * 부서 업무함 삭제.
     *
     * <p><b>산하 업무가 남아 있으면 삭제하지 않고 409(RESOURCE_IN_USE)로 되돌린다.</b>
     * 종전에는 검사 없이 지웠는데, 업무(tb_dept_task_info)는 업무함 id 를 값으로만 들고 있어
     * (연관관계 매핑도 FK 도 없었다) 함이 사라져도 아무 오류 없이 <b>고아 업무</b>가 남았다.
     * 고아가 된 업무는 목록의 업무함 이름·부서가 빈 채로 떠돌고 부서 스코프 조회에서 이탈한다.</p>
     *
     * <p>V2_32 가 {@code fk_tb_dept_task_info_tb_dept_job_bx}(NO ACTION)를 걸어 DB 차원에서도
     * 고아 발생을 막는다. 이 선(先)검사는 그 제약 위반을 500(DataIntegrityViolation)이 아니라
     * <b>의미 있는 409</b>로 표면화하기 위한 것이다 — 함을 지우려면 산하 업무를 먼저 옮기거나 지워야 한다.</p>
     */
    @Transactional
    public void deleteDeptJobBox(Long deptTaskBoxSn) {
        SecurityUtil.assertAdmin();
        Long boxSn = Objects.requireNonNull(deptTaskBoxSn);

        if (deptJobRepository.existsByDeptTaskBoxSn(boxSn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE);
        }

        deptJobBoxRepository.deleteById(boxSn);
    }
}
