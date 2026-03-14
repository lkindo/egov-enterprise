package com.company.project.service.system.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.service.survey.*;
import com.company.project.service.system.service.survey.dto.OnlinePollItemDto;
import com.company.project.service.system.service.survey.dto.OnlinePollManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;

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
        if (keyword == null || keyword.isEmpty()) {
            return pollManageRepository.findAll(pageable).map(OnlinePollManageDto::from);
        }
        return pollManageRepository.findByPollNmContaining(keyword, pageable).map(OnlinePollManageDto::from);
    }

    @Override
    public OnlinePollManageDto getPoll(String pollId) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(pollId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
        dto.setItems(getPollItemList(pollId));
        return dto;
    }

    @Override
    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        String id = "POLL_" + System.currentTimeMillis();
        pollManageRepository.save(Objects.requireNonNull(OnlinePollManage.builder()
                .pollId(id)
                .pollNm(dto.getPollNm())
                .pollBeginDe(dto.getPollBeginDe())
                .pollEndDe(dto.getPollEndDe())
                .pollKindCode(dto.getPollKindCode())
                .pollDsuseYn(dto.getPollDsuseYn())
                .pollAutoDsuseYn(dto.getPollAutoDsuseYn())
                .build()));
    }

    @Override
    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollNm(), dto.getPollBeginDe(), dto.getPollEndDe(),
                dto.getPollKindCode(), dto.getPollDsuseYn(), dto.getPollAutoDsuseYn());
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
                    dto.setVoteCount(pollResultRepository.countByPollIemId(item.getPollIemId()));
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
                .build()));
    }
}
