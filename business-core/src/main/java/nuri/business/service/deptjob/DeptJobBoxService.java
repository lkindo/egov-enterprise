package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.security.util.SecurityUtil;
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
public class DeptJobBoxService implements EgovDeptJobBoxService {

    private final DeptJobBoxRepository deptJobBoxRepository;

    @Override
    public Page<DeptJobBoxDto> getDeptJobBoxList(String keyword, Pageable pageable) {
        return deptJobBoxRepository.findByKeyword(keyword, Objects.requireNonNull(pageable))
                .map(DeptJobBoxDto::fromEntity);
    }

    @Override
    public Page<DeptJobBoxDto> getDeptJobBoxListByDept(String deptId, Pageable pageable) {
        return deptJobBoxRepository.findByDeptId(deptId, Objects.requireNonNull(pageable))
                .map(DeptJobBoxDto::fromEntity);
    }

    @Override
    public DeptJobBoxDto getDeptJobBox(String deptTaskBoxId) {
        return deptJobBoxRepository.findById(Objects.requireNonNull(deptTaskBoxId))
                .map(DeptJobBoxDto::fromEntity)
                .orElse(null);
    }

    @Override
    @Transactional
    public String createDeptJobBox(String userId, DeptJobBoxDto dto) {
        // [헌법 제8조 이중검증] 컨트롤러 @PreAuthorize(1차) + 서비스 2차 가드. 부서 업무함은
        // 소유 모델이 없는 공유 관리 자원 → ADMIN/SYSTEM 전용(소유 스코프 승격 시 이 가드를 교체).
        SecurityUtil.assertAdmin();
        String id = nuri.foundation.core.util.IdGenerationUtil.generateId("DEPTJOB_", 13);
        DeptJobBox entity = DeptJobBox.builder()
                .deptTaskBoxId(id)
                .deptTaskBoxNm(dto.getDeptTaskBoxNm())
                .deptId(dto.getDeptId())
                .sortOrdr(dto.getSortOrdr())
                .build();
        deptJobBoxRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateDeptJobBox(String deptTaskBoxId, String userId, DeptJobBoxDto dto) {
        SecurityUtil.assertAdmin();
        DeptJobBox entity = deptJobBoxRepository.findById(Objects.requireNonNull(deptTaskBoxId))
                .orElseThrow(() -> new IllegalArgumentException("DeptJobBox not found: " + deptTaskBoxId));

        entity.update(
                dto.getDeptTaskBoxNm(),
                dto.getDeptId(),
                dto.getSortOrdr());
    }

    @Override
    @Transactional
    public void deleteDeptJobBox(String deptTaskBoxId) {
        SecurityUtil.assertAdmin();
        deptJobBoxRepository.deleteById(Objects.requireNonNull(deptTaskBoxId));
    }
}
