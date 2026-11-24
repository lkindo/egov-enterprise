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
    /** 담당 부서 존재 검사용 — tb_dept_job_bx.dept_id 에는 DB FK 가 없다. */
    private final nuri.business.domain.user.repository.DeptManageRepository deptManageRepository;
    /** 수정 전 업무함 행 잠금용(MfaService 와 같은 방식) — 저장소에 잠금 조회를 더하면 벤더 증거 입력이 바뀐다. */
    private final jakarta.persistence.EntityManager entityManager;

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
        SecurityUtil.assertPermission("DEPT_BOX_CREATE");
        assertDepartmentExists(dto.getDeptId());
        DeptJobBox entity = DeptJobBox.builder()
                .deptTaskBoxNm(dto.getDeptTaskBoxNm())
                .deptId(dto.getDeptId())
                .sortOrdr(dto.getSortOrdr())
                .build();
        return deptJobBoxRepository.save(Objects.requireNonNull(entity)).getDeptTaskBoxSn();
    }

    @Transactional
    public void updateDeptJobBox(Long deptTaskBoxSn, String userId, DeptJobBoxDto dto) {
        SecurityUtil.assertPermission("DEPT_BOX_UPDATE");
        // 업무함 행을 잠그고 현재 값을 읽는다. 이름·순서만 고치는 수정도 UPDATE 에 담당 부서를 다시 싣는다(@DynamicUpdate 없음) —
        //   잠금 없이 읽은 낡은 부서를 그대로 쓰면, 그 사이 다른 요청이 이 업무함을 옮기고 원래 부서를 지운 뒤 이 저장이 지워진 부서를
        //   되살린다(2026-11-17 Codex 2차 검토). 잠근 뒤의 현재 값과 비교하므로, 바뀌지 않은 부서는 지금도 이 업무함이 가리키는
        //   부서이고 부서 삭제가 그 업무함을 센다.
        DeptJobBox entity = java.util.Optional.ofNullable(entityManager.find(DeptJobBox.class,
                        Objects.requireNonNull(deptTaskBoxSn), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "부서업무함을 찾을 수 없습니다: " + deptTaskBoxSn));
        // 이미 고아가 된 담당 부서를 그대로 왕복시키는 수정(이름·순서만 고침)은 막지 않는다 — 바뀐 값만 묻는다.
        if (!Objects.equals(dto.getDeptId(), entity.getDeptId())) {
            assertDepartmentExists(dto.getDeptId());
        }

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
        SecurityUtil.assertPermission("DEPT_BOX_DELETE");
        Long boxSn = Objects.requireNonNull(deptTaskBoxSn);

        // [2026-11-24] 없는 업무함은 404 다 — deleteById 는 없는 행을 조용히 넘겨 성공으로 끝났다. 수정과 같은 행 잠금으로 읽어,
        //   같은 업무함을 동시에 지우는 두 요청 가운데 뒤 요청도 앞 삭제가 커밋된 뒤의 상태(없음)를 보고 404 가 된다.
        DeptJobBox entity = java.util.Optional.ofNullable(entityManager.find(DeptJobBox.class, boxSn,
                        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "부서업무함을 찾을 수 없습니다: " + boxSn));
        if (deptJobRepository.existsByDeptTaskBoxSn(boxSn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE);
        }

        deptJobBoxRepository.delete(entity);
    }

    /**
     * 담당 부서는 비워 둘 수 있지만(부서 미지정 업무함), 값을 주면 실제 부서여야 한다. 없는 부서를 담당으로 두면
     * '부서 전체' 열람(DeptJobService)에서 그 업무함이 어느 부서에도 잡히지 않아 조용히 빠진다.
     *
     * <p>부서 행을 잠그고(PESSIMISTIC_WRITE) 확인한다 — 부서 삭제({@code DeptManageService#deleteDeptManage})도 같은 행을 먼저
     * 잠근 뒤 담당 업무함을 세므로, 동시에 들어온 삭제와 배정이 서로의 검사를 비켜 고아 업무함을 남기지 못한다.
     */
    private void assertDepartmentExists(String deptId) {
        if (deptId == null || deptId.isBlank()) {
            return;
        }
        if (deptManageRepository.findByIdForUpdate(deptId).isEmpty()) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "담당 부서를 찾을 수 없습니다: " + deptId);
        }
    }
}
