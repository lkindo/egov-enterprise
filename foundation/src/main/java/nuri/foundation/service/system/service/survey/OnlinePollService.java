package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.system.service.survey.OnlinePollManage;
import nuri.foundation.domain.system.service.survey.OnlinePollItem;
import nuri.foundation.domain.system.service.survey.OnlinePollResult;
import nuri.foundation.domain.system.service.survey.OnlinePollManageRepository;
import nuri.foundation.domain.system.service.survey.OnlinePollItemRepository;
import nuri.foundation.domain.system.service.survey.OnlinePollResultRepository;
import nuri.foundation.service.system.service.survey.dto.OnlinePollItemDto;
import nuri.foundation.service.system.service.survey.dto.OnlinePollManageDto;
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
        String searchKeyword = (keyword == null) ? "" : keyword;
        entities = pollManageRepository.findByPollNmContaining(searchKeyword, pageable);
        
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
        validatePollDates(dto.getPollBeginDe(), dto.getPollEndDe());
        String pollId = "POLL_" + System.currentTimeMillis();
        
        List<OnlinePollItem> pollItems = new ArrayList<>();
        if (dto.getPollItems() != null) {
            long timestamp = System.currentTimeMillis();
            int index = 0;
            for (OnlinePollItemDto itemDto : dto.getPollItems()) {
                pollItems.add(OnlinePollItem.builder()
                        .pollIemId("PI" + timestamp + (index++))
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
        validatePollDates(dto.getPollBeginDe(), dto.getPollEndDe());
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
                        .pollIemId("PI" + timestamp + (index++))
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
        String id = "PI" + System.currentTimeMillis();
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
        OnlinePollManage poll = pollManageRepository.findById(pollId)
                .orElseThrow(() -> new BusinessException("설문을 찾을 수 없습니다.", ErrorCode.RESOURCE_NOT_FOUND));

        // 1. 폐기 여부 확인
        if ("Y".equals(poll.getPollDsuseYn())) {
            throw new BusinessException("종료되었거나 폐기된 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        // 2. 설문 기간 확인
        String today = java.time.LocalDate.now().toString();
        if (poll.getPollBeginDe().compareTo(today) > 0) {
            throw new BusinessException("설문 시작 전입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }
        if (poll.getPollEndDe().compareTo(today) < 0) {
            throw new BusinessException("이미 종료된 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        // 3. 중복 투표 확인 (1인 1투표)
        if (pollResultRepository.countByPollIdAndFrstRegisterId(pollId, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }

        String id = "POLRES_" + System.currentTimeMillis();
        pollResultRepository.save(Objects.requireNonNull(OnlinePollResult.builder()
                .pollResultId(id)
                .pollId(pollId)
                .pollIemId(pollIemId)
                .createdBy(userId)
                .build()));
    }
    private void validatePollDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            if (beginDe.compareTo(endDe) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", ErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }
}
