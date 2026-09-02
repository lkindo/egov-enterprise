package nuri.business.service.system.content.community;

import nuri.business.domain.system.content.community.Community;
import nuri.business.domain.system.content.community.CommunityRepository;
import nuri.business.domain.system.content.community.QCommunity;
import nuri.business.service.system.content.community.dto.CommunityDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.core.types.Expression;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("CommunityService 단위 테스트")
class CommunityServiceImplTest {

    @InjectMocks
    private CommunityService communityService;

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private JPAQueryFactory queryFactory;
    
    @Mock
    private JPAQuery<Community> jpaQuery;

    @Mock
    private JPAQuery<Long> countQuery;

    @Test
    @DisplayName("커뮤니티 생성 - 성공")
    void createCommunity() throws Exception {
        // given
        String userId = "user1";
        CommunityDto dto = CommunityDto.builder()
                .cmntyNm("Test Community")
                .cmntyIntroCn("Description")
                .tmpltId("TMP_01")
                .build();

        given(communityRepository.save(any(Community.class))).willAnswer(inv -> {
            Community saved = inv.getArgument(0);
            ReflectionTestUtils.setField(saved, "cmntySn", 101L);
            return saved;
        });

        // when
        CommunityDto created = communityService.createCommunity(userId, dto);

        // then
        assertThat(created).isNotNull();
        assertThat(created.getCmntySn()).isEqualTo(101L);
        assertThat(created.getCmntyNm()).isEqualTo("Test Community");
        verify(communityRepository, times(1)).save(any(Community.class));
    }

    @Test
    @DisplayName("커뮤니티 단건 조회 - 성공")
    void getCommunity() {
        // given
        Community community = Community.builder()
                .cmntySn(101L)
                .cmntyNm("Test Community")
                .build();
        given(communityRepository.findById(101L)).willReturn(Optional.of(community));

        // when
        CommunityDto found = communityService.getCommunity(101L);
        
        // then
        assertThat(found).isNotNull();
        assertThat(found.getCmntyNm()).isEqualTo("Test Community");
    }

    @Test
    @DisplayName("커뮤니티 상세 미존재는 404 도메인 오류")
    void getCommunityNotFound() {
        given(communityRepository.findById(404L)).willReturn(Optional.empty());

        nuri.foundation.core.exception.BusinessException error =
                org.junit.jupiter.api.Assertions.assertThrows(
                        nuri.foundation.core.exception.BusinessException.class,
                        () -> communityService.getCommunity(404L));

        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND,
                error.getErrorCode());
    }

    @Test
    @DisplayName("커뮤니티 목록 조회 - 성공")
    void getCommunityList() {
        // given
        Community community = Community.builder().cmntySn(101L).cmntyNm("Comm A").build();
        Pageable pageable = PageRequest.of(0, 10);

        given(queryFactory.<Community>selectFrom(any())).willReturn(jpaQuery);
        given(jpaQuery.where(any(BooleanBuilder.class))).willReturn(jpaQuery);
        given(jpaQuery.offset(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.limit(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.orderBy(any(OrderSpecifier.class))).willReturn(jpaQuery);
        given(jpaQuery.fetch()).willReturn(List.of(community));
        given(queryFactory.select(org.mockito.ArgumentMatchers.<Expression<Long>>any())).willReturn(countQuery);
        given(countQuery.from(QCommunity.community)).willReturn(countQuery);
        given(countQuery.where(any(BooleanBuilder.class))).willReturn(countQuery);
        given(countQuery.fetchOne()).willReturn(1L);

        // when
        Page<CommunityDto> result = communityService.getCommunityList("0", "Comm", pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCmntySn()).isEqualTo(101L);
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(countQuery).fetchOne();
        verify(countQuery, never()).fetch();
        verify(jpaQuery, times(1)).fetch();
    }

    /*
     * [2026-09-02] 관리자 목록과 사용자 목록의 필터가 갈린다.
     *
     * 종전에는 두 컨트롤러가 같은 메서드를 불렀고 regSeCd 만 걸려서, 관리자가 논리 삭제(useYn='N')한
     * 커뮤니티가 일반 사용자 목록에 그대로 남았다. 저장소가 목이라 실행 결과로는 검증할 수 없으므로
     * 질의에 실린 술어(BooleanBuilder)를 붙잡아 문자열로 대조한다 — QueryDSL 은
     * "community.useYn = Y" 형태로 직렬화한다.
     */
    private String capturedWherePredicate(Runnable call) {
        given(queryFactory.<Community>selectFrom(any())).willReturn(jpaQuery);
        given(jpaQuery.where(any(BooleanBuilder.class))).willReturn(jpaQuery);
        given(jpaQuery.offset(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.limit(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.orderBy(any(OrderSpecifier.class))).willReturn(jpaQuery);
        given(jpaQuery.fetch()).willReturn(List.of());
        given(queryFactory.select(org.mockito.ArgumentMatchers.<Expression<Long>>any())).willReturn(countQuery);
        given(countQuery.from(QCommunity.community)).willReturn(countQuery);
        given(countQuery.where(any(BooleanBuilder.class))).willReturn(countQuery);
        given(countQuery.fetchOne()).willReturn(0L);

        call.run();

        org.mockito.ArgumentCaptor<BooleanBuilder> captor = org.mockito.ArgumentCaptor.forClass(BooleanBuilder.class);
        verify(jpaQuery).where(captor.capture());
        return String.valueOf(captor.getValue());
    }

    @Test
    @DisplayName("사용자 목록은 사용 중(useYn='Y')인 커뮤니티만 조회한다")
    void getActiveCommunityList_filtersOutLogicallyDeleted() {
        String predicate = capturedWherePredicate(
                () -> communityService.getActiveCommunityList(null, null, PageRequest.of(0, 10)));

        assertThat(predicate).contains("useYn = Y");
    }

    /** 관리자는 중지된 커뮤니티를 되살리거나 정리해야 하므로 전체를 본다(H3 — 의미 보존). */
    @Test
    @DisplayName("관리자 목록은 사용 중지된 커뮤니티도 포함한다 — useYn 술어가 없다")
    void getCommunityList_keepsLogicallyDeletedForAdmin() {
        String predicate = capturedWherePredicate(
                () -> communityService.getCommunityList(null, null, PageRequest.of(0, 10)));

        assertThat(predicate).doesNotContain("useYn");
    }
    
    @Test
    @DisplayName("커뮤니티 수정 - 성공")
    void updateCommunity() {
        // given
        Community community = Community.builder()
                .cmntySn(101L)
                .cmntyNm("Comm A")
                .build();
        given(communityRepository.findById(101L)).willReturn(Optional.of(community));
        
        CommunityDto updateDto = CommunityDto.builder()
                .cmntySn(101L)
                .cmntyNm("Updated Comm")
                .build();

        // when
        communityService.updateCommunity("user1", updateDto);
        
        // then
        assertThat(community.getCmntyNm()).isEqualTo("Updated Comm");
    }
    
    @Test
    @DisplayName("커뮤니티 삭제 (논리 삭제) - 성공")
    void deleteCommunity() {
        // given
        Community community = Community.builder()
                .cmntySn(101L)
                .useYn("Y")
                .build();
        given(communityRepository.findById(101L)).willReturn(Optional.of(community));
        
        // when
        communityService.deleteCommunity(101L, "user1");
        
        // then
        assertThat(community.getUseYn()).isEqualTo("N");
    }
    
    @Test
    @DisplayName("포틀릿용 커뮤니티 목록 조회 - 성공")
    void getCommunityListPortlet() {
        // given
        Community community = Community.builder().cmntySn(101L).build();
        given(queryFactory.<Community>selectFrom(any())).willReturn(jpaQuery);
        given(jpaQuery.where(any(BooleanExpression.class))).willReturn(jpaQuery);
        given(jpaQuery.orderBy(any(OrderSpecifier.class))).willReturn(jpaQuery);
        given(jpaQuery.fetch()).willReturn(List.of(community));
        
        // when
        List<CommunityDto> list = communityService.getCommunityListPortlet();
        
        // then
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getCmntySn()).isEqualTo(101L);
    }

    @Mock
    private nuri.business.domain.system.content.community.CommunityUserRepository communityUserRepository;

    @Test
    @DisplayName("커뮤니티 가입 신청 - 성공")
    void joinCommunity() {
        // given
        Long cmntySn = 101L;
        String userId = "user1";
        Community community = Community.builder()
                .cmntySn(cmntySn)
                .useYn("Y")
                .build();
        given(communityRepository.findById(cmntySn)).willReturn(Optional.of(community));
        given(communityUserRepository.existsById(any())).willReturn(false);

        // when
        communityService.joinCommunity(cmntySn, userId);

        // then
        verify(communityUserRepository, times(1)).save(any());
    }

    /**
     * 중복 가입 안내가 진행 중인 절차를 지어내지 않는다.
     *
     * <p>종전 문구는 "이미 가입했거나 가입 요청이 <b>처리 중</b>입니다" 였다. 처리하는 주체가
     * 없다 — 가입이 만드는 {@code mbrSttsCd='A'}(Requested) 를 읽거나 다른 상태로 옮기는
     * 코드가 저장소 전체에 없고, 승인 엔드포인트·화면·회원 목록 API 도 없다. 진행 중인
     * 절차가 있는 것처럼 말하면 사용자는 기다리다 다시 눌러 같은 409 를 받는다.
     */
    @Test
    @DisplayName("커뮤니티 가입 신청 - 중복은 409 이고, 없는 처리 절차를 지어내지 않는다")
    void joinCommunityRejectsDuplicateWithoutInventingProcess() {
        Long cmntySn = 101L;
        Community community = Community.builder()
                .cmntySn(cmntySn)
                .useYn("Y")
                .build();
        given(communityRepository.findById(cmntySn)).willReturn(Optional.of(community));
        given(communityUserRepository.existsById(any())).willReturn(true);

        nuri.foundation.core.exception.BusinessException thrown =
                org.junit.jupiter.api.Assertions.assertThrows(
                        nuri.foundation.core.exception.BusinessException.class,
                        () -> communityService.joinCommunity(cmntySn, "user1"));

        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.DUPLICATE_RESOURCE, thrown.getErrorCode());
        org.junit.jupiter.api.Assertions.assertFalse(thrown.getMessage().contains("처리 중"),
                "아무도 처리하지 않는 상태를 '처리 중'이라고 부르면 안 된다");
        verify(communityUserRepository, org.mockito.Mockito.never()).save(any());
    }
}
