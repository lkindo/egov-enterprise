package com.company.project.service.cmy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.community.Community;
import com.company.project.domain.community.CommunityRepository;
import com.company.project.domain.community.CommunityUserRepository;
import com.company.project.service.cmy.dto.CommunityDto;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

        @InjectMocks
        private CommunityServiceImpl communityService;

        @Mock
        private CommunityRepository communityRepository;

        @Mock
        private CommunityUserRepository communityUserRepository;

        @Test
        @DisplayName("커뮤니티 생성")
        void createCommunity() {
                // Given
                String userId = "USR-001";
                CommunityDto dto = CommunityDto.builder()
                                .cmmntyNm("Test Community")
                                .cmmntyIntrcn("Description")
                                .tmplatId("TMP-001")
                                .build();

                // Mock save
                when(communityRepository.save(any(Community.class))).thenAnswer(invocation -> {
                        Community c = invocation.getArgument(0);
                        return c;
                });

                // When
                CommunityDto created = communityService.createCommunity(userId, dto);

                // Then
                assertThat(created).isNotNull();
                assertThat(created.getCmmntyNm()).isEqualTo("Test Community");

                verify(communityRepository).save(any(Community.class));
        }

        @Test
        @DisplayName("커뮤니티 수정")
        void updateCommunity() {
                // Given
                String userId = "USR-001";
                String cmmntyId = "CMMNTY_001";
                Community community = Community.builder()
                                .cmmntyId(cmmntyId)
                                .cmmntyNm("Original")
                                .useAt("Y")
                                .build();

                CommunityDto updateDto = CommunityDto.builder()
                                .cmmntyId(cmmntyId)
                                .cmmntyNm("Updated Community")
                                .cmmntyIntrcn("Updated Desc")
                                .tmplatId("TMP-002")
                                .useAt("Y")
                                .build();

                when(communityRepository.findById(cmmntyId)).thenReturn(Optional.of(community));

                // When
                communityService.updateCommunity(userId, updateDto);

                // Then
                assertThat(community.getCmmntyNm()).isEqualTo("Updated Community");
                assertThat(community.getCmmntyIntrcn()).isEqualTo("Updated Desc");
        }
}
