package com.company.project.service.meeting;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.meeting.MeetingManage;
import com.company.project.domain.meeting.MeetingManageRepository;
import com.company.project.service.meeting.dto.MeetingManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingService implements EgovMeetingService {

    private final MeetingManageRepository meetingManageRepository;

    @Override
    public Page<MeetingManageDto> getMeetingList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return meetingManageRepository.findAll(Objects.requireNonNull(pageable)).map(MeetingManageDto::from);
        }
        return meetingManageRepository.findByMtgNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(MeetingManageDto::from);
    }

    @Override
    public MeetingManageDto getMeeting(String mtgId) {
        return meetingManageRepository.findById(Objects.requireNonNull(mtgId))
                .map(MeetingManageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMeeting(MeetingManageDto dto) {
        String id = "MTG_" + String.format("%013d", System.currentTimeMillis());
        meetingManageRepository.save(Objects.requireNonNull(MeetingManage.builder()
                .mtgId(id)
                .mtgNm(dto.getMtgNm())
                .mtgMtrCn(dto.getMtgMtrCn())
                .mtgSn(dto.getMtgSn())
                .mtgCo(dto.getMtgCo())
                .mtgDe(dto.getMtgDe())
                .mtgPlace(dto.getMtgPlace())
                .mtgBeginTm(dto.getMtgBeginTm())
                .mtgEndTime(dto.getMtgEndTime())
                .clsdrMtgAt(dto.getClsdrMtgAt())
                .mtgResultCn(dto.getMtgResultCn())
                .mngtDeptId(dto.getMngtDeptId())
                .mnaerId(dto.getMnaerId())
                .build()));
    }

    @Override
    @Transactional
    public void updateMeeting(MeetingManageDto dto) {
        MeetingManage entity = meetingManageRepository.findById(Objects.requireNonNull(dto.getMtgId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMtgNm(), dto.getMtgMtrCn(), dto.getMtgSn(), dto.getMtgCo(),
                dto.getMtgDe(), dto.getMtgPlace(), dto.getMtgBeginTm(), dto.getMtgEndTime(),
                dto.getClsdrMtgAt(), null, null, dto.getMtgResultCn(), null, null,
                dto.getMngtDeptId(), dto.getMnaerId(), null, null, null, null, null);
    }

    @Override
    @Transactional
    public void deleteMeeting(String mtgId) {
        meetingManageRepository.deleteById(Objects.requireNonNull(mtgId));
    }
}
