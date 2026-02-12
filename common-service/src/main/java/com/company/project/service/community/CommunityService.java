package com.company.project.service.community;

import com.company.project.domain.community.Community;
import com.company.project.domain.community.CommunityRepository;
import com.company.project.domain.community.QCommunity;
import com.company.project.service.community.dto.CommunityDto;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final JPAQueryFactory queryFactory;

    // Create
    @Transactional
    public CommunityDto createCommunity(CommunityDto dto) {
        Community community = Community.builder()
                .cmmntyId(dto.getCmmntyId()) // ID generation should be handled by caller or service
                .cmmntyNm(dto.getCmmntyNm())
                .cmmntyIntrcn(dto.getCmmntyIntrcn())
                .registSeCode(dto.getRegistSeCode())
                .tmplatId(dto.getTmplatId())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        return CommunityDto.from(communityRepository.save(community));
    }

    // Read (Detail)
    public CommunityDto getCommunity(String cmmntyId) {
        return communityRepository.findById(cmmntyId)
                .map(CommunityDto::from)
                .orElse(null);
    }

    // Read (List)
    public Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd, Pageable pageable) {
        QCommunity qCommunity = QCommunity.community;
        BooleanBuilder builder = new BooleanBuilder();

        builder.and(qCommunity.registSeCode.eq("REGC01")); // COM001 (Registration Code) check from legacy query

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
                .orderBy(qCommunity.frstRegisterPnttm.desc())
                .fetch();

        long total = queryFactory
                .selectFrom(qCommunity)
                .where(builder)
                .fetchCount();

        return new PageImpl<>(content.stream().map(CommunityDto::from).collect(Collectors.toList()), pageable, total);
    }

    // Update
    @Transactional
    public void updateCommunity(CommunityDto dto) {
        Community community = communityRepository.findById(dto.getCmmntyId())
                .orElseThrow(() -> new IllegalArgumentException("Community not found: " + dto.getCmmntyId()));

        community.update(
                dto.getCmmntyNm(),
                dto.getCmmntyIntrcn(),
                dto.getTmplatId(),
                dto.getUseAt(),
                dto.getFrstRegisterId() // Mapping lastUpdusrId to this field from input in some contexts
        );
    }

    // Delete (Logical)
    @Transactional
    public void deleteCommunity(String cmmntyId, String lastUpdusrId) {
        Community community = communityRepository.findById(cmmntyId)
                .orElseThrow(() -> new IllegalArgumentException("Community not found: " + cmmntyId));
        community.delete(lastUpdusrId);
    }

    // Portlet List
    public List<CommunityDto> getCommunityListPortlet() {
        QCommunity qCommunity = QCommunity.community;
        return queryFactory
                .selectFrom(qCommunity)
                .where(qCommunity.useAt.eq("Y"))
                .orderBy(qCommunity.frstRegisterPnttm.desc())
                .fetch()
                .stream()
                .map(CommunityDto::from)
                .collect(Collectors.toList());
    }
}
