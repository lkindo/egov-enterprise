package nuri.business.service.system.content.community;

import nuri.business.domain.system.content.community.Community;
import nuri.business.domain.system.content.community.CommunityRepository;
import nuri.business.service.system.content.community.dto.CommunityDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("CommunityServiceImpl 단위 테스트")
class CommunityServiceImplTest {

    @InjectMocks
    private CommunityServiceImpl communityService;

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private JPAQueryFactory queryFactory;
    
    @Mock
    private JPAQuery<Community> jpaQuery;

    @Mock
    private EgovIdGnrService egovCmmntyIdGnrService;

    @Test
    @DisplayName("커뮤니티 생성 - 성공")
    void createCommunity() throws Exception {
        // given
        String userId = "user1";
        CommunityDto dto = CommunityDto.builder()
                .cmntyTtl("Test Community")
                .cmntyIntroCn("Description")
                .tmpltId("TMP_01")
                .build();
        
        given(egovCmmntyIdGnrService.getNextStringId()).willReturn("CMMNTY_01");
        given(communityRepository.save(any(Community.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        CommunityDto created = communityService.createCommunity(userId, dto);
        
        // then
        assertThat(created).isNotNull();
        assertThat(created.getCmntyId()).isEqualTo("CMMNTY_01");
        assertThat(created.getCmntyTtl()).isEqualTo("Test Community");
        verify(communityRepository, times(1)).save(any(Community.class));
    }

    @Test
    @DisplayName("커뮤니티 단건 조회 - 성공")
    void getCommunity() {
        // given
        Community community = Community.builder()
                .cmntyId("CMMNTY_01")
                .cmntyTtl("Test Community")
                .build();
        given(communityRepository.findById("CMMNTY_01")).willReturn(Optional.of(community));

        // when
        CommunityDto found = communityService.getCommunity("CMMNTY_01");
        
        // then
        assertThat(found).isNotNull();
        assertThat(found.getCmntyTtl()).isEqualTo("Test Community");
    }

    @Test
    @DisplayName("커뮤니티 목록 조회 - 성공")
    void getCommunityList() {
        // given
        Community community = Community.builder().cmntyId("CMMNTY_01").cmntyTtl("Comm A").build();
        Pageable pageable = PageRequest.of(0, 10);

        given(queryFactory.<Community>selectFrom(any())).willReturn(jpaQuery);
        given(jpaQuery.where(any(BooleanBuilder.class))).willReturn(jpaQuery);
        given(jpaQuery.offset(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.limit(any(Long.class))).willReturn(jpaQuery);
        given(jpaQuery.orderBy(any(OrderSpecifier.class))).willReturn(jpaQuery);
        given(jpaQuery.fetch()).willReturn(List.of(community));

        // when
        Page<CommunityDto> result = communityService.getCommunityList("0", "Comm", pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCmntyId()).isEqualTo("CMMNTY_01");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
    
    @Test
    @DisplayName("커뮤니티 수정 - 성공")
    void updateCommunity() {
        // given
        Community community = Community.builder()
                .cmntyId("CMMNTY_01")
                .cmntyTtl("Comm A")
                .build();
        given(communityRepository.findById("CMMNTY_01")).willReturn(Optional.of(community));
        
        CommunityDto updateDto = CommunityDto.builder()
                .cmntyId("CMMNTY_01")
                .cmntyTtl("Updated Comm")
                .build();

        // when
        communityService.updateCommunity("user1", updateDto);
        
        // then
        assertThat(community.getCmntyTtl()).isEqualTo("Updated Comm");
    }
    
    @Test
    @DisplayName("커뮤니티 삭제 (논리 삭제) - 성공")
    void deleteCommunity() {
        // given
        Community community = Community.builder()
                .cmntyId("CMMNTY_01")
                .useYn("Y")
                .build();
        given(communityRepository.findById("CMMNTY_01")).willReturn(Optional.of(community));
        
        // when
        communityService.deleteCommunity("CMMNTY_01", "user1");
        
        // then
        assertThat(community.getUseYn()).isEqualTo("N");
    }
    
    @Test
    @DisplayName("포틀릿용 커뮤니티 목록 조회 - 성공")
    void getCommunityListPortlet() {
        // given
        Community community = Community.builder().cmntyId("CMMNTY_01").build();
        given(queryFactory.<Community>selectFrom(any())).willReturn(jpaQuery);
        given(jpaQuery.where(any(BooleanExpression.class))).willReturn(jpaQuery);
        given(jpaQuery.orderBy(any(OrderSpecifier.class))).willReturn(jpaQuery);
        given(jpaQuery.fetch()).willReturn(List.of(community));
        
        // when
        List<CommunityDto> list = communityService.getCommunityListPortlet();
        
        // then
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getCmntyId()).isEqualTo("CMMNTY_01");
    }

    @Mock
    private nuri.business.domain.system.content.community.CommunityUserRepository communityUserRepository;

    @Test
    @DisplayName("커뮤니티 가입 신청 - 성공")
    void joinCommunity() {
        // given
        String cmmntyId = "CMMNTY_01";
        String userId = "user1";
        Community community = Community.builder()
                .cmntyId(cmmntyId)
                .useYn("Y")
                .build();
        given(communityRepository.findById(cmmntyId)).willReturn(Optional.of(community));
        given(communityUserRepository.existsById(any())).willReturn(false);

        // when
        communityService.joinCommunity(cmmntyId, userId);

        // then
        verify(communityUserRepository, times(1)).save(any());
    }
}
