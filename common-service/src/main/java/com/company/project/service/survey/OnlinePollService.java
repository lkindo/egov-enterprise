package com.company.project.service.survey;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.survey.*;
import com.company.project.service.survey.dto.OnlinePollItemDto;
import com.company.project.service.survey.dto.OnlinePollManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (keyword == null || keyword.isEmpty()) {
            return pollManageRepository.findAll(pageable).map(OnlinePollManageDto::from);
        }
        return pollManageRepository.findByPollNmContaining(keyword, pageable).map(OnlinePollManageDto::from);
    }

    @Override
    public OnlinePollManageDto getPoll(String pollId) {
        OnlinePollManage entity = pollManageRepository.findById(pollId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
        dto.setItems(getPollItemList(pollId));
        return dto;
    }

    @Override
    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        String id = "POLL_" + String.format("%013d", System.currentTimeMillis());
        pollManageRepository.save(OnlinePollManage.builder()
                .pollId(id)
                .pollNm(dto.getPollNm())
                .pollBeginDe(dto.getPollBeginDe())
                .pollEndDe(dto.getPollEndDe())
                .pollKindCode(dto.getPollKindCode())
                .pollDsuseYn(dto.getPollDsuseYn())
                .pollAutoDsuseYn(dto.getPollAutoDsuseYn())
                .build());
    }

    @Override
    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        OnlinePollManage entity = pollManageRepository.findById(dto.getPollId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollNm(), dto.getPollBeginDe(), dto.getPollEndDe(),
                dto.getPollKindCode(), dto.getPollDsuseYn(), dto.getPollAutoDsuseYn());
    }

    @Override
    @Transactional
    public void deletePoll(String pollId) {
        pollManageRepository.deleteById(pollId);
    }

    @Override
    public List<OnlinePollItemDto> getPollItemList(String pollId) {
        return pollItemRepository.findByPollId(pollId).stream()
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
        String id = "POLIEM_" + String.format("%013d", System.currentTimeMillis());
        pollItemRepository.save(OnlinePollItem.builder()
                .pollIemId(id)
                .pollId(dto.getPollId())
                .pollIemNm(dto.getPollIemNm())
                .build());
    }

    @Override
    @Transactional
    public void updatePollItem(OnlinePollItemDto dto) {
        OnlinePollItem entity = pollItemRepository.findById(dto.getPollIemId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollIemNm());
    }

    @Override
    @Transactional
    public void deletePollItem(String pollIemId) {
        pollItemRepository.deleteById(pollIemId);
    }

    @Override
    @Transactional
    public void vote(String pollId, String pollIemId, String userId) {
        String id = "POLRES_" + String.format("%013d", System.currentTimeMillis());
        pollResultRepository.save(OnlinePollResult.builder()
                .pollResultId(id)
                .pollId(pollId)
                .pollIemId(pollIemId)
                .build());
    }
}
