package com.company.project.service.system.content.community;

import com.company.project.domain.system.content.community.Community;
import com.company.project.domain.system.content.community.CommunityRepository;
import com.company.project.service.system.content.community.dto.CommunityDto;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommunityService 테스트")
class CommunityServiceTest {

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private JPAQueryFactory queryFactory;

    @Mock
    private EgovIdGnrService egovCmmntyIdGnrService;

    @InjectMocks
    private CommunityServiceImpl communityService;

    @Test
    @DisplayName("커뮤니티 상세 조회 성공")
    void getCommunity_Success() {
        // Given
        Community community = Community.builder().cmmntyId("C1").cmmntyNm("Name").build();
        given(communityRepository.findById("C1")).willReturn(Optional.of(community));

        // When
        CommunityDto result = communityService.getCommunity("C1");

        // Then
        assertNotNull(result);
        assertEquals("C1", result.getCmmntyId());
    }

    @Test
    @DisplayName("커뮤니티 등록 성공")
    void createCommunity_Success() throws Exception {
        // Given
        CommunityDto dto = CommunityDto.builder().cmmntyNm("New").build();
        given(egovCmmntyIdGnrService.getNextStringId()).willReturn("C1");
        given(communityRepository.save(any(Community.class))).willAnswer(i -> i.getArgument(0));

        // When
        CommunityDto result = communityService.createCommunity("user", dto);

        // Then
        assertNotNull(result);
        assertEquals("C1", result.getCmmntyId());
        verify(communityRepository).save(any(Community.class));
    }

    @Test
    @DisplayName("커뮤니티 수정 성공")
    void updateCommunity_Success() {
        // Given
        Community community = Community.builder().cmmntyId("C1").cmmntyNm("Old").build();
        given(communityRepository.findById("C1")).willReturn(Optional.of(community));

        CommunityDto dto = CommunityDto.builder().cmmntyId("C1").cmmntyNm("Updated").build();

        // When
        communityService.updateCommunity("user", dto);

        // Then
        assertEquals("Updated", community.getCmmntyNm());
    }

    @Test
    @DisplayName("커뮤니티 삭제 성공")
    void deleteCommunity_Success() {
        // Given
        Community community = mock(Community.class);
        given(communityRepository.findById("C1")).willReturn(Optional.of(community));

        // When
        communityService.deleteCommunity("C1", "user");

        // Then
        verify(community).delete("user");
    }
}
