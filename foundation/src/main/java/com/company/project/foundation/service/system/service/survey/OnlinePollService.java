package com.company.project.foundation.service.system.service.survey;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.system.service.survey.*;
import com.company.project.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import com.company.project.foundation.service.system.service.survey.dto.OnlinePollManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnlinePollService implements EgovOnlinePollService {

    private final OnlinePollManageRepository pollManageRepository;
    private final OnlinePollItemRepository pollItemRepository;
    private final OnlinePollResultRepository pollResultRepository;

    @Override
    public Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<OnlinePollManage> entities;
        if (keyword == null || keyword.isEmpty()) {
            entities = pollManageRepository.findAll(pageable);
        } else {
            entities = pollManageRepository.findByPollNmContaining(keyword, pageable);
        }
        
        return entities.map(entity -> {
            OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
            // Optionally populate vote counts for the list view if needed by summary components
            if (dto.getPollItems() != null) {
                dto.getPollItems().forEach(itemDto -> {
                    itemDto.setPollIemCo(pollResultRepository.countByPollIemId(itemDto.getPollIemId()));
                });
            }
            return dto;
        });
    }

    @Override
    public OnlinePollManageDto getPoll(String pollId) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(pollId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
        dto.setPollItems(getPollItemList(pollId));
        return dto;
    }

    @Override
    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        String pollId = "POLL_" + System.currentTimeMillis();
        
        List<OnlinePollItem> pollItems = new ArrayList<>();
        if (dto.getPollItems() != null) {
            long timestamp = System.currentTimeMillis();
            int index = 0;
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                pollItems.add(OnlinePollItem.builder()
                        .pollIemId("POLIEM_" + timestamp + "_" + (index++))
                        .pollId(pollId)
                        .pollIemNm(itemDto.getPollIemNm())
                        .build());
            }
        }

        pollManageRepository.save(OnlinePollManage.builder()
                .pollId(pollId)
                .pollNm(dto.getPollNm())
                .pollBeginDe(dto.getPollBeginDe())
                .pollEndDe(dto.getPollEndDe())
                .pollKindCode(dto.getPollKindCode())
                .pollDsuseYn(dto.getPollDsuseYn() != null ? dto.getPollDsuseYn() : "N")
                .pollAutoDsuseYn(dto.getPollAutoDsuseYn() != null ? dto.getPollAutoDsuseYn() : "N")
                .pollItems(pollItems)
                .build());
    }

    @Override
    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(dto.getPollNm(), dto.getPollBeginDe(), dto.getPollEndDe(),
                dto.getPollKindCode(), dto.getPollDsuseYn(), dto.getPollAutoDsuseYn());
        
        // Handle items update if provided (simplistic replacement for items)
        if (dto.getPollItems() != null) {
            entity.getPollItems().clear();
            long timestamp = System.currentTimeMillis();
            int index = 0;
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                entity.getPollItems().add(OnlinePollItem.builder()
                        .pollIemId("POLIEM_" + timestamp + "_" + (index++))
                        .pollId(entity.getPollId())
                        .pollIemNm(itemDto.getPollIemNm())
                        .build());
            }
        }
    }

    @Override
    @Transactional
    public void deletePoll(String pollId) {
        pollManageRepository.deleteById(Objects.requireNonNull(pollId));
    }

    @Override
    public List<OnlinePollItemDto> getPollItemList(String pollId) {
        return pollItemRepository.findByPollId(Objects.requireNonNull(pollId)).stream()
                .map(item -> {
                    OnlinePollItemDto dto = OnlinePollItemDto.from(item);
                    dto.setPollIemCo(pollResultRepository.countByPollIemId(item.getPollIemId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertPollItem(OnlinePollItemDto dto) {
        String id = "POLIEM_" + System.currentTimeMillis();
        pollItemRepository.save(Objects.requireNonNull(OnlinePollItem.builder()
                .pollIemId(id)
                .pollId(dto.getPollId())
                .pollIemNm(dto.getPollIemNm())
                .build()));
    }

    @Override
    @Transactional
    public void updatePollItem(OnlinePollItemDto dto) {
        OnlinePollItem entity = pollItemRepository.findById(Objects.requireNonNull(dto.getPollIemId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollIemNm());
    }

    @Override
    @Transactional
    public void deletePollItem(String pollIemId) {
        pollItemRepository.deleteById(Objects.requireNonNull(pollIemId));
    }

    @Override
    @Transactional
    public void vote(String pollId, String pollIemId, String userId) {
        String id = "POLRES_" + System.currentTimeMillis();
        pollResultRepository.save(Objects.requireNonNull(OnlinePollResult.builder()
                .pollResultId(id)
                .pollId(pollId)
                .pollIemId(pollIemId)
                .createdBy(userId)
                .build()));
    }
}
