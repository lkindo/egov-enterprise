package com.company.project.service.deptjob;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.deptjob.DeptJob;
// import java.util.List;
import com.company.project.domain.deptjob.DeptJobRepository;
import com.company.project.domain.deptjob.DeptJobBoxRepository;
// import com.company.project.domain.deptjob.QDeptJob;
import com.company.project.domain.organization.OrganizationManageRepository;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.deptjob.dto.DeptJobDto;
import com.company.project.domain.deptjob.QDeptJob;
import com.querydsl.core.BooleanBuilder;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service("egovDeptJobService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeptJobService extends EgovAbstractServiceImpl implements EgovDeptJobService {

    private final DeptJobRepository deptJobRepository;
    private final DeptJobBoxRepository deptJobBoxRepository;
    private final UserRepository userRepository;
    private final OrganizationManageRepository organizationManageRepository;

    @Override
    public Page<DeptJobDto> getDeptJobList(String deptId, String deptJobbxId, String searchCondition, String keyword,
            Pageable pageable) {
        QDeptJob deptJob = QDeptJob.deptJob;
        BooleanBuilder builder = new BooleanBuilder();

        if (deptJobbxId != null && !deptJobbxId.isEmpty()) {
            builder.and(deptJob.deptJobbxId.eq(deptJobbxId));
        } else if (deptId != null && !deptId.isEmpty()) {
            List<String> boxIds = deptJobBoxRepository.findByDeptId(deptId).stream()
                    .map(box -> box.getDeptJobbxId())
                    .collect(Collectors.toList());
            if (!boxIds.isEmpty()) {
                builder.and(deptJob.deptJobbxId.in(boxIds));
            } else {
                builder.and(deptJob.deptJobbxId.eq("NONE_BOX"));
            }
        }

        if (keyword != null && !keyword.isEmpty()) {
            if ("0".equals(searchCondition)) { // ?ºÂ€??–ë¾½?¾ë?ì±?                builder.and(deptJob.deptJobNm.contains(keyword));
            } else if ("1".equals(searchCondition)) { // ?ºÂ€??–ë¾½?¾ë?ê¶??
                builder.and(deptJob.deptJobCn.contains(keyword));
            } else if ("2".equals(searchCondition)) { // ??€??ë¨?±¸
                builder.and(deptJob.chargerId.contains(keyword));
            }
        }

        return deptJobRepository.findAll(builder, Objects.requireNonNull(pageable)).map(this::toDto);
    }

    @Override
    public DeptJobDto getDeptJob(String id) {
        DeptJob deptJob = deptJobRepository.findById(Objects.requireNonNull(id))
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
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        deptJobRepository.save(Objects.requireNonNull(deptJob));
        return deptJob.getDeptJobId();
    }

    @Override
    @Transactional
    public void updateDeptJob(String id, DeptJobDto dto) {
        DeptJob deptJob = deptJobRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        deptJob.update(
                dto.getDeptJobbxId(),
                dto.getDeptJobNm(),
                dto.getDeptJobCn(),
                dto.getChargerId(),
                dto.getPriort(),
                dto.getAtchFileId(),
                dto.getLastUpdusrId());
    }

    @Override
    @Transactional
    public void deleteDeptJob(String id) {
        deptJobRepository.deleteById(Objects.requireNonNull(id));
    }

    private DeptJobDto toDto(DeptJob entity) {
        DeptJobDto dto = DeptJobDto.from(entity);

        deptJobBoxRepository.findById(Objects.requireNonNull(entity.getDeptJobbxId()))
                .ifPresent(box -> {
                    dto.setDeptJobbxNm(box.getDeptJobbxNm());
                    dto.setDeptId(box.getDeptId());
                    organizationManageRepository.findById(Objects.requireNonNull(box.getDeptId()))
                            .ifPresent(org -> dto.setDeptNm(org.getOrgnztNm()));
                });

        userRepository.findByEsntlId(Objects.requireNonNull(entity.getChargerId()))
                .ifPresent(user -> dto.setChargerNm(user.getUserNm()));

        return dto;
    }
}
