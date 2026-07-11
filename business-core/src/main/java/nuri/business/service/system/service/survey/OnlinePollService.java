package nuri.business.service.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.system.service.survey.OnlinePollManage;
import nuri.business.domain.system.service.survey.OnlinePollArticle;
import nuri.business.domain.system.service.survey.OnlinePollResult;
import nuri.business.domain.system.service.survey.OnlinePollManageRepository;
import nuri.business.domain.system.service.survey.OnlinePollArticleRepository;
import nuri.business.domain.system.service.survey.OnlinePollResultRepository;
import nuri.business.service.system.service.survey.dto.OnlinePollArticleDto;
import nuri.business.service.system.service.survey.dto.OnlinePollManageDto;
import nuri.business.service.system.service.survey.dto.OnlinePollArticleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnlinePollService implements EgovOnlinePollService {

    private final OnlinePollManageRepository pollManageRepository;
    private final OnlinePollArticleRepository pollItemRepository;
    private final OnlinePollResultRepository pollResultRepository;
    private final OnlinePollArticleMapper onlinePollArticleMapper;

    @Override
    public Page<OnlinePollManageDto> getPollList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<OnlinePollManage> entities;
        String searchKeyword = (keyword == null) ? "" : keyword;
        if (searchKeyword.isEmpty()) {
            entities = pollManageRepository.findAll(pageable);
        } else {
            entities = pollManageRepository.findByPollNmContaining(searchKeyword, pageable);
        }

        return entities.map(entity -> {
            OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
            if (dto.getPollArticles() != null) {
                dto.getPollArticles().forEach(itemDto -> {
                    itemDto.setPollIemCo(pollResultRepository.countByPollArtclId(itemDto.getPollArtclId()));
                });
            }
            return dto;
        });
    }

    @Override
    public OnlinePollManageDto getPoll(String pollId) {
        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(pollId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
        dto.setPollArticles(getPollItemList(pollId));
        return dto;
    }

    @Override
    @Transactional
    public void insertPoll(OnlinePollManageDto dto) {
        if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
        
        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);
        
        // Use UUID to guarantee uniqueness in parallel worker environment
        String pollId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        
        OnlinePollManage pollManage = OnlinePollManage.builder()
                .pollId(pollId)
                .pollNm(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm())
                .pollBgngYmd(beginDe)
                .pollEndYmd(endDe)
                .pollKndCd(dto.getPollKndCd() != null && dto.getPollKndCd().length() > 12 ? dto.getPollKndCd().substring(0, 12) : dto.getPollKndCd())
                .pollDsuseYn(dto.getPollDsuseYn() != null ? dto.getPollDsuseYn() : "N")
                .pollAtmcDsuseYn(dto.getPollAtmcDsuseYn() != null ? dto.getPollAtmcDsuseYn() : "N")
                .pollArticles(new ArrayList<>())
                .build();

        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        pollManage.setFrstRgtrId(currentUserId);

        if (dto.getPollArticles() != null) {
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
                
                OnlinePollArticle item = OnlinePollArticle.builder()
                        .pollArtclId(iemId)
                        .pollManage(pollManage)
                        .pollArtclNm(itemDto.getPollArtclNm().length() > 100 ? itemDto.getPollArtclNm().substring(0, 100) : itemDto.getPollArtclNm())
                        .build();
                item.setFrstRgtrId(currentUserId);
                pollManage.getPollArticles().add(item);
            }
        }

        pollManageRepository.save(pollManage);
    }

    @Override
    @Transactional
    public void updatePoll(OnlinePollManageDto dto) {
        if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        String beginDe = normalizeDate(dto.getPollBgngYmd());
        String endDe = normalizeDate(dto.getPollEndYmd());
        validatePollDates(beginDe, endDe);

        OnlinePollManage entity = pollManageRepository.findById(Objects.requireNonNull(dto.getPollId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(dto.getPollNm().length() > 100 ? dto.getPollNm().substring(0, 100) : dto.getPollNm(), 
                beginDe, endDe,
                dto.getPollKndCd() != null && dto.getPollKndCd().length() > 12 ? dto.getPollKndCd().substring(0, 12) : dto.getPollKndCd(), 
                dto.getPollDsuseYn(), dto.getPollAtmcDsuseYn());
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastMdfrId(currentUserId);

        if (dto.getPollArticles() != null) {
            entity.getPollArticles().clear();
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

                OnlinePollArticle item = OnlinePollArticle.builder()
                        .pollArtclId(iemId)
                        .pollManage(entity)
                        .pollArtclNm(itemDto.getPollArtclNm().length() > 100 ? itemDto.getPollArtclNm().substring(0, 100) : itemDto.getPollArtclNm())
                        .build();
                item.setFrstRgtrId(currentUserId);
                entity.getPollArticles().add(item);
            }
        }
    }

    @Override
    @Transactional
    public void deletePoll(String pollId) {
        if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        pollManageRepository.deleteById(Objects.requireNonNull(pollId));
    }

    @Override
    public List<OnlinePollArticleDto> getPollItemList(String pollId) {
        return pollItemRepository.findByPollManagePollId(Objects.requireNonNull(pollId)).stream()
                .map(item -> {
                    OnlinePollArticleDto dto = onlinePollArticleMapper.toDto(item);
                    dto.setPollIemCo(pollResultRepository.countByPollArtclId(item.getPollArtclId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertPollItem(OnlinePollArticleDto dto) {
        OnlinePollManage pollManage = pollManageRepository.findById(dto.getPollId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        
        String iemId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);

        OnlinePollArticle item = OnlinePollArticle.builder()
                .pollArtclId(iemId)
                .pollManage(pollManage)
                .pollArtclNm(dto.getPollArtclNm().length() > 100 ? dto.getPollArtclNm().substring(0, 100) : dto.getPollArtclNm())
                .build();
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        item.setFrstRgtrId(currentUserId);
        
        pollItemRepository.save(Objects.requireNonNull(item));
    }

    @Override
    @Transactional
    public void updatePollItem(OnlinePollArticleDto dto) {
        OnlinePollArticle entity = pollItemRepository.findById(Objects.requireNonNull(dto.getPollArtclId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getPollArtclNm().length() > 100 ? dto.getPollArtclNm().substring(0, 100) : dto.getPollArtclNm());
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentUserId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastMdfrId(currentUserId);
    }

    @Override
    @Transactional
    public void deletePollItem(String pollArtclId) {
        pollItemRepository.deleteById(Objects.requireNonNull(pollArtclId));
    }

    @Override
    @Transactional
    public void vote(String pollId, String pollArtclId, String userId) {
        OnlinePollManage poll = pollManageRepository.findById(pollId)
                .orElseThrow(() -> new BusinessException("설문을 찾을 수 없습니다.", CommonErrorCode.RESOURCE_NOT_FOUND));

        if ("Y".equals(poll.getPollDsuseYn())) {
            throw new BusinessException("종료되었거나 폐기된 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        String today = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        if (poll.getPollBgngYmd() != null && poll.getPollBgngYmd().compareTo(today) > 0) {
            throw new BusinessException("설문 시작 전입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (poll.getPollEndYmd() != null && poll.getPollEndYmd().compareTo(today) < 0) {
            throw new BusinessException("이미 종료된 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        if (pollResultRepository.countByPollIdAndFrstRegisterId(pollId, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        String resId = "PR" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);

        OnlinePollResult result = OnlinePollResult.builder()
                .pollRsltId(resId)
                .pollId(pollId)
                .pollArtclId(pollArtclId)
                .build();
        
        String currentUserId = userId;
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        result.setFrstRgtrId(currentUserId);
        
        pollResultRepository.save(Objects.requireNonNull(result));
    }

    private void validatePollDates(String beginDe, String endDe) {
        if (beginDe != null && endDe != null) {
            if (beginDe.compareTo(endDe) > 0) {
                throw new BusinessException("설문 시작일은 종료일보다 빨라야 합니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }
    }

    private String normalizeDate(String date) {
        if (date == null) return null;
        return date.replace("-", "").replace(".", "").replace("/", "");
    }
}
