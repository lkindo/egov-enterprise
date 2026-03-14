package com.company.project.service.deptjob;

import com.company.project.domain.deptjob.DeptJobBox;
import com.company.project.domain.deptjob.DeptJobBoxRepository;
import com.company.project.service.deptjob.dto.DeptJobBoxDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * ???뾽?댄???퉬???ы쁽?
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
    public DeptJobBoxDto getDeptJobBox(String deptJobbxId) {
        return deptJobBoxRepository.findById(Objects.requireNonNull(deptJobbxId))
                .map(DeptJobBoxDto::fromEntity)
                .orElse(null);
    }

    @Override
    @Transactional
    public String createDeptJobBox(String userId, DeptJobBoxDto dto) {
        String id = "DEPTJOB_" + System.currentTimeMillis();
        DeptJobBox entity = DeptJobBox.builder()
                .deptJobbxId(id)
                .deptJobbxNm(dto.getDeptJobbxNm())
                .deptId(dto.getDeptId())
                .indictOrdr(dto.getIndictOrdr())
                .build();
        deptJobBoxRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateDeptJobBox(String deptJobbxId, String userId, DeptJobBoxDto dto) {
        DeptJobBox entity = deptJobBoxRepository.findById(Objects.requireNonNull(deptJobbxId))
                .orElseThrow(() -> new IllegalArgumentException("DeptJobBox not found: " + deptJobbxId));

        entity.update(
                dto.getDeptJobbxNm(),
                dto.getDeptId(),
                dto.getIndictOrdr());
    }

    @Override
    @Transactional
    public void deleteDeptJobBox(String deptJobbxId) {
        deptJobBoxRepository.deleteById(Objects.requireNonNull(deptJobbxId));
    }
}
