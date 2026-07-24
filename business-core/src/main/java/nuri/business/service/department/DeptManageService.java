package nuri.business.service.department;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.IdGenerationUtil;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.department.dto.DeptManageDto;
import nuri.business.service.department.dto.DeptManageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeptManageService {

    /** 조직 계층 탐색 시 데이터 이상(순환 등)으로 인한 무한 루프를 막는 상한. */
    private static final int MAX_HIERARCHY_DEPTH = 50;

    private final DeptManageRepository deptManageRepository;
    private final DeptManageMapper deptManageMapper;
    /** 부서 삭제 시 소속 사용자 잔존 여부 확인용. */
    private final UserRepository userRepository;

    public Page<DeptManageDto> getDeptManageList(String keyword, @org.springframework.lang.NonNull Pageable pageable) {
        return deptManageRepository.searchDeptManages(keyword, pageable).map(deptManageMapper::toDto);
    }

    public DeptManageDto getDeptManage(String ognzId) {
        return deptManageRepository.findById(Objects.requireNonNull(ognzId))
                .map(deptManageMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String insertDeptManage(DeptManageDto dto) {
        // [PK 채번] 종전에는 dto.getOgnzId() 를 그대로 썼고 DTO 가 @NotBlank 였는데, 등록 폼은 이 값을
        //   수집하지 않는다. 그래서 부서 등록이 항상 400 이었고 조직이 '기본조직' 1건뿐이었다.
        //   기존 데이터 컨벤션(ORGNZT_...)을 이어가되 서버가 채번한다. 'ORGNZT_'(7) + 13 = 20자(컬럼 상한).
        String ognzId = IdGenerationUtil.generateUniqueId("ORGNZT_", 13, deptManageRepository::existsById);
        validateParent(ognzId, dto.getUpOgnzId());

        DeptManage entity = DeptManage.builder()
                .ognzId(ognzId)
                .ognzNm(dto.getOgnzNm())
                .ognzExpln(dto.getOgnzExpln())
                .upOgnzId(dto.getUpOgnzId())
                .sortOrdr(dto.getSortOrdr() != null ? dto.getSortOrdr() : 0)
                .build();
        deptManageRepository.save(entity);
        return ognzId;
    }

    @Transactional
    public void updateDeptManage(DeptManageDto dto) {
        DeptManage entity = deptManageRepository.findById(Objects.requireNonNull(dto.getOgnzId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOgnzNm(), dto.getOgnzExpln());
    }

    /**
     * 조직도 편집(드래그앤드롭) 결과를 일괄 반영한다. 각 항목의 상위/순서만 갱신하며 명칭·설명은 건드리지 않는다.
     * 종전에는 프론트가 존재하지 않는 PUT /batch-hierarchy 를 호출해 404 를 받고 있었다.
     */
    @Transactional
    public void updateDeptHierarchy(List<DeptManageDto> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        for (DeptManageDto item : items) {
            String ognzId = Objects.requireNonNull(item.getOgnzId(), "ognzId 는 필수다");
            DeptManage entity = deptManageRepository.findById(ognzId)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
            validateParent(ognzId, item.getUpOgnzId());
            entity.updateHierarchy(item.getUpOgnzId(), item.getSortOrdr() != null ? item.getSortOrdr() : 0);
        }
    }

    @Transactional
    public void deleteDeptManage(String ognzId) {
        Objects.requireNonNull(ognzId);

        // [삭제 가드] tb_user_info.ognz_id 와 tb_ognz_info.up_ognz_id 모두 DB FK 가 없어(NO_CONSTRAINT)
        //   무조건 삭제하면 고아 참조가 남는다. 참조가 있으면 409 로 막고 사용자가 먼저 정리하게 한다.
        long memberCount = userRepository.countByOgnzId(ognzId);
        if (memberCount > 0) {
            throw new BusinessException(
                    "소속 사용자가 " + memberCount + "명 있어 삭제할 수 없습니다. 사용자를 다른 부서로 이동한 뒤 다시 시도하세요.",
                    CommonErrorCode.RESOURCE_IN_USE);
        }
        long childCount = deptManageRepository.countByUpOgnzId(ognzId);
        if (childCount > 0) {
            throw new BusinessException(
                    "하위 부서가 " + childCount + "개 있어 삭제할 수 없습니다. 하위 부서를 먼저 정리하세요.",
                    CommonErrorCode.RESOURCE_IN_USE);
        }

        deptManageRepository.deleteById(ognzId);
    }

    /** 자기 자신을 상위로 두거나(자기참조) 자기 후손을 상위로 두는(순환) 구조를 차단한다. */
    private void validateParent(String ognzId, String upOgnzId) {
        if (upOgnzId == null || upOgnzId.isBlank()) {
            return; // 최상위(루트)
        }
        if (upOgnzId.equals(ognzId)) {
            throw new BusinessException("자기 자신을 상위 부서로 지정할 수 없습니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (!deptManageRepository.existsById(upOgnzId)) {
            throw new BusinessException("상위 부서가 존재하지 않습니다.", CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        // 조상 사슬을 거슬러 올라가며 자기 자신이 나오면 순환이다. 깊이는 데이터 이상 시의 무한루프 방지용 상한.
        String cursor = upOgnzId;
        for (int depth = 0; cursor != null && depth < MAX_HIERARCHY_DEPTH; depth++) {
            if (cursor.equals(ognzId)) {
                throw new BusinessException("순환 참조가 발생하는 상위 부서입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
            cursor = deptManageRepository.findById(cursor).map(d -> d.getUpOgnzId()).orElse(null);
        }
    }
}
