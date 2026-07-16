package nuri.business.service.system.service.survey;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
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

        // from() 은 스칼라 필드만 채우고, 항목(pollArticles)은 OnlinePollArticleMapper 로 매핑한다
        // (수기 OnlinePollArticleDto.from() 제거 — 매핑 단일화).
        Page<OnlinePollManageDto> dtoPage = entities.map(entity -> {
            OnlinePollManageDto dto = OnlinePollManageDto.from(entity);
            if (entity.getPollArticles() != null) {
                dto.setPollArticles(entity.getPollArticles().stream()
                        .map(onlinePollArticleMapper::toDto)
                        .collect(Collectors.toList()));
            }
            return dto;
        });
        // 페이지 내 모든 항목의 투표수를 단일 배치 쿼리로 채운다(항목마다 count 하던 N+1 제거).
        List<OnlinePollArticleDto> allItems = dtoPage.getContent().stream()
                .map(dto -> dto.getPollArticles())
                .filter(Objects::nonNull)
                .flatMap(list -> list.stream())
                .collect(Collectors.toList());
        applyItemVoteCounts(allItems);
        return dtoPage;
    }

    /** 항목별 투표수(pollIemCo)를 단일 배치 집계로 채운다 — countByPollArtclId N+1 제거. */
    private void applyItemVoteCounts(List<OnlinePollArticleDto> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        List<String> artclIds = items.stream()
                .map(item -> item.getPollArtclId())
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (artclIds.isEmpty()) {
            return;
        }
        Map<String, Long> countByArtcl = new HashMap<>();
        for (Object[] row : pollResultRepository.countByPollArtclIdIn(artclIds)) {
            countByArtcl.put((String) row[0], (Long) row[1]);
        }
        items.forEach(item -> item.setPollIemCo(countByArtcl.getOrDefault(item.getPollArtclId(), 0L)));
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
        String pollId = nuri.foundation.core.util.IdGenerationUtil.generateId("", 20);
        
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

        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        pollManage.setFrstRgtrId(currentUserId);

        if (dto.getPollArticles() != null) {
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                String iemId = nuri.foundation.core.util.IdGenerationUtil.generateId("", 20);
                
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
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        entity.setLastMdfrId(currentUserId);

        if (dto.getPollArticles() != null) {
            entity.getPollArticles().clear();
            for (OnlinePollArticleDto itemDto : dto.getPollArticles()) {
                String iemId = nuri.foundation.core.util.IdGenerationUtil.generateId("", 20);

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
        List<OnlinePollArticleDto> items = pollItemRepository.findByPollManagePollId(Objects.requireNonNull(pollId)).stream()
                .map(onlinePollArticleMapper::toDto)
                .collect(Collectors.toList());
        applyItemVoteCounts(items);
        return items;
    }

    @Override
    @Transactional
    public void insertPollItem(OnlinePollArticleDto dto) {
        OnlinePollManage pollManage = pollManageRepository.findById(dto.getPollId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        
        String iemId = nuri.foundation.core.util.IdGenerationUtil.generateId("", 20);

        OnlinePollArticle item = OnlinePollArticle.builder()
                .pollArtclId(iemId)
                .pollManage(pollManage)
                .pollArtclNm(dto.getPollArtclNm().length() > 100 ? dto.getPollArtclNm().substring(0, 100) : dto.getPollArtclNm())
                .build();
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
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
        
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
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

        // 빠른 경로(fast-path): 이미 참여한 사용자면 굳이 INSERT 를 시도하지 않는다.
        // ⚠ 이 검사만으로는 동시 요청 경합(TOCTOU)을 막을 수 없다. 권위 있는 방어는 아래 유니크 제약(V2_4)이다.
        // 식별자 정합: userId 는 컨트롤러가 loginId(SecurityUtil.getCurrentLoginId())를 전달한다.
        // LoginUserAuditorAware 가 감사 컬럼(frstRgtrId)에 기록하는 값도 loginId 이므로,
        // 이 중복 검사와 DB 유니크 제약(V2_4)이 동일한 식별자를 기준으로 동작한다.
        if (pollResultRepository.countByPollIdAndFrstRegisterId(pollId, userId) > 0) {
            throw new BusinessException("이미 참여하신 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }

        String resId = nuri.foundation.core.util.IdGenerationUtil.generateId("PR", 18);

        OnlinePollResult result = OnlinePollResult.builder()
                .pollRsltId(resId)
                .pollId(pollId)
                .pollArtclId(pollArtclId)
                .build();

        String currentUserId = userId;
        if (currentUserId.length() > 20) currentUserId = currentUserId.substring(0, 20);
        result.setFrstRgtrId(currentUserId);

        // saveAndFlush 로 즉시 flush 하여 유니크 제약 위반을 이 트랜잭션 내부에서 잡는다.
        // (save 는 flush 를 커밋 시점까지 지연시켜 예외가 메서드 밖 커밋 단계에서 터진다 → catch 불가.)
        // 경합으로 pre-check 를 통과한 두 번째 INSERT 는 여기서 제약 위반 → 멱등하게 "이미 참여" 로 변환한다.
        // ⚠ 이중투표 유니크 제약 위반만 "이미 참여" 로 변환한다. value-too-long 등 다른 무결성 오류는
        //    그대로 전파하여 "이미 참여" 로 오분류·은폐하지 않는다.
        try {
            pollResultRepository.saveAndFlush(Objects.requireNonNull(result));
        } catch (DataIntegrityViolationException e) {
            if (isDuplicateVoteViolation(e)) {
                throw new BusinessException("이미 참여하신 설문입니다.", CommonErrorCode.INVALID_INPUT_VALUE);
            }
            throw e;
        }
    }

    /** 예외 원인 체인에서 이중투표 유니크 제약({@code uk_tb_onln_poll_rslt_poll_voter}) 위반인지 식별한다. */
    private boolean isDuplicateVoteViolation(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            String msg = t.getMessage();
            if (msg != null && msg.contains("uk_tb_onln_poll_rslt_poll_voter")) {
                return true;
            }
        }
        return false;
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
