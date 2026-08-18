package nuri.business.service.system.content.community;

import nuri.business.domain.system.content.community.Community;
import nuri.business.domain.system.content.community.CommunityRepository;
import nuri.business.domain.system.content.community.QCommunity;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.domain.system.content.community.CommunityUser;
import nuri.business.domain.system.content.community.CommunityUserRepository;
import nuri.business.domain.system.content.community.CommunityUserId;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityUserRepository communityUserRepository;
    private final JPAQueryFactory queryFactory;

    public Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable) {
        QCommunity qCommunity = QCommunity.community;
        BooleanBuilder builder = new BooleanBuilder();

        builder.and(qCommunity.regSeCd.eq("REGC01"));

        if (searchWrd != null && !searchWrd.isEmpty()) {
            if ("0".equals(searchCnd)) {
                builder.and(qCommunity.cmntyNm.contains(searchWrd));
            }
        }

        List<Community> content = queryFactory
                .selectFrom(qCommunity)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(qCommunity.crtDt.desc())
                .fetch();

        long totalCount = queryFactory
                .selectFrom(qCommunity)
                .where(builder)
                .fetch().size();

        return new PageImpl<>(
                Objects.requireNonNull(content.stream().map(CommunityDto::from).collect(Collectors.toList())),
                Objects.requireNonNull(pageable), totalCount);
    }

    public CommunityDto getCommunity(Long cmntySn) {
        return communityRepository.findById(Objects.requireNonNull(cmntySn))
                .map(CommunityDto::from)
                .orElse(null);
    }

    @Transactional
    public CommunityDto createCommunity(String userId, CommunityDto dto) {
        Community community = Community.builder()
                .cmntyNm(dto.getCmntyNm())
                .cmntyIntroCn(dto.getCmntyIntroCn())
                .regSeCd("REGC01")
                .tmpltId(dto.getTmpltId())
                .useYn("Y")
                .build();
        return CommunityDto.from(Objects
                .requireNonNull(communityRepository.save(Objects.requireNonNull(community))));
    }

    @Transactional
    public void updateCommunity(String userId, CommunityDto dto) {
        Community community = communityRepository.findById(Objects.requireNonNull(dto.getCmntySn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "커뮤니티를 찾을 수 없습니다: " + dto.getCmntySn()));

        community.update(
                dto.getCmntyNm(),
                dto.getCmntyIntroCn(),
                dto.getTmpltId(),
                dto.getUseYn());
    }

    @Transactional
    public void deleteCommunity(Long cmntySn, String userId) {
        Community community = communityRepository.findById(Objects.requireNonNull(cmntySn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "커뮤니티를 찾을 수 없습니다: " + cmntySn));
        community.delete();
    }

    public List<CommunityDto> getCommunityListPortlet() {
        QCommunity qCommunity = QCommunity.community;
        return queryFactory
                .selectFrom(qCommunity)
                .where(qCommunity.useYn.eq("Y"))
                .orderBy(qCommunity.crtDt.desc())
                .fetch()
                .stream()
                .map(CommunityDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void joinCommunity(Long cmntySn, String userId) {
        Community community = communityRepository.findById(Objects.requireNonNull(cmntySn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "커뮤니티를 찾을 수 없습니다: " + cmntySn));

        // [W1-F3] 아래 둘은 '미존재'가 아니라 '상태 위반'이라 404 가 아닌 409 다.
        //   400 은 "입력이 틀렸다"는 뜻이라 클라이언트가 입력을 고치려 들게 만드는데, 여기엔 고칠 입력이 없다.
        //   요청 자체는 올바르고 현재 리소스 상태와 충돌하는 것이므로 409 가 정확하다.
        //   ※ 같은 메서드 안에 '미존재→404'와 '상태위반→409' 두 축이 공존한다 —
        //     일괄 치환하지 않고 축별로 개별 판정해야 하는 이유의 직접 사례다(AGENTS.md Evidence guardrails H4).
        if (!"Y".equals(community.getUseYn())) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE, "비활성 상태인 커뮤니티에는 가입할 수 없습니다.");
        }

        CommunityUserId id = new CommunityUserId(cmntySn, userId);
        if (communityUserRepository.existsById(id)) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 가입했거나 가입 요청이 처리 중입니다.");
        }

        CommunityUser communityUser = CommunityUser.builder()
                .id(id)
                .mbrSttsCd("A") // A: Requested
                .mngrYn("N")
                .joinYmd(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                .useYn("Y")
                .build();

        communityUserRepository.save(communityUser);
    }
}
