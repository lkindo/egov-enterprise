package com.company.project.service.duty;

import com.company.project.domain.duty.*;
import com.company.project.service.duty.dto.DutyCheckDto;
import com.company.project.service.duty.dto.DutyDto;
import com.company.project.service.duty.dto.DutyDiaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DutyService implements EgovDutyService {

    private final DutyRepository dutyRepository;
    private final DutyCheckRepository dutyCheckRepository;
    private final DutyDiaryRepository dutyDiaryRepository;

    @Override
    public DutyDto getDuty(String bndtId, String bndtDe) {
        return dutyRepository.findById(new Duty.DutyId(bndtId, bndtDe))
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerDuty(DutyDto dto) {
        Duty duty = Duty.builder()
                .id(new Duty.DutyId(dto.getBndtId(), dto.getBndtDe()))
                .remark(dto.getRemark())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        dutyRepository.save(duty);
    }

    @Override
    @Transactional
    public void updateDuty(DutyDto dto) {
        dutyRepository.findById(new Duty.DutyId(dto.getBndtId(), dto.getBndtDe()))
                .ifPresent(d -> d.update(dto.getRemark(), "SYSTEM"));
    }

    @Override
    @Transactional
    public void deleteDuty(String bndtId, String bndtDe) {
        dutyDiaryRepository.deleteById_BndtIdAndId_BndtDe(bndtId, bndtDe);
        dutyRepository.deleteById(new Duty.DutyId(bndtId, bndtDe));
    }

    @Override
    public List<DutyDto> getDutyList(String bndtDePrefix) {
        List<Duty> duties = dutyRepository.findById_BndtDeStartingWith(bndtDePrefix);
        List<DutyDiary> allDiaries = dutyDiaryRepository.findById_BndtDeStartingWith(bndtDePrefix);

        Map<String, List<DutyDiary>> diariesByDuty = allDiaries.stream()
                .collect(Collectors.groupingBy(d -> d.getId().getBndtId() + "_" + d.getId().getBndtDe()));

        return duties.stream()
                .map(d -> {
                    String key = d.getId().getBndtId() + "_" + d.getId().getBndtDe();
                    return convertToDto(d, diariesByDuty.getOrDefault(key, Collections.emptyList()));
                })
                .collect(Collectors.toList());
    }

    @Override
    public Page<DutyDto> getDutyList(String bndtDePrefix, Pageable pageable) {
        return dutyRepository.findById_BndtDeStartingWith(bndtDePrefix, pageable)
                .map(this::convertToDto);
    }

    @Override
    public List<DutyCheckDto> getDutyCheckList(String useAt) {
        return dutyCheckRepository.findByUseAt(useAt).stream()
                .map(c -> DutyCheckDto.builder()
                        .bndtCeckSe(c.getId().getBndtCeckSe())
                        .bndtCeckCd(c.getId().getBndtCeckCd())
                        .bndtCeckCdNm(c.getBndtCeckCdNm())
                        .useAt(c.getUseAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void saveDutyDiary(List<DutyDiaryDto> diaryList) {
        if (diaryList == null || diaryList.isEmpty())
            return;

        String bndtId = diaryList.get(0).getBndtId();
        String bndtDe = diaryList.get(0).getBndtDe();

        dutyDiaryRepository.deleteById_BndtIdAndId_BndtDe(bndtId, bndtDe);

        for (DutyDiaryDto dto : diaryList) {
            DutyDiary diary = DutyDiary.builder()
                    .id(new DutyDiary.DutyDiaryId(dto.getBndtId(), dto.getBndtDe(), dto.getBndtCeckSe(),
                            dto.getBndtCeckCd()))
                    .chckSttus(dto.getChckSttus())
                    .frstRegisterId("SYSTEM")
                    .lastUpdusrId("SYSTEM")
                    .build();
            dutyDiaryRepository.save(diary);
        }
    }

    private DutyDto convertToDto(Duty d) {
        List<DutyDiary> diaries = dutyDiaryRepository.findById_BndtIdAndId_BndtDe(d.getId().getBndtId(),
                d.getId().getBndtDe());
        return convertToDto(d, diaries);
    }

    private DutyDto convertToDto(Duty d, List<DutyDiary> diaries) {
        DutyDto dto = DutyDto.builder()
                .bndtId(d.getId().getBndtId())
                .bndtDe(d.getId().getBndtDe())
                .remark(d.getRemark())
                .build();

        dto.setDiaries(diaries.stream()
                .map(diary -> DutyDiaryDto.builder()
                        .bndtId(diary.getId().getBndtId())
                        .bndtDe(diary.getId().getBndtDe())
                        .bndtCeckSe(diary.getId().getBndtCeckSe())
                        .bndtCeckCd(diary.getId().getBndtCeckCd())
                        .chckSttus(diary.getChckSttus())
                        .build())
                .collect(Collectors.toList()));

        return dto;
    }
}
