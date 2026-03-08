package com.company.project.service.anniversary;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.anniversary.Anniversary;
import com.company.project.domain.anniversary.AnniversaryRepository;
import com.company.project.service.anniversary.dto.AnniversaryDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnniversaryService 테스트")
class AnniversaryServiceTest {

    @Mock
    private AnniversaryRepository anniversaryRepository;

    @InjectMocks
    private AnniversaryService anniversaryService;

    @Nested
    @DisplayName("기념일 목록 조회 테스트")
    class GetAnniversaryListTests {

        @Test
        @DisplayName("키워드 없이 전체 기념일 목록 페이징 조회 성공")
        void testGetAnniversaryList_NoKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Anniversary anniv1 = createMockAnniversary("ANN_001", "기념일 1");
            Anniversary anniv2 = createMockAnniversary("ANN_002", "기념일 2");
            Page<Anniversary> page = new PageImpl<>(Arrays.asList(anniv1, anniv2));

            when(anniversaryRepository.findAll(pageable)).thenReturn(page);

            // When
            Page<AnniversaryDto> result = anniversaryService.getAnniversaryList(null, pageable);

            // Then
            assertNotNull(result);
            assertEquals(2, result.getContent().size());
            verify(anniversaryRepository, times(1)).findAll(pageable);
        }

        @Test
        @DisplayName("키워드로 기념일 검색 성공")
        void testGetAnniversaryList_WithKeyword() {
            // Given
            String keyword = "생일";
            Pageable pageable = PageRequest.of(0, 10);
            Anniversary anniv = createMockAnniversary("ANN_001", "생일 기념일");
            Page<Anniversary> page = new PageImpl<>(List.of(anniv));

            when(anniversaryRepository.findByAnnvrsryNmContaining(keyword, pageable)).thenReturn(page);

            // When
            Page<AnniversaryDto> result = anniversaryService.getAnniversaryList(keyword, pageable);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            verify(anniversaryRepository, times(1)).findByAnnvrsryNmContaining(keyword, pageable);
        }
    }

    @Nested
    @DisplayName("내 기념일 목록 조회 테스트")
    class GetMyAnniversaryListTests {

        @Test
        @DisplayName("사용자 ID 로 내 기념일 목록 조회 성공")
        void testGetMyAnniversaryList_Success() {
            // Given
            String userId = "user1";
            Pageable pageable = PageRequest.of(0, 10);
            Anniversary anniv = createMockAnniversary("ANN_001", "내 기념일");
            Page<Anniversary> page = new PageImpl<>(List.of(anniv));

            when(anniversaryRepository.findByUsid(userId, pageable)).thenReturn(page);

            // When
            Page<AnniversaryDto> result = anniversaryService.getMyAnniversaryList(userId, pageable);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            verify(anniversaryRepository, times(1)).findByUsid(userId, pageable);
        }

        @Test
        @DisplayName("null 사용자 ID 로 조회 시 NullPointerException 발생")
        void testGetMyAnniversaryList_NullUserId() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);

            // When & Then
            assertThrows(NullPointerException.class, () -> {
                anniversaryService.getMyAnniversaryList(null, pageable);
            });
        }
    }

    @Nested
    @DisplayName("개별 기념일 조회 테스트")
    class GetAnniversaryTests {

        @Test
        @DisplayName("기념일 ID 로 단일 기념일 조회 성공")
        void testGetAnniversary_Success() {
            // Given
            String annId = "ANN_001";
            Anniversary anniv = createMockAnniversary(annId, "조회된 기념일");

            when(anniversaryRepository.findById(annId)).thenReturn(Optional.of(anniv));

            // When
            AnniversaryDto result = anniversaryService.getAnniversary(annId);

            // Then
            assertNotNull(result);
            assertEquals(annId, result.getAnnId());
        }

        @Test
        @DisplayName("존재하지 않는 기념일 조회 시 예외 발생")
        void testGetAnniversary_NotFound() {
            // Given
            String annId = "NOT_EXIST";
            when(anniversaryRepository.findById(annId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                anniversaryService.getAnniversary(annId);
            });
        }
    }

    @Nested
    @DisplayName("기념일 생성 테스트")
    class InsertAnniversaryTests {

        @Test
        @DisplayName("새로운 기념일 생성 성공")
        void testInsertAnniversary_Success() {
            // Given
            String userId = "user1";
            AnniversaryDto dto = AnniversaryDto.builder()
                    .annvrsrySe("01")
                    .annvrsryNm("새 기념일")
                    .annvrsryDe("20240101")
                    .cldrSe("0")
                    .annvrsrySetup("Y")
                    .reptitAt("N")
                    .build();

            doAnswer(invocation -> {
                Anniversary entity = invocation.getArgument(0);
                ReflectionTestUtils.setField(entity, "annId", "ANN_TEST");
                return entity;
            }).when(anniversaryRepository).save(any(Anniversary.class));

            // When
            anniversaryService.insertAnniversary(userId, dto);

            // Then
            verify(anniversaryRepository, times(1)).save(any(Anniversary.class));
        }

        @Test
        @DisplayName("기념일 생성 시 사용자 ID 가 저장됨")
        void testInsertAnniversary_WithUserId() {
            // Given
            String userId = "admin";
            AnniversaryDto dto = AnniversaryDto.builder()
                    .annvrsryNm("기념일")
                    .annvrsryDe("20240101")
                    .build();

            // When
            anniversaryService.insertAnniversary(userId, dto);

            // Then
            verify(anniversaryRepository, times(1)).save(argThat(anniversary -> "admin".equals(anniversary.getUsid())));
        }
    }

    @Nested
    @DisplayName("기념일 수정 테스트")
    class UpdateAnniversaryTests {

        @Test
        @DisplayName("기념일 정보 수정 성공")
        void testUpdateAnniversary_Success() {
            // Given
            String annId = "ANN_001";
            String userId = "updater";
            AnniversaryDto dto = AnniversaryDto.builder()
                    .annvrsrySe("02")
                    .annvrsryNm("수정된 기념일")
                    .annvrsryDe("20240202")
                    .cldrSe("1")
                    .build();

            Anniversary existing = createMockAnniversary(annId, "원래 기념일");

            when(anniversaryRepository.findById(annId)).thenReturn(Optional.of(existing));

            // When
            anniversaryService.updateAnniversary(annId, userId, dto);

            // Then
            verify(anniversaryRepository, times(1)).findById(annId);
            assertEquals("수정된 기념일", existing.getAnnvrsryNm());
            assertEquals("20240202", existing.getAnnvrsryDe());
        }

        @Test
        @DisplayName("존재하지 않는 기념일 수정 시 예외 발생")
        void testUpdateAnniversary_NotFound() {
            // Given
            String annId = "NOT_EXIST";
            AnniversaryDto dto = AnniversaryDto.builder().build();
            when(anniversaryRepository.findById(annId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                anniversaryService.updateAnniversary(annId, "user", dto);
            });
        }
    }

    @Nested
    @DisplayName("기념일 삭제 테스트")
    class DeleteAnniversaryTests {

        @Test
        @DisplayName("기념일 삭제 성공")
        void testDeleteAnniversary_Success() {
            // Given
            String annId = "ANN_001";
            doNothing().when(anniversaryRepository).deleteById(annId);

            // When
            anniversaryService.deleteAnniversary(annId);

            // Then
            verify(anniversaryRepository, times(1)).deleteById(annId);
        }

        @Test
        @DisplayName("null 기념일 ID 로 삭제 시 NullPointerException 발생")
        void testDeleteAnniversary_NullId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                anniversaryService.deleteAnniversary(null);
            });
        }
    }

    @Nested
    @DisplayName("기념일 중복 확인 테스트")
    class CheckAnniversaryDuplicateTests {

        @Test
        @DisplayName("새 기념일 중복 확인 - 중복 없음")
        void testCheckAnniversaryDuplicate_NoDuplicate() {
            // Given
            String userId = "user1";
            String annvrsryDe = "20240101";
            String annvrsryNm = "기념일";
            String annId = null;

            when(anniversaryRepository.countByUsidAndAnnvrsryDeAndAnnvrsryNm(userId, annvrsryDe, annvrsryNm))
                    .thenReturn(0L);

            // When
            int result = anniversaryService.checkAnniversaryDuplicate(userId, annvrsryDe, annvrsryNm, annId);

            // Then
            assertEquals(0, result);
        }

        @Test
        @DisplayName("기존 기념일 수정 시 중복 확인 - 중복 없음")
        void testCheckAnniversaryDuplicate_UpdateNoDuplicate() {
            // Given
            String userId = "user1";
            String annvrsryDe = "20240101";
            String annvrsryNm = "기념일";
            String annId = "ANN_001";

            when(anniversaryRepository.countByUsidAndAnnvrsryDeAndAnnvrsryNmAndAnnIdNot(
                    userId, annvrsryDe, annvrsryNm, annId)).thenReturn(0L);

            // When
            int result = anniversaryService.checkAnniversaryDuplicate(userId, annvrsryDe, annvrsryNm, annId);

            // Then
            assertEquals(0, result);
        }
    }

    // Helper method to create mock Anniversary entity
    private Anniversary createMockAnniversary(String annId, String annvrsryNm) {
        return Anniversary.builder()
                .annId(annId)
                .usid("user1")
                .annvrsrySe("01")
                .annvrsryNm(annvrsryNm)
                .annvrsryDe("20240101")
                .cldrSe("0")
                .annvrsrySetup("Y")
                .reptitAt("N")
                .build();
    }
}
