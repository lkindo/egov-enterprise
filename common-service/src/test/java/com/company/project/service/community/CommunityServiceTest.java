package com.company.project.service.community;

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
import com.company.project.domain.community.CommunityUser;
import com.company.project.domain.community.CommunityUserId;
import com.company.project.domain.community.CommunityUserRepository;
import com.company.project.service.community.dto.CommunityDto;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

        @InjectMocks
        private CommunityService communityService;

        @Mock
        private CommunityRepository communityRepository;

        @Mock
        private CommunityUserRepository communityUserRepository;

        @Test
        @DisplayName("커뮤니티 생성 및 관리자 자동 가입")
        void createCommunity() {
                // Given
                String userId = "USR-001";
                CommunityDto dto = CommunityDto.builder()
                                .cmmntyNm("Test Community")
                                .cmmntyIntrcn("Description")
                                .registSeCode("REGC01")
                                .tmplatId("TMP-001")
                                .build();

                // Mock save
                when(communityRepository.save(any(Community.class))).thenAnswer(invocation -> {
                        Community c = invocation.getArgument(0);
                        return c; // Return same object as if saved
                });

                // When
                CommunityDto created = communityService.createCommunity(userId, dto);

                // Then
                assertThat(created).isNotNull();
                assertThat(created.getCmmntyId()).startsWith("CMMNTY_");
                assertThat(created.getCmmntyNm()).isEqualTo("Test Community");

                // Verify Repository calls
                verify(communityRepository).save(any(Community.class));
                verify(communityUserRepository).save(any(CommunityUser.class));
        }

        @Test
        @DisplayName("커뮤니티 수정")
        void updateCommunity() {
                // Given
                String userId = "USR-001";
                String cmmntyId = "CMMNTY_001";
                Community community = Community.builder()
                                .id(cmmntyId)
                                .cmmntyNm("Original")
                                .useAt("Y")
                                .build();

                CommunityDto updateDto = CommunityDto.builder()
                                .cmmntyNm("Updated Community")
                                .cmmntyIntrcn("Updated Desc")
                                .tmplatId("TMP-002")
                                .build();

                when(communityRepository.findById(cmmntyId)).thenReturn(Optional.of(community));
                when(communityUserRepository.existsByCmmntyIdAndEmplyrIdAndMngrAtAndUseAt(cmmntyId, userId, "Y", "Y"))
                                .thenReturn(true);

                // When
                communityService.updateCommunity(cmmntyId, userId, updateDto);

                // Then
                assertThat(community.getCmmntyNm()).isEqualTo("Updated Community");
                assertThat(community.getCmmntyIntrcn()).isEqualTo("Updated Desc");
        }

        @Test
        @DisplayName("커뮤니티 가입 및 탈퇴")
        void joinAndLeave() {
                // Given
                String cmmntyId = "CMMNTY_001";
                String memberId = "USER-002";

                // Join
                when(communityUserRepository.existsById(new CommunityUserId(cmmntyId, memberId))).thenReturn(false);
                communityService.joinCommunity(cmmntyId, memberId);
                verify(communityUserRepository).save(any(CommunityUser.class));

                // Leave
                CommunityUser user = CommunityUser.builder()
                                .cmmntyId(cmmntyId)
                                .emplyrId(memberId)
                                .mngrAt("N")
                                .mberSttus("A")
                                .useAt("Y")
                                .build();
                when(communityUserRepository.findById(new CommunityUserId(cmmntyId, memberId)))
                                .thenReturn(Optional.of(user));

                communityService.leaveCommunity(cmmntyId, memberId);
                assertThat(user.getUseAt()).isEqualTo("N");
                assertThat(user.getMberSttus()).isEqualTo("D");
        }

        @Test
        @DisplayName("관리자 기능: 승인, 강제 탈퇴, 승격")
        void adminActions() {
                // Given
                String adminId = "ADMIN-01";
                String userId = "USER-02";
                String cmmntyId = "CMMNTY_01";

                CommunityUser user = CommunityUser.builder()
                                .cmmntyId(cmmntyId)
                                .emplyrId(userId)
                                .mngrAt("N")
                                .mberSttus("P")
                                .useAt("Y")
                                .build();

                // Admin check mock
                when(communityUserRepository.existsByCmmntyIdAndEmplyrIdAndMngrAtAndUseAt(cmmntyId, adminId, "Y", "Y"))
                                .thenReturn(true);
                when(communityUserRepository.findById(new CommunityUserId(cmmntyId, userId)))
                                .thenReturn(Optional.of(user));

                // Approve
                communityService.approveCommunityUser(cmmntyId, userId, adminId);
                assertThat(user.getMberSttus()).isEqualTo("A");

                // Promote
                communityService.grantManagerRole(cmmntyId, userId, adminId);
                assertThat(user.getMngrAt()).isEqualTo("Y");

                // Demote
                communityService.revokeManagerRole(cmmntyId, userId, adminId);
                assertThat(user.getMngrAt()).isEqualTo("N");

                // Kick
                communityService.kickCommunityUser(cmmntyId, userId, adminId);
                assertThat(user.getMberSttus()).isEqualTo("D");
        }
}
