package com.company.project.service.meeting;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.meeting.MeetingManage;
import com.company.project.domain.meeting.MeetingManageRepository;
import com.company.project.domain.meeting.MeetingPlace;
import com.company.project.domain.meeting.MeetingPlaceRepository;
import com.company.project.domain.meeting.MeetingReservation;
import com.company.project.domain.meeting.MeetingReservationRepository;
import com.company.project.service.meeting.dto.MeetingManageDto;
import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingServiceImpl implements MeetingService {

    private final MeetingPlaceRepository meetingPlaceRepository;
    private final MeetingReservationRepository meetingReservationRepository;
    private final MeetingManageRepository meetingManageRepository;
    private final EgovIdGnrService egovMtgPlaceManageIdGnrService;
    private final EgovIdGnrService egovMtgPlaceResveManageIdGnrService;
    private final EgovIdGnrService egovMeetingManageIdGnrService;

    @Override
    public Page<MeetingPlaceDto> getMeetingPlaceList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return meetingPlaceRepository.searchMeetingPlaces(keyword, pageable).map(MeetingPlaceDto::from);
    }

    @Override
    public MeetingPlaceDto getMeetingPlace(String mtgPlaceId) {
        return meetingPlaceRepository.findById(Objects.requireNonNull(mtgPlaceId))
                .map(MeetingPlaceDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createMeetingPlace(String userId, MeetingPlaceDto dto) {
        try {
            String id = egovMtgPlaceManageIdGnrService.getNextStringId();
            MeetingPlace entity = MeetingPlace.builder()
                    .mtgPlaceId(id)
                    .mtgPlaceNm(dto.getMtgPlaceNm())
                    .opnBeginTm(dto.getOpnBeginTm())
                    .opnEndTm(dto.getOpnEndTm())
                    .aceptncPosblNmpr(dto.getAceptncPosblNmpr())
                    .lcSe(dto.getLcSe())
                    .lcDetail(dto.getLcDetail())
                    .atchFileId(dto.getAtchFileId())
                    .build();
            meetingPlaceRepository.save(Objects.requireNonNull(entity));
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate meeting place ID", e);
        }
    }

    @Override
    @Transactional
    public void updateMeetingPlace(String mtgPlaceId, String userId, MeetingPlaceDto dto) {
        MeetingPlace entity = meetingPlaceRepository.findById(Objects.requireNonNull(mtgPlaceId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMtgPlaceNm(), dto.getOpnBeginTm(), dto.getOpnEndTm(),
                dto.getAceptncPosblNmpr(), dto.getLcSe(), dto.getLcDetail(),
                dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteMeetingPlace(String mtgPlaceId) {
        meetingPlaceRepository.deleteById(Objects.requireNonNull(mtgPlaceId));
    }

    @Override
    public Page<MeetingReservationDto> getMeetingReservationList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        // Simple search for now, could be expanded with QueryDSL if needed
        if (keyword == null || keyword.isEmpty()) {
            return meetingReservationRepository.findAll(pageable).map(MeetingReservationDto::from);
        }
        return meetingReservationRepository.findByMtgSjContaining(keyword, pageable).map(MeetingReservationDto::from);
    }

    @Override
    public MeetingReservationDto getMeetingReservation(String resveId) {
        return meetingReservationRepository.findById(Objects.requireNonNull(resveId))
                .map(MeetingReservationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String reserveMeetingPlace(String userId, MeetingReservationDto dto) {
        // Check for conflicts before reserving
        if (checkReservationConflict(dto.getMtgPlaceId(), dto.getResveDe(),
                dto.getResveBeginTm(), dto.getResveEndTm(), null) > 0) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE); // Or a more specific error
        }

        try {
            String id = egovMtgPlaceResveManageIdGnrService.getNextStringId();
            MeetingReservation entity = MeetingReservation.builder()
                    .resveId(id)
                    .mtgPlaceId(dto.getMtgPlaceId())
                    .mtgSj(dto.getMtgSj())
                    .resveManId(userId)
                    .resveDe(dto.getResveDe())
                    .resveBeginTm(dto.getResveBeginTm())
                    .resveEndTm(dto.getResveEndTm())
                    .atndncNmpr(dto.getAtndncNmpr())
                    .mtgCn(dto.getMtgCn())
                    .build();
            meetingReservationRepository.save(Objects.requireNonNull(entity));
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate reservation ID", e);
        }
    }

    @Override
    @Transactional
    public void updateMeetingReservation(String resveId, String userId, MeetingReservationDto dto) {
        MeetingReservation entity = meetingReservationRepository.findById(Objects.requireNonNull(resveId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // Check for conflicts excluding current reservation
        if (checkReservationConflict(dto.getMtgPlaceId(), dto.getResveDe(),
                dto.getResveBeginTm(), dto.getResveEndTm(), resveId) > 0) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }

        entity.update(dto.getMtgPlaceId(), dto.getMtgSj(), dto.getResveDe(),
                dto.getResveBeginTm(), dto.getResveEndTm(), dto.getAtndncNmpr(),
                dto.getMtgCn());
    }

    @Override
    @Transactional
    public void cancelMeetingReservation(String resveId) {
        meetingReservationRepository.deleteById(Objects.requireNonNull(resveId));
    }

    @Override
    public int checkReservationConflict(String mtgPlaceId, String resveDe, String startTime, String endTime,
            String excludeResveId) {
        // Use the native query in repository or just simple count
        // For simplicity and correctness, I'll rely on the repository method
        return (int) meetingReservationRepository.countConflictingReservations(mtgPlaceId, resveDe, startTime, endTime,
                excludeResveId);
    }

    @Override
    public Page<MeetingManageDto> getMeetingList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return meetingManageRepository.findAll(pageable).map(MeetingManageDto::from);
        }
        return meetingManageRepository.findByMtgNmContaining(keyword, pageable).map(MeetingManageDto::from);
    }

    @Override
    public MeetingManageDto getMeeting(String mtgId) {
        return meetingManageRepository.findById(mtgId)
                .map(MeetingManageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMeeting(MeetingManageDto dto) {
        try {
            String id = egovMeetingManageIdGnrService.getNextStringId();
            MeetingManage entity = MeetingManage.builder()
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
                    .readngBgnde(dto.getReadngBgnde())
                    .readngAt(dto.getReadngAt())
                    .mtgResultCn(dto.getMtgResultCn())
                    .mtgResultEnnc(dto.getMtgResultEnnc())
                    .etcMatter(dto.getEtcMatter())
                    .mngtDeptId(dto.getMngtDeptId())
                    .mnaerId(dto.getMnaerId())
                    .mnaerDeptId(dto.getMnaerDeptId())
                    .mtgAt(dto.getMtgAt())
                    .nonatdrnCo(dto.getNonatdrnCo())
                    .atdrnCo(dto.getAtdrnCo())
                    .frstRegisterId(dto.getFrstRegisterId())
                    .build();
            meetingManageRepository.save(entity);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate meeting ID", e);
        }
    }

    @Override
    @Transactional
    public void updateMeeting(MeetingManageDto dto) {
        MeetingManage entity = meetingManageRepository.findById(dto.getMtgId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMtgNm(), dto.getMtgMtrCn(), dto.getMtgSn(), dto.getMtgCo(), dto.getMtgDe(),
                dto.getMtgPlace(), dto.getMtgBeginTm(), dto.getMtgEndTime(), dto.getClsdrMtgAt(),
                dto.getReadngBgnde(), dto.getReadngAt(), dto.getMtgResultCn(), dto.getMtgResultEnnc(),
                dto.getEtcMatter(), dto.getMngtDeptId(), dto.getMnaerId(), dto.getMnaerDeptId(),
                dto.getMtgAt(), dto.getNonatdrnCo(), dto.getAtdrnCo(), dto.getLastUpdusrId());
    }

    @Override
    @Transactional
    public void deleteMeeting(String mtgId) {
        meetingManageRepository.deleteById(mtgId);
    }
}
