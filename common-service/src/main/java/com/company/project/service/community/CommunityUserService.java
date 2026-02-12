package com.company.project.service.community;

import com.company.project.domain.community.CommunityUser;
import com.company.project.domain.community.CommunityUserId;
import com.company.project.domain.community.CommunityUserRepository;
import com.company.project.domain.community.QCommunityUser;
import com.company.project.domain.user.QUser;
import com.company.project.service.community.dto.CommunityUserDto;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityUserService {

    private final CommunityUserRepository communityUserRepository;
    private final JPAQueryFactory queryFactory;

    // Check if user exists in community
    public boolean checkExistUser(String cmmntyId, String emplyrId) {
        return communityUserRepository.existsById(new CommunityUserId(cmmntyId, emplyrId));
    }

    // Get Single User Detail
    public CommunityUserDto getCommunityUser(String cmmntyId, String emplyrId) {
        CommunityUser entity = communityUserRepository.findById(new CommunityUserId(cmmntyId, emplyrId))
                .orElse(null);
        return CommunityUserDto.from(entity);
    }

    // List Members (with User details)
    public Page<CommunityUserDto> getCommunityUserList(String cmmntyId, String searchCnd, String searchWrd,
            Pageable pageable) {
        QCommunityUser qCommunityUser = QCommunityUser.communityUser;
        QUser qUser = QUser.user;

        BooleanBuilder builder = new BooleanBuilder();
        builder.and(qCommunityUser.id.cmmntyId.eq(cmmntyId));

        if (searchWrd != null && !searchWrd.isEmpty()) {
            if ("0".equals(searchCnd)) {
                builder.and(qUser.userNm.contains(searchWrd));
            }
        }

        List<CommunityUserDto> content = queryFactory
                .select(Projections.constructor(CommunityUserDto.class,
                        qCommunityUser.id.cmmntyId,
                        qCommunityUser.id.emplyrId,
                        qUser.userNm,
                        qCommunityUser.mngrAt,
                        qCommunityUser.sbscrbDe.stringValue(), // Simple conversion, format handled in DTO/Controller
                                                               // usually or projection adjustment
                        qCommunityUser.secsnDe.stringValue(),
                        qCommunityUser.mberSttus,
                        qCommunityUser.mberSttus, // Placeholder for Code Name, ideally join with CodeDetail
                        qCommunityUser.useAt,
                        qCommunityUser.frstRegisterPnttm.stringValue(),
                        qCommunityUser.frstRegisterId))
                .from(qCommunityUser)
                .leftJoin(qUser).on(qCommunityUser.id.emplyrId.eq(qUser.esntlId))
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(qUser.userNm.asc())
                .fetch();

        // Fix date formatting if needed or handle in projection more robustly
        // Converting String dates from QueryDSL might need adjustment depending on DB
        // For now, assume simple string conversion or handle in DTO constructor
        // adjustment

        long total = queryFactory
                .select(qCommunityUser.count())
                .from(qCommunityUser)
                .leftJoin(qUser).on(qCommunityUser.id.emplyrId.eq(qUser.esntlId))
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    // List Managers
    public List<CommunityUserDto> getCommunityManagerList(String cmmntyId) {
        QCommunityUser qCommunityUser = QCommunityUser.communityUser;
        QUser qUser = QUser.user;

        return queryFactory
                .select(Projections.constructor(CommunityUserDto.class,
                        qCommunityUser.id.cmmntyId,
                        qCommunityUser.id.emplyrId,
                        qUser.userNm,
                        qCommunityUser.mngrAt,
                        qCommunityUser.sbscrbDe.stringValue(),
                        qCommunityUser.secsnDe.stringValue(),
                        qCommunityUser.mberSttus,
                        qCommunityUser.mberSttus,
                        qCommunityUser.useAt,
                        qCommunityUser.frstRegisterPnttm.stringValue(),
                        qCommunityUser.frstRegisterId))
                .from(qCommunityUser)
                .leftJoin(qUser).on(qCommunityUser.id.emplyrId.eq(qUser.esntlId))
                .where(qCommunityUser.id.cmmntyId.eq(cmmntyId)
                        .and(qCommunityUser.useAt.eq("Y"))
                        .and(qCommunityUser.mngrAt.eq("Y")))
                .orderBy(qCommunityUser.frstRegisterPnttm.asc())
                .fetch();
    }

    // Join Request
    @Transactional
    public void insertCommunityUserRequest(CommunityUserDto dto) {
        CommunityUser communityUser = CommunityUser.builder()
                .id(new CommunityUserId(dto.getCmmntyId(), dto.getEmplyrId()))
                .mngrAt(dto.getMngrAt() != null ? dto.getMngrAt() : "N") // Default
                .sbscrbDe(LocalDateTime.now())
                .mberSttus(dto.getMberSttus())
                .useAt(dto.getUseAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        communityUserRepository.save(communityUser);
    }

    // Approve Member
    @Transactional
    public void approveCommunityUser(String cmmntyId, String emplyrId, String lastUpdusrId) {
        CommunityUser communityUser = communityUserRepository.findById(new CommunityUserId(cmmntyId, emplyrId))
                .orElseThrow(() -> new IllegalArgumentException("User not found in community"));
        communityUser.approve(lastUpdusrId);
    }

    // Withdraw Member
    @Transactional
    public void withdrawCommunityUser(String cmmntyId, String emplyrId, String lastUpdusrId) {
        // Physical delete in legacy? Mapper says DELETE FROM COMTNCMMNTYUSER
        // But also update deleteCommuUserAdmin -> just updates MNGR_AT = N
        // Legacy deleteCommuUser is DELETE.
        // I will follow legacy behavior: DELETE for withdrawal?
        // Wait, mapper "deleteCommuUser" is DELETE SQL.
        // But mapper "insertCommuUser" is UPDATE MBER_STTUS='P'.

        // If it is withdrawal, physically delete?
        // Let's check legacy service usage.
        communityUserRepository.deleteById(new CommunityUserId(cmmntyId, emplyrId));

        // Use logic from entity if we want logical delete, but legacy uses physical
        // delete.
        // If I want to keep history, I might prefer logical, but stick to legacy
        // behavior for now or use the entity method if I defined it.
        // Entity method `withdraw` sets useAt='N'.
        // Let's stick to physical delete if that's what legacy did, OR prefer logical
        // if modernizing.
        // Given I implemented `withdraw` in Entity, I'll use that for now?
        // No, let's respect the legacy SQL: DELETE FROM COMTNCMMNTYUSER for
        // `deleteCommuUser`.
        // So `communityUserRepository.deleteById(...)` is correct.
    }

    // Grant Admin
    @Transactional
    public void grantAdmin(String cmmntyId, String emplyrId, String lastUpdusrId) {
        CommunityUser communityUser = communityUserRepository.findById(new CommunityUserId(cmmntyId, emplyrId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        communityUser.grantAdmin(lastUpdusrId);
    }

    // Revoke Admin
    @Transactional
    public void revokeAdmin(String cmmntyId, String emplyrId, String lastUpdusrId) {
        CommunityUser communityUser = communityUserRepository.findById(new CommunityUserId(cmmntyId, emplyrId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        communityUser.revokeAdmin(lastUpdusrId);
    }
}
