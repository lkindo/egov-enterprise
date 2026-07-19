package nuri.business.service.deptjob;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.IdGenerationUtil;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.deptjob.DeptJob;

// import java.util.List;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.deptjob.DeptJobBoxRepository;

// import nuri.business.domain.deptjob.QDeptJob;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.business.service.deptjob.dto.DeptJobMapper;
import nuri.business.domain.deptjob.QDeptJob;
import com.querydsl.core.BooleanBuilder;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeptJobService extends BaseAbstractService {

    private final DeptJobRepository deptJobRepository;
    private final DeptJobBoxRepository deptJobBoxRepository;
    private final UserRepository userRepository;
    private final OrganizationManageRepository organizationManageRepository;
    private final DeptJobMapper deptJobMapper;

    public DeptJobService(DeptJobRepository deptJobRepository,
            DeptJobBoxRepository deptJobBoxRepository,
            UserRepository userRepository,
            OrganizationManageRepository organizationManageRepository,
            DeptJobMapper deptJobMapper) {
        this.deptJobRepository = required(deptJobRepository, "DeptJobRepository 는 null 일 수 없습니다");
        this.deptJobBoxRepository = required(deptJobBoxRepository, "DeptJobBoxRepository 는 null 일 수 없습니다");
        this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
        this.organizationManageRepository = required(organizationManageRepository,
                "OrganizationManageRepository 는 null 일 수 없습니다");
        this.deptJobMapper = required(deptJobMapper, "DeptJobMapper 는 null 일 수 없습니다");
    }

    public Page<DeptJobDto> getDeptJobList(String deptId, String deptJobbxId, String searchCondition, String keyword,
            Pageable pageable) {
        QDeptJob deptJob = QDeptJob.deptJob;
        BooleanBuilder builder = new BooleanBuilder();

        if (deptJobbxId != null && !deptJobbxId.isEmpty()) {
            builder.and(deptJob.deptTaskBoxId.eq(deptJobbxId));
        } else if (deptId != null && !deptId.isEmpty()) {
            List<String> boxIds = deptJobBoxRepository.findByDeptId(deptId).stream()
                    .map(box -> box.getDeptTaskBoxId())
                    .collect(Collectors.toList());
            if (!boxIds.isEmpty()) {
                builder.and(deptJob.deptTaskBoxId.in(boxIds));
            } else {
                builder.and(deptJob.deptTaskBoxId.eq("NONE_BOX"));
            }
        }

        if (keyword != null && !keyword.isEmpty()) {
            if ("0".equals(searchCondition)) { // 부서업무명
                builder.and(deptJob.deptTaskNm.contains(keyword));
            } else if ("1".equals(searchCondition)) { // 부서업무내용
                builder.and(deptJob.deptTaskCn.contains(keyword));
            } else if ("2".equals(searchCondition)) { // 담당자ID
                builder.and(deptJob.picId.contains(keyword));
            }
        }
        return deptJobRepository.findAll(builder, required(pageable, "pageable 는 null 일 수 없습니다")).map(this::toDto);
    }

    public DeptJobDto getDeptJob(String id) {
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return toDto(deptJob);
    }

    @Transactional
    public String createDeptJob(String userId, DeptJobDto dto) {
        // [PK 채번] dept_task_id 는 @GeneratedValue 없는 할당식 PK(varchar 20, NOT NULL)다.
        //   종전에는 dto.getDeptTaskId() 를 그대로 썼는데, 등록 폼은 이 값을 보내지 않으므로
        //   null PK 로 persist 되어 저장이 불가능했다(Schedule·WorkReport 에서 고친 것과 동일 패턴).
        //   'TASK_'(5) + 15 = 20자로 컬럼 상한에 맞춘다.
        String deptTaskId = IdGenerationUtil.generateUniqueId("TASK_", 15, deptJobRepository::existsById);

        // [담당자 기본값] 등록 폼에 담당자 지정 UI 가 아직 없다. 미지정 시 등록자를 담당자로 둔다
        //   (null 로 두면 목록의 담당자 칸이 비고 검색조건 '담당자ID'가 무의미해진다).
        //   축은 이 컨트롤러의 형제 메서드들과 동일하게 esntlId 다. 담당자 지정 UI 가 생기면
        //   그때 사용자 선택 값을 그대로 받는다.
        String picId = (dto.getPicId() != null && !dto.getPicId().isBlank()) ? dto.getPicId() : userId;

        DeptJob deptJob = DeptJob.builder()
                .deptTaskId(deptTaskId)
                .deptTaskBoxId(dto.getDeptTaskBoxId())
                .deptTaskNm(dto.getDeptTaskNm())
                .deptTaskCn(dto.getDeptTaskCn())
                .picId(picId)
                .prrtyRnk(dto.getPrrtyRnk())
                .atchFileId(dto.getAtchFileId())
                .build();
        deptJobRepository.save(deptJob);
        return deptTaskId;
    }

    @Transactional
    public void updateDeptJob(String id, DeptJobDto dto) {
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // 소유권 검증(IDOR 방어): 작성자(frstRgtrId=loginId) 본인 또는 관리자만 수정 가능.
        // WorkReportService 와 동일 규약 — URL 의 id 만으로 남의 업무를 고칠 수 없게 한다.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(deptJob.getFrstRgtrId());

        deptJob.update(
                dto.getDeptTaskBoxId(),
                dto.getDeptTaskNm(),
                dto.getDeptTaskCn(),
                dto.getPicId(),
                dto.getPrrtyRnk(),
                dto.getAtchFileId());
    }

    @Transactional
    public void deleteDeptJob(String id) {
        // 종전에는 deleteById 로 존재 여부도 소유권도 확인하지 않고 지웠다.
        // 없는 id 는 404 로, 남의 업무는 인가 실패로 되돌린다.
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(deptJob.getFrstRgtrId());

        deptJobRepository.delete(deptJob);
    }

    private DeptJobDto toDto(DeptJob entity) {
        DeptJobDto dto = deptJobMapper.toDto(entity);

        // [nullable 데이터에 required() 를 걸지 않는다]
        // dept_task_box_id·dept_id·pic_id 는 모두 물리 스키마상 nullable 이다. 그런데 종전에는
        // 세 곳 모두 required()(null 이면 즉시 예외)로 감싸고 있어, 업무함을 지정하지 않은 업무가
        // 하나라도 있으면 목록·상세 조회가 통째로 400 으로 떨어졌다.
        // 등록 폼에는 업무함 선택 UI 가 없어 새로 만든 업무는 항상 이 상태가 된다 —
        // 즉 "데이터가 생기는 순간 조회가 깨지는" 구조였다. (컨트롤러 매핑이 없어 등록 자체가
        // 불가능했던 탓에 이 모순이 지금까지 드러나지 않았다.)
        // required() 는 프로그래밍 오류를 잡는 가드이지, 비어 있을 수 있는 도메인 값에 쓸 것이 아니다.
        // 아래 ifPresent 들이 이미 부재를 정상 흐름으로 다루므로 id 가 없으면 조회를 건너뛴다.
        if (entity.getDeptTaskBoxId() != null) {
            deptJobBoxRepository.findById(entity.getDeptTaskBoxId())
                    .ifPresent(box -> {
                        dto.setDeptTaskBoxNm(box.getDeptTaskBoxNm());
                        dto.setDeptId(box.getDeptId());
                        if (box.getDeptId() != null) {
                            organizationManageRepository.findById(box.getDeptId())
                                    .ifPresent(org -> dto.setDeptNm(org.getOgnzNm()));
                        }
                    });
        }

        if (entity.getPicId() != null) {
            userRepository.findByEsntlId(entity.getPicId())
                    .ifPresent(user -> dto.setPicNm(user.getUserNm()));
        }

        return dto;
    }
}
