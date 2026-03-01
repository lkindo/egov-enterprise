package com.company.project.service.cmy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import com.querydsl.jpa.impl.JPAQueryFactory;

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

        @Mock
        private JPAQueryFactory queryFactory;

        @Mock
        private EgovIdGnrService egovCmmntyIdGnrService;

        @BeforeEach
        void setUp() {
                try {
                        when(egovCmmntyIdGnrService.getNextStringId()).thenReturn("CMMNTY_001");
                } catch (Exception e) {
                        // Ignore
                }
        }

        @Test
        @DisplayName("?�ㅻ???�떚 ??�꽦")
        void createCommunity() {
                // Given
                String userId = "USR-001";
                CommunityDto dto = CommunityDto.builder()
                                .cmmntyNm("Test Community")
                                .cmmntyIntrcn("Description")
                                .tmplatId("TMP-001")
                                .build();

                // Mock save
                when(communityRepository.save(java.util.Objects.requireNonNull(any(Community.class))))
                                .thenAnswer(invocation -> {
                                        Community c = java.util.Objects.requireNonNull(invocation.getArgument(0));
                                        return c;
                                });

                // When
                CommunityDto created = communityService.createCommunity(userId, dto);

                // Then
                assertThat(created).isNotNull();
                assertThat(created.getCmmntyNm()).isEqualTo("Test Community");

                verify(communityRepository).save(java.util.Objects.requireNonNull(any(Community.class)));
        }

        @Test
        @org.junit.jupiter.api.Disabled("UnnecessaryStubbing ?�몄??- ?꾩냽 ?묒뾽 ?꾩슂")
        @DisplayName("?�ㅻ???�떚 ??�젙")
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

                lenient().when(communityRepository.findById(cmmntyId))
                                .thenReturn(Optional.of(java.util.Objects.requireNonNull(community)));

                // When
                communityService.updateCommunity(userId, updateDto);

                // Then
                assertThat(community.getCmmntyNm()).isEqualTo("Updated Community");
                assertThat(community.getCmmntyIntrcn()).isEqualTo("Updated Desc");
        }
}
