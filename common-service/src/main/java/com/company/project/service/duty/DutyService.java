package com.company.project.service.duty;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.duty.*;
import com.company.project.service.duty.dto.DutyCheckDto;
import com.company.project.service.duty.dto.DutyDiaryDto;
import com.company.project.service.duty.dto.DutyDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DutyService implements EgovDutyService {

    private final BndtManageRepository bndtManageRepository;
    private final BndtCeckManageRepository bndtCeckManageRepository;
    private final BndtDiaryRepository bndtDiaryRepository;

    @Override
    public DutyDto getDuty(String bndtId, String bndtDe) {
        return bndtManageRepository.findById(Objects.requireNonNull(new BndtManageId(bndtId, bndtDe)))
                .map(entity -> {
                    DutyDto dto = DutyDto.from(entity);
                    dto.setDiaries(bndtDiaryRepository
                            .findByBndtIdAndBndtDe(Objects.requireNonNull(bndtId),
                                    Objects.requireNonNull(bndtDe))
                            .stream().map(DutyDiaryDto::from).collect(Collectors.toList()));
                    return dto;
                })
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void registerDuty(DutyDto dto) {
        BndtManage entity = BndtManage.builder()
                .bndtId(dto.getBndtId())
                .bndtDe(dto.getBndtDe())
                .remark(dto.getRemark())
                .build();
        bndtManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateDuty(DutyDto dto) {
        BndtManage entity = bndtManageRepository
                .findById(Objects.requireNonNull(new BndtManageId(dto.getBndtId(), dto.getBndtDe())))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getRemark());
    }

    @Override
    @Transactional
    public void deleteDuty(String bndtId, String bndtDe) {
        bndtDiaryRepository.deleteByBndtIdAndBndtDe(Objects.requireNonNull(bndtId),
                Objects.requireNonNull(bndtDe));
        bndtManageRepository.deleteById(Objects.requireNonNull(new BndtManageId(bndtId, bndtDe)));
    }

    @Override
    public List<DutyDto> getDutyList(String bndtDePrefix) {
        List<BndtManage> list = bndtManageRepository.findByBndtDeStartingWith(bndtDePrefix);

        List<BndtDiary> allDiaries = bndtDiaryRepository.findByBndtDeStartingWith(bndtDePrefix);
        Map<String, List<BndtDiary>> diariesByDuty = allDiaries.stream()
                .collect(Collectors.groupingBy(d -> d.getBndtId() + "_" + d.getBndtDe()));

        return list.stream().map(entity -> {
            DutyDto dto = DutyDto.from(entity);
            String key = entity.getBndtId() + "_" + entity.getBndtDe();
            dto.setDiaries(diariesByDuty.getOrDefault(key, Collections.emptyList())
                    .stream().map(DutyDiaryDto::from).collect(Collectors.toList()));
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public Page<DutyDto> getDutyList(String bndtDePrefix, Pageable pageable) {
        Page<BndtManage> page = bndtManageRepository.findByBndtDeStartingWith(bndtDePrefix,
                Objects.requireNonNull(pageable));

        List<BndtDiary> allDiaries = bndtDiaryRepository.findByBndtDeStartingWith(bndtDePrefix);
        Map<String, List<BndtDiary>> diariesByDuty = allDiaries.stream()
                .collect(Collectors.groupingBy(d -> d.getBndtId() + "_" + d.getBndtDe()));

        return page.map(entity -> {
            DutyDto dto = DutyDto.from(entity);
            String key = entity.getBndtId() + "_" + entity.getBndtDe();
            dto.setDiaries(diariesByDuty.getOrDefault(key, Collections.emptyList())
                    .stream().map(DutyDiaryDto::from).collect(Collectors.toList()));
            return dto;
        });
    }

    @Override
    public List<DutyCheckDto> getDutyCheckList(String useAt) {
        return bndtCeckManageRepository.findAll().stream()
                .filter(c -> useAt == null || useAt.equals(c.getUseAt()))
                .map(DutyCheckDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void saveDutyDiary(List<DutyDiaryDto> diaryList) {
        if (diaryList == null || diaryList.isEmpty())
            return;

        String bndtId = diaryList.get(0).getBndtId();
        String bndtDe = diaryList.get(0).getBndtDe();

        bndtDiaryRepository.deleteByBndtIdAndBndtDe(Objects.requireNonNull(bndtId),
                Objects.requireNonNull(bndtDe));

        for (DutyDiaryDto dto : diaryList) {
            BndtDiary entity = BndtDiary.builder()
                    .bndtId(bndtId)
                    .bndtDe(bndtDe)
                    .bndtCeckSe(dto.getBndtCeckSe())
                    .bndtCeckCd(dto.getBndtCeckCd())
                    .chckSttus(dto.getChckSttus())
                    .build();
            bndtDiaryRepository.save(Objects.requireNonNull(entity));
        }
    }
}