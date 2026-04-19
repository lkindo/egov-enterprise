package nuri.foundation.service.system.content.community;

import nuri.foundation.domain.system.content.community.Community;
import nuri.foundation.domain.system.content.community.CommunityRepository;
import nuri.foundation.domain.system.content.community.QCommunity;
import nuri.foundation.service.system.content.community.dto.CommunityDto;
import nuri.foundation.domain.system.content.community.CommunityUser;
import nuri.foundation.domain.system.content.community.CommunityUserRepository;
import nuri.foundation.domain.system.content.community.CommunityUserId;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityServiceImpl implements CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityUserRepository communityUserRepository;
    private final JPAQueryFactory queryFactory;
    private final EgovIdGnrService egovCmmntyIdGnrService;

    @Override
    public Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable) {
        QCommunity qCommunity = QCommunity.community;
        BooleanBuilder builder = new BooleanBuilder();

        builder.and(qCommunity.registSeCode.eq("REGC01"));

        if (searchWrd != null && !searchWrd.isEmpty()) {
            if ("0".equals(searchCnd)) {
                builder.and(qCommunity.cmmntyNm.contains(searchWrd));
            }
        }

        List<Community> content = queryFactory
                .selectFrom(qCommunity)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(qCommunity.createdDate.desc())
                .fetch();

        long totalCount = queryFactory
                .selectFrom(qCommunity)
                .where(builder)
                .fetch().size();

        return new PageImpl<>(
                Objects.requireNonNull(content.stream().map(CommunityDto::from).collect(Collectors.toList())),
                Objects.requireNonNull(pageable), totalCount);
    }

    @Override
    public CommunityDto getCommunity(String cmmntyId) {
        return communityRepository.findById(Objects.requireNonNull(cmmntyId))
                .map(CommunityDto::from)
                .orElse(null);
    }

    @Override
    @Transactional
    public CommunityDto createCommunity(String userId, CommunityDto dto) {
        try {
            String cmmntyId = egovCmmntyIdGnrService.getNextStringId();
            Community community = Community.builder()
                    .cmmntyId(cmmntyId)
                    .cmmntyNm(dto.getCmmntyNm())
                    .cmmntyIntrcn(dto.getCmmntyIntrcn())
                    .registSeCode("REGC01")
                    .tmplatId(dto.getTmplatId())
                    .useAt("Y")
                    .build();
            return CommunityDto.from(Objects
                    .requireNonNull(communityRepository.save(Objects.requireNonNull(community))));
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate community ID", e);
        }
    }

    @Override
    @Transactional
    public void updateCommunity(String userId, CommunityDto dto) {
        Community community = communityRepository.findById(Objects.requireNonNull(dto.getCmmntyId()))
                .orElseThrow(() -> new IllegalArgumentException("Community not found: " + dto.getCmmntyId()));

        community.update(
                dto.getCmmntyNm(),
                dto.getCmmntyIntrcn(),
                dto.getTmplatId(),
                dto.getUseAt());
    }

    @Override
    @Transactional
    public void deleteCommunity(String cmmntyId, String userId) {
        Community community = communityRepository.findById(Objects.requireNonNull(cmmntyId))
                .orElseThrow(() -> new IllegalArgumentException("Community not found: " + cmmntyId));
        community.delete();
    }

    @Override
    public List<CommunityDto> getCommunityListPortlet() {
        QCommunity qCommunity = QCommunity.community;
        return queryFactory
                .selectFrom(qCommunity)
                .where(qCommunity.useAt.eq("Y"))
                .orderBy(qCommunity.createdDate.desc())
                .fetch()
                .stream()
                .map(CommunityDto::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void joinCommunity(String cmmntyId, String userId) {
        Community community = communityRepository.findById(Objects.requireNonNull(cmmntyId))
                .orElseThrow(() -> new IllegalArgumentException("Community not found: " + cmmntyId));

        if (!"Y".equals(community.getUseAt())) {
            throw new IllegalStateException("This community is not active.");
        }

        CommunityUserId id = new CommunityUserId(cmmntyId, userId);
        if (communityUserRepository.existsById(id)) {
            throw new IllegalStateException("Already a member or join request pending.");
        }

        CommunityUser communityUser = CommunityUser.builder()
                .id(id)
                .mberSttus("A") // A: Requested
                .mngrAt("N")
                .sbscrbDe(LocalDateTime.now())
                .useAt("Y")
                .build();

        communityUserRepository.save(communityUser);
    }
}
