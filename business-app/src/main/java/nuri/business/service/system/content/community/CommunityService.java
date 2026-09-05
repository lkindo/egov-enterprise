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

    /**
     * 관리자용 커뮤니티 목록 — 사용 중지(useYn='N')된 것까지 <b>전부</b> 보여 준다.
     * 중지된 커뮤니티를 되살리거나 정리하려면 관리자가 볼 수 있어야 한다.
     */
    public Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable) {
        return searchCommunities(searchCnd, searchWrd, pageable, false);
    }

    /**
     * 일반 사용자용 커뮤니티 목록 — 사용 중(useYn='Y')인 것만.
     *
     * <p><b>왜 나눴나 — 2026-09-02 실측.</b> 관리자·사용자 컨트롤러가 같은 목록 메서드를 불렀고 그
     * 메서드는 {@code regSeCd} 만 걸렀다. 그래서 관리자가 '삭제'(논리 삭제, useYn='N')한 커뮤니티가
     * <b>일반 사용자 목록에 그대로 남았다</b> — 목록 화면에 사용여부 열도 없어 사용자는 죽은
     * 커뮤니티를 산 것과 구분할 수 없었다. 포틀릿용 목록({@link #getCommunityListPortlet})은
     * 처음부터 {@code useYn='Y'} 를 걸고 있었으므로 같은 규칙을 사용자 목록에도 적용한다.
     * 하나의 메서드에 필터를 넣지 않은 것은 관리자 목록의 의미(전체)를 보존하기 위해서다(H3).
     */
    public Page<CommunityDto> getActiveCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable) {
        return searchCommunities(searchCnd, searchWrd, pageable, true);
    }

    private Page<CommunityDto> searchCommunities(String searchCnd, String searchWrd,
            Pageable pageable, boolean activeOnly) {
        QCommunity qCommunity = QCommunity.community;
        BooleanBuilder builder = new BooleanBuilder();

        builder.and(qCommunity.regSeCd.eq("REGC01"));
        if (activeOnly) {
            builder.and(qCommunity.useYn.eq("Y"));
        }

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

        long totalCount = Objects.requireNonNullElse(queryFactory
                .select(qCommunity.count())
                .from(qCommunity)
                .where(builder)
                .fetchOne(), 0L);

        return new PageImpl<>(
                Objects.requireNonNull(content.stream().map(CommunityDto::from).collect(Collectors.toList())),
                Objects.requireNonNull(pageable), totalCount);
    }

    public CommunityDto getCommunity(Long cmntySn) {
        return communityRepository.findById(Objects.requireNonNull(cmntySn))
                .map(CommunityDto::from)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "커뮤니티를 찾을 수 없습니다: " + cmntySn));
    }

    /**
     * 일반 사용자용 커뮤니티 상세 — 사용 중(useYn='Y')이고 정식 등록(regSeCd='REGC01')인 것만.
     *
     * <p>[2026-09-05] 2026-09-02 커밋(7ec5e25fd)이 <b>목록</b>에서 같은 결함을 고쳤다 — 관리자·사용자
     * 컨트롤러가 같은 메서드를 불러 논리 삭제된 커뮤니티가 사용자에게 보였고, 사용자용
     * {@link #getActiveCommunityList} 를 분리했다. 그런데 <b>상세는 손대지 않아</b> 사용자 상세가
     * 여전히 {@link #getCommunity}(무필터 findById) 를 불렀다. cmntySn 을 직접 지정하면 관리자가
     * '삭제' 한 커뮤니티가 그대로 열리고, 응답에 개설자 loginId({@code frstRgtrId})가 실린다.
     *
     * <p><b>{@link #getCommunity} 안에 필터를 넣지 않은 이유</b>는 목록 때와 같다(H3) — 관리자 상세
     * ({@code admin/.../CommunityApiController}) 도 같은 메서드를 쓰며, 관리자가 중지된 커뮤니티를
     * 되살리거나 정리하려면 그것을 열 수 있어야 한다. 사용자 경로만 이 메서드로 갈아 끼운다.
     *
     * <p>없는 것과 감춰진 것을 구분하지 않고 둘 다 {@code RESOURCE_NOT_FOUND} 로 답한다 —
     * 존재 여부 자체가 정보가 되지 않게 하기 위해서다.
     */
    public CommunityDto getActiveCommunity(Long cmntySn) {
        return communityRepository.findById(Objects.requireNonNull(cmntySn))
                .filter(community -> "Y".equals(community.getUseYn()) && "REGC01".equals(community.getRegSeCd()))
                .map(CommunityDto::from)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "커뮤니티를 찾을 수 없습니다: " + cmntySn));
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
            // [2026-08-28] '처리 중입니다' 를 걷어냈다 — 아무도 처리하지 않는다.
            //   아래 mbrSttsCd='A'(Requested) 는 저장소 어디에서도 읽히거나 다른 상태로
            //   옮겨지지 않는다(승인 엔드포인트·화면 부재). 진행 중인 절차가 있는 것처럼
            //   말하면 사용자는 기다리다 다시 눌러 같은 409 를 받는다.
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 가입했거나 가입을 신청한 상태입니다.");
        }

        CommunityUser communityUser = CommunityUser.builder()
                .id(id)
                // A: Requested. ⚠ 이 값을 읽거나 전이시키는 코드가 아직 없다 — 승인 절차 미구현.
                .mbrSttsCd("A")
                .mngrYn("N")
                .joinYmd(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                .useYn("Y")
                .build();

        communityUserRepository.save(communityUser);
    }
}
