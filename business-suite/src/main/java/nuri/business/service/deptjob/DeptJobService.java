package nuri.business.service.deptjob;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.deptjob.DeptJob;

// import java.util.List;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.deptjob.DeptJobBoxRepository;

// import nuri.business.domain.deptjob.QDeptJob;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.deptjob.dto.DeptJobDto;
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

    public DeptJobService(DeptJobRepository deptJobRepository,
            DeptJobBoxRepository deptJobBoxRepository,
            UserRepository userRepository,
            OrganizationManageRepository organizationManageRepository) {
        this.deptJobRepository = required(deptJobRepository, "DeptJobRepository 는 null 일 수 없습니다");
        this.deptJobBoxRepository = required(deptJobBoxRepository, "DeptJobBoxRepository 는 null 일 수 없습니다");
        this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
        this.organizationManageRepository = required(organizationManageRepository,
                "OrganizationManageRepository 는 null 일 수 없습니다");
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
                    .map(box -> box.getDeptJobbxId())
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
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return toDto(deptJob);
    }

    @Override
    @Transactional
    public String createDeptJob(DeptJobDto dto) {
        DeptJob deptJob = DeptJob.builder()
                .deptJobId(dto.getDeptJobId())
                .deptJobbxId(dto.getDeptJobbxId())
                .deptJobNm(dto.getDeptJobNm())
                .deptJobCn(dto.getDeptJobCn())
                .chargerId(dto.getChargerId())
                .priort(dto.getPriort())
                .atchFileId(dto.getAtchFileId())
                .build();
        deptJobRepository.save(required(deptJob, "deptJob 는 null 일 수 없습니다"));
        return deptJob.getDeptJobId();
    }

    @Override
    @Transactional
    public void updateDeptJob(String id, DeptJobDto dto) {
        DeptJob deptJob = deptJobRepository.findById(required(id, "id 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        deptJob.update(
                dto.getDeptJobbxId(),
                dto.getDeptJobNm(),
                dto.getDeptJobCn(),
                dto.getChargerId(),
                dto.getPriort(),
                dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteDeptJob(String id) {
        deptJobRepository.deleteById(required(id, "id 는 null 일 수 없습니다"));
    }

    private DeptJobDto toDto(DeptJob entity) {
        DeptJobDto dto = DeptJobDto.from(entity);

        deptJobBoxRepository.findById(required(entity.getDeptJobbxId(), "entity.getDeptJobbxId() 는 null 일 수 없습니다"))
                .ifPresent(box -> {
                    dto.setDeptJobbxNm(box.getDeptJobbxNm());
                    dto.setDeptId(box.getDeptId());
                    organizationManageRepository.findById(required(box.getDeptId(), "box.getDeptId() 는 null 일 수 없습니다"))
                            .ifPresent(org -> dto.setDeptNm(org.getOgnzNm()));
                });

        userRepository.findByEsntlId(required(entity.getChargerId(), "entity.getChargerId() 는 null 일 수 없습니다"))
                .ifPresent(user -> dto.setChargerNm(user.getUserNm()));

        return dto;
    }
}
