package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
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
        String id = "DEPTJOB_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
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
        deptJobBoxRepository.deleteById(Objects.requireNonNull(deptTaskBoxId));
    }
}
