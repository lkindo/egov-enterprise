package com.company.project.service.meeting;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.meeting.MeetingPlace;
import com.company.project.domain.meeting.MeetingPlaceRepository;
import com.company.project.domain.meeting.MeetingReservation;
import com.company.project.domain.meeting.MeetingReservationRepository;
import com.company.project.service.meeting.dto.MeetingPlaceDto;
import com.company.project.service.meeting.dto.MeetingReservationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회의실 관리 및 예약 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingService implements EgovMeetingService {

    private final MeetingPlaceRepository meetingPlaceRepository;
    private final MeetingReservationRepository meetingReservationRepository;

    @Override
    public Page<MeetingPlaceDto> getMeetingPlaceList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return meetingPlaceRepository.findAll(pageable).map(MeetingPlaceDto::from);
        }
        return meetingPlaceRepository.findByMtgPlaceNmContaining(keyword, pageable).map(MeetingPlaceDto::from);
    }

    @Override
    public MeetingPlaceDto getMeetingPlace(String mtgPlaceId) {
        return meetingPlaceRepository.findById(mtgPlaceId)
                .map(MeetingPlaceDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createMeetingPlace(String userId, MeetingPlaceDto dto) {
        String id = "MTG_" + String.format("%016d", System.currentTimeMillis());
        MeetingPlace entity = MeetingPlace.builder()
                .mtgPlaceId(id)
                .mtgPlaceNm(dto.getMtgPlaceNm())
                .opnBeginTm(dto.getOpnBeginTm())
                .opnEndTm(dto.getOpnEndTm())
                .aceptncPosblNmpr(dto.getAceptncPosblNmpr())
                .lcSe(dto.getLcSe())
                .lcDetail(dto.getLcDetail())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();
        meetingPlaceRepository.save(entity);
        return id;
    }

    @Override
    @Transactional
    public void updateMeetingPlace(String mtgPlaceId, String userId, MeetingPlaceDto dto) {
        MeetingPlace entity = meetingPlaceRepository.findById(mtgPlaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMtgPlaceNm(), dto.getOpnBeginTm(), dto.getOpnEndTm(),
                dto.getAceptncPosblNmpr(), dto.getLcSe(), dto.getLcDetail(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteMeetingPlace(String mtgPlaceId) {
        meetingPlaceRepository.deleteById(mtgPlaceId);
    }

    @Override
    public Page<MeetingReservationDto> getMeetingReservationList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return meetingReservationRepository.findAll(pageable).map(MeetingReservationDto::from);
        }
        return meetingReservationRepository.findByMtgSjContaining(keyword, pageable).map(MeetingReservationDto::from);
    }

    @Override
    public MeetingReservationDto getMeetingReservation(String resveId) {
        return meetingReservationRepository.findById(resveId)
                .map(MeetingReservationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String reserveMeetingPlace(String userId, MeetingReservationDto dto) {
        String id = "RESV_" + String.format("%015d", System.currentTimeMillis());
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
                .frstRegisterId(userId)
                .build();
        meetingReservationRepository.save(entity);
        return id;
    }

    @Override
    @Transactional
    public void updateMeetingReservation(String resveId, String userId, MeetingReservationDto dto) {
        MeetingReservation entity = meetingReservationRepository.findById(resveId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMtgPlaceId(), dto.getMtgSj(), dto.getResveDe(),
                dto.getResveBeginTm(), dto.getResveEndTm(), dto.getAtndncNmpr(),
                dto.getMtgCn(), userId);
    }

    @Override
    @Transactional
    public void cancelMeetingReservation(String resveId) {
        meetingReservationRepository.deleteById(resveId);
    }

    @Override
    public int checkReservationConflict(String mtgPlaceId, String resveDe, String startTime, String endTime,
            String excludeResveId) {
        if (excludeResveId == null)
            excludeResveId = "";
        return meetingReservationRepository.countConflictingReservations(mtgPlaceId, resveDe, startTime, endTime,
                excludeResveId);
    }
}
