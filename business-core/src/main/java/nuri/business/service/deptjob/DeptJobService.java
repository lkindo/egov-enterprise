package nuri.business.service.deptjob;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
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

@Service("egovDeptJobService")
@Transactional(readOnly = true)
public class DeptJobService extends BaseAbstractService implements EgovDeptJobService {

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

    @Override
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

    @Override
    public DeptJobDto getDeptJob(String id) {
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return toDto(deptJob);
    }

    @Override
    @Transactional
    public String createDeptJob(DeptJobDto dto) {
        DeptJob deptJob = DeptJob.builder()
                .deptTaskId(dto.getDeptTaskId())
                .deptTaskBoxId(dto.getDeptTaskBoxId())
                .deptTaskNm(dto.getDeptTaskNm())
                .deptTaskCn(dto.getDeptTaskCn())
                .picId(dto.getPicId())
                .prrtyRnk(dto.getPrrtyRnk())
                .atchFileId(dto.getAtchFileId())
                .build();
        deptJobRepository.save(required(deptJob, "deptJob 는 null 일 수 없습니다"));
        return deptJob.getDeptTaskId();
    }

    @Override
    @Transactional
    public void updateDeptJob(String id, DeptJobDto dto) {
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        deptJob.update(
                dto.getDeptTaskBoxId(),
                dto.getDeptTaskNm(),
                dto.getDeptTaskCn(),
                dto.getPicId(),
                dto.getPrrtyRnk(),
                dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteDeptJob(String id) {
        deptJobRepository.deleteById(required(id, "id 는 null 일 수 없습니다"));
    }

    private DeptJobDto toDto(DeptJob entity) {
        DeptJobDto dto = deptJobMapper.toDto(entity);

        deptJobBoxRepository.findById(required(entity.getDeptTaskBoxId(), "entity.getDeptTaskBoxId() 는 null 일 수 없습니다"))
                .ifPresent(box -> {
                    dto.setDeptTaskBoxNm(box.getDeptTaskBoxNm());
                    dto.setDeptId(box.getDeptId());
                    organizationManageRepository.findById(required(box.getDeptId(), "box.getDeptId() 는 null 일 수 없습니다"))
                            .ifPresent(org -> dto.setDeptNm(org.getOgnzNm()));
                });

        userRepository.findByEsntlId(required(entity.getPicId(), "entity.getPicId() 는 null 일 수 없습니다"))
                .ifPresent(user -> dto.setPicNm(user.getUserNm()));

        return dto;
    }
}
