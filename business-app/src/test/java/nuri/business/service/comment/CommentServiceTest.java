package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.domain.comment.exception.CommentErrorCode;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @InjectMocks
    private CommentService commentService;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private nuri.foundation.core.community.CommunityBoardAccessPort communityBoardAccess;

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "owner-login, true, false, true",
            "different-login, true, false, false",
            "different-login, true, true, true",
            "owner-login, false, true, false"
    })
    @DisplayName("댓글 작업 플래그는 로그인 ID 소유권과 정확한 기본·대리 권한을 함께 판정한다")
    void actionFlagsMatchOwnerAndPermissions(String loginId, boolean basePermission, boolean allPermission, boolean expected) {
        Comment comment = Comment.builder().ansSn(1L).pstSn(1L).bbsId("BBS_01")
                .wrterId("different-internal-key").ansCn("본문").useYn("Y").build();
        comment.setFrstRgtrId("owner-login");
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.of(loginId));
        for (String permission : java.util.List.of("COMMENT_UPDATE", "COMMENT_DELETE")) {
            __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(permission)).thenReturn(basePermission);
        }
        for (String permission : java.util.List.of("COMMENT_UPDATE_ALL", "COMMENT_DELETE_ALL")) {
            __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(permission)).thenReturn(allPermission);
        }
        given(commentRepository.findByBbsIdAndPstSn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq(1L), any(Pageable.class)))
                .willReturn(new PageImpl<>(java.util.List.of(comment)));

        CommentDto dto = commentService.getComments(1L, "BBS_01", PageRequest.of(0, 10)).getContent().get(0);
        assertThat(dto.isEditable()).isEqualTo(expected);
        assertThat(dto.isDeletable()).isEqualTo(expected);
        assertThat(comment.getFrstRgtrId()).isEqualTo("owner-login");
    }

    @Test
    @DisplayName("🚨 관리자 목록은 조건이 없으면 살아 있는 전체 댓글을 최신순으로 준다 — bbs_id = NULL 로 늘 0건이 되지 않는다 (DIP I6 ⑥)")
    void getCommentsForModeration_withoutFilters() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
        Comment comment = Comment.builder().ansSn(7L).pstSn(3L).bbsId("BBS_01").ansCn("전체").useYn("Y").build();
        comment.setCrtDt(LocalDateTime.now());
        org.mockito.ArgumentCaptor<Pageable> used = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        given(commentRepository.findByUseYn(org.mockito.ArgumentMatchers.eq("Y"), used.capture()))
                .willReturn(new PageImpl<>(Collections.singletonList(comment)));

        Page<CommentDto> result = commentService.getCommentsForModeration(null, null, PageRequest.of(1, 20));

        assertThat(result.getContent()).extracting(CommentDto::getAnsCn).containsExactly("전체");
        assertThat(used.getValue().getPageNumber()).isEqualTo(1);
        assertThat(used.getValue().getPageSize()).isEqualTo(20);
        assertThat(used.getValue().getSort().getOrderFor("ansSn").getDirection())
                .isEqualTo(org.springframework.data.domain.Sort.Direction.DESC);
        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByBbsIdAndPstSn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("관리자 목록은 게시판만, 글만, 둘 다 준 조건을 각각 그 범위로 좁힌다 (DIP I6 ⑥)")
    void getCommentsForModeration_filters() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(true);
        Page<Comment> empty = new PageImpl<>(Collections.emptyList());
        given(commentRepository.findByBbsIdAndUseYn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq("Y"), org.mockito.ArgumentMatchers.any())).willReturn(empty);
        given(commentRepository.findByPstSnAndUseYn(org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("Y"), org.mockito.ArgumentMatchers.any())).willReturn(empty);
        given(commentRepository.findByBbsIdAndPstSn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq(3L), org.mockito.ArgumentMatchers.any())).willReturn(empty);

        commentService.getCommentsForModeration("BBS_01", null, PageRequest.of(0, 10));
        commentService.getCommentsForModeration(" ", 3L, PageRequest.of(0, 10));
        commentService.getCommentsForModeration("BBS_01", 3L, PageRequest.of(0, 10));

        org.mockito.Mockito.verify(commentRepository).findByBbsIdAndUseYn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq("Y"), org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository).findByPstSnAndUseYn(org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("Y"), org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository).findByBbsIdAndPstSn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq(3L), org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByUseYn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("[Top 1c] BOARD_READ_ALL 이 없으면 가시성 필터 질의만 쓰고, 인증 주체가 없으면 빈 목록으로 닫는다")
    void getCommentsForModeration_withoutBoardReadAllUsesVisibilityQueriesAndFailsClosed() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL")).thenReturn(false);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("   "));

        Page<CommentDto> anonymous = commentService.getCommentsForModeration(null, null, PageRequest.of(0, 10));
        assertThat(anonymous.getContent()).isEmpty();
        org.mockito.Mockito.verifyNoInteractions(commentRepository);

        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("viewer-1"));
        String expectedToday = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))
                .format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        Comment visible = Comment.builder().ansSn(8L).pstSn(3L).bbsId("BBS_01").ansCn("공개 댓글").useYn("Y").build();
        visible.setCrtDt(LocalDateTime.now());
        Page<Comment> visiblePage = new PageImpl<>(java.util.List.of(visible));

        given(communityBoardAccess.accessibleCommunityIds("viewer-1")).willReturn(java.util.Set.of());
        given(commentRepository.findVisiblePublicForModeration(org.mockito.ArgumentMatchers.eq("viewer-1"),
                org.mockito.ArgumentMatchers.eq(expectedToday), org.mockito.ArgumentMatchers.any())).willReturn(visiblePage);
        given(commentRepository.findVisiblePublicForModerationByBbsId(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq("viewer-1"), org.mockito.ArgumentMatchers.eq(expectedToday),
                org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());
        given(commentRepository.findVisiblePublicForModerationByPstSn(org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("viewer-1"), org.mockito.ArgumentMatchers.eq(expectedToday),
                org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());
        given(commentRepository.findVisiblePublicForModerationByBbsIdAndPstSn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq(3L), org.mockito.ArgumentMatchers.eq("viewer-1"),
                org.mockito.ArgumentMatchers.eq(expectedToday), org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());

        assertThat(commentService.getCommentsForModeration(null, null, PageRequest.of(0, 10)).getContent())
                .extracting(CommentDto::getAnsCn).containsExactly("공개 댓글");
        commentService.getCommentsForModeration("BBS_01", null, PageRequest.of(0, 10));
        commentService.getCommentsForModeration(null, 3L, PageRequest.of(0, 10));
        commentService.getCommentsForModeration("BBS_01", 3L, PageRequest.of(0, 10));

        CommentService withoutCommunity = new CommentService(commentRepository, eventPublisher);
        assertThat(withoutCommunity.getCommentsForModeration(null, null, PageRequest.of(0, 10)).getContent())
                .extracting(CommentDto::getAnsCn).containsExactly("공개 댓글");

        java.util.Set<Long> communities = java.util.Set.of(10L);
        given(communityBoardAccess.accessibleCommunityIds("viewer-1")).willReturn(communities);
        given(commentRepository.findVisibleForModeration(org.mockito.ArgumentMatchers.eq("viewer-1"),
                org.mockito.ArgumentMatchers.eq(expectedToday), org.mockito.ArgumentMatchers.eq(communities),
                org.mockito.ArgumentMatchers.any())).willReturn(visiblePage);
        given(commentRepository.findVisibleForModerationByBbsId(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq("viewer-1"), org.mockito.ArgumentMatchers.eq(expectedToday),
                org.mockito.ArgumentMatchers.eq(communities), org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());
        given(commentRepository.findVisibleForModerationByPstSn(org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("viewer-1"), org.mockito.ArgumentMatchers.eq(expectedToday),
                org.mockito.ArgumentMatchers.eq(communities), org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());
        given(commentRepository.findVisibleForModerationByBbsIdAndPstSn(org.mockito.ArgumentMatchers.eq("BBS_01"),
                org.mockito.ArgumentMatchers.eq(3L), org.mockito.ArgumentMatchers.eq("viewer-1"),
                org.mockito.ArgumentMatchers.eq(expectedToday), org.mockito.ArgumentMatchers.eq(communities),
                org.mockito.ArgumentMatchers.any())).willReturn(Page.empty());

        assertThat(commentService.getCommentsForModeration(null, null, PageRequest.of(0, 10)).getContent())
                .extracting(CommentDto::getAnsCn).containsExactly("공개 댓글");
        commentService.getCommentsForModeration("BBS_01", null, PageRequest.of(0, 10));
        commentService.getCommentsForModeration(null, 3L, PageRequest.of(0, 10));
        commentService.getCommentsForModeration("BBS_01", 3L, PageRequest.of(0, 10));

        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByUseYn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByBbsIdAndUseYn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByPstSnAndUseYn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(commentRepository, org.mockito.Mockito.never())
                .findByBbsIdAndPstSn(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Get comments list")
    void getComments() {
        // given
        Long pstSn = 1L;
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "ansSn"));
        Comment comment = Comment.builder()
                .ansSn(1L)
                .pstSn(pstSn)
                .bbsId(bbsId)
                .ansCn("Test Comment")
                .useYn("Y")
                .build();
        comment.setCrtDt(LocalDateTime.now());
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findByBbsIdAndPstSn(bbsId, pstSn, pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.getComments(pstSn, bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAnsCn()).isEqualTo("Test Comment");
    }

    @Test
    @DisplayName("글의 댓글은 정렬 없는 요청이면 등록순으로 조회한다 (DIP C7)")
    void getCommentsDefaultsToConversationOrder() {
        Pageable conversation = PageRequest.of(0, 100, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "ansSn"));
        given(commentRepository.findByBbsIdAndPstSn("BBS_01", 1L, conversation)).willReturn(Page.empty());

        commentService.getComments(1L, "BBS_01", PageRequest.of(0, 100));

        org.mockito.Mockito.verify(commentRepository).findByBbsIdAndPstSn("BBS_01", 1L, conversation);
    }

    @Test
    @DisplayName("Create comment")
    void createComment() {
        // given
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("user1")
                .wrterNm("Tester")
                .ansCn("New Comment")
                .build();
        Comment savedComment = Comment.builder()
                .ansSn(1L)
                .pstSn(request.getPstSn())
                .bbsId(request.getBbsId())
                .wrterId(request.getWrterId())
                .wrterNm(request.getWrterNm())
                .ansCn(request.getAnsCn())
                .build();

        given(commentRepository.save(any(Comment.class))).willReturn(savedComment);

        // when
        Long id = commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        // then
        assertThat(id).isEqualTo(1L);
    }

    @Test
    @DisplayName("작성자는 인증 주체에서 저장한다 — 요청 본문의 주장은 무시된다")
    void createComment_storesAuthenticatedAuthorOnly() {
        // 종전에는 request 의 wrterId/wrterNm 을 그대로 저장했다. 화면이 그 두 필드를 보내지 않으므로
        // **모든 댓글의 작성자가 null** 이었고, 요청이 값을 실으면 남의 이름으로 다는 것도 가능했다.
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("SPOOFED_ID")
                .wrterNm("남의이름")
                .ansCn("New Comment")
                .build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(9L).build());

        commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        org.mockito.ArgumentCaptor<Comment> saved = org.mockito.ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertThat(saved.getValue().getWrterId()).isEqualTo("USRCNFRM_00000000001");
        assertThat(saved.getValue().getWrterNm()).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("🔒 요청이 익명 비밀번호(pswd)를 실어 와도 저장하지 않는다 — 폐기 필드를 평문으로 남기지 않는다")
    void createComment_neverStoresRequestPassword() throws Exception {
        // HTTP 경계는 모르는 필드를 400 으로 거부한다(CommentApiControllerTest). 여기서는 그 경계가 느슨하더라도
        //   서비스·엔티티 생성 경로가 비밀번호를 받아 적지 않는지를 본다 — 그래서 모르는 필드를 버리는 매퍼로 읽는다.
        String body = "{\"pstSn\":1,\"bbsId\":\"BBS_01\",\"ansCn\":\"본문\",\"pswd\":\"plain-secret-1234\"}";
        CommentDto request = tools.jackson.databind.json.JsonMapper.builder().configureForJackson2()
                .disable(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build()
                .readValue(body, CommentDto.class);
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(9L).build());

        commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        org.mockito.ArgumentCaptor<Comment> saved = org.mockito.ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        // 저장 엔티티의 어떤 영속 필드에도 요청 비밀번호 값이 남지 않는다(필드 이름이 아니라 값으로 판정한다).
        java.util.List<String> leaked = new java.util.ArrayList<>();
        for (Class<?> type = Comment.class; type != null && type != Object.class; type = type.getSuperclass()) {
            for (java.lang.reflect.Field field : type.getDeclaredFields()) {
                if (java.lang.reflect.Modifier.isStatic(field.getModifiers())) continue;
                field.setAccessible(true);
                if ("plain-secret-1234".equals(field.get(saved.getValue()))) leaked.add(field.getName());
            }
        }
        assertThat(leaked).as("댓글 저장 엔티티에 요청 비밀번호가 평문으로 남았다").isEmpty();
        assertThat(saved.getValue().getAnsCn()).isEqualTo("본문");
    }

    @Test
    @DisplayName("Update comment")
    void updateComment() {
        // given
        Long id = 1L;
        String newContent = "Updated Comment";
        Comment comment = Comment.builder()
                .ansSn(id)
                .ansCn("Old Comment")
                .build();

        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.of(comment));

        // when
        commentService.updateComment(id, newContent);

        // then
        assertThat(comment.getAnsCn()).isEqualTo(newContent);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"   ", "\t\n"})
    @DisplayName("본문이 비면 등록하지 않는다 — 화면을 거치지 않은 요청도 같은 규칙이다")
    void createComment_rejectsBlankContent(String content) {
        CommentDto request = CommentDto.builder().pstSn(1L).bbsId("BBS_01").ansCn(content).build();

        assertThatThrownBy(() -> commentService.createComment("USRCNFRM_00000000001", "홍길동", request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        org.mockito.Mockito.verifyNoInteractions(commentRepository, eventPublisher);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"   "})
    @DisplayName("본문 없이 수정하면 기존 본문을 지우지 않고 거부한다")
    void updateComment_rejectsBlankContent(String content) {
        assertThatThrownBy(() -> commentService.updateComment(1L, content))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        org.mockito.Mockito.verifyNoInteractions(commentRepository);
    }

    @Test
    @DisplayName("Update comment should throw exception when not found")
    void updateComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.updateComment(id, "Updated Comment"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
    }

    @Test
    @DisplayName("Delete comment")
    void deleteComment() {
        // given
        Long id = 1L;
        Comment comment = Comment.builder()
                .ansSn(id)
                .useYn("Y")
                .build();

        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.of(comment));

        // when
        commentService.deleteComment(id);

        // then
        assertThat(comment.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("Delete comment should throw exception when not found")
    void deleteComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.deleteComment(id))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
    }

    /**
     * [2026-11-17] 수정·삭제의 소유자 검사를 실제 판정으로 시험한다. 위 시험들은 {@code SecurityUtil} 을 통째로 흉내 내
     * 소유자 검사가 아무 일도 하지 않았다 — 검사를 지우거나, 작성자 칸이 아닌 다른 칸과 대조하거나, 수정에 삭제 대행 권한을
     * 받아도 모두 통과했다. 여기서는 검사 본문만 실제로 돌리고 현재 로그인 ID 와 권한만 정한다.
     *
     * <p>소유자는 감사 칸 {@code frstRgtrId}(로그인 ID 축)이다. {@code wrterId} 는 내부 식별자 축이라 대조하지 않는다.
     */
    @org.junit.jupiter.api.Nested
    @DisplayName("수정·삭제의 소유자 검사")
    class OwnerGuard {

        private static final Long ID = 9L;

        private Comment stored(String useYn) {
            Comment comment = Comment.builder().ansSn(ID).pstSn(3L).bbsId("BBS_01")
                    .wrterId("OWNER_ESNTL").ansCn("원래 본문").useYn(useYn).build();
            comment.setFrstRgtrId("owner-login");
            given(commentRepository.findByIdForUpdate(ID)).willReturn(Optional.of(comment));
            return comment;
        }

        /** 검사 본문은 실제로 돌리고, 그 안에서 묻는 현재 로그인 ID 와 권한만 정한다. */
        private void signedInAs(String loginId, String permission) {
            java.util.Set<String> granted = permission == null || permission.isEmpty()
                    ? java.util.Set.of() : java.util.Set.of(permission);
            __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(
                    org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenCallRealMethod();
            __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(Optional.ofNullable(loginId));
            __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission(org.mockito.ArgumentMatchers.anyString()))
                    .thenAnswer(invocation -> granted.contains(invocation.<String>getArgument(0)));
        }

        @org.junit.jupiter.params.ParameterizedTest(name = "[{index}] 로그인 {0}·권한 {1} → 허용 {2}")
        @org.junit.jupiter.params.provider.CsvSource(nullValues = "NULL", value = {
                "owner-login, '', true",
                "intruder, '', false",
                "intruder, COMMENT_UPDATE_ALL, true",
                "intruder, COMMENT_DELETE_ALL, false",
                "NULL, '', false"
        })
        @DisplayName("수정은 작성자이거나 수정 대행 권한(COMMENT_UPDATE_ALL)이 있어야 하고, 아니면 본문을 바꾸지 않고 거부한다")
        void updateRequiresOwnerOrUpdateAll(String loginId, String permission, boolean allowed) {
            Comment comment = stored("Y");
            signedInAs(loginId, permission);

            if (allowed) {
                commentService.updateComment(ID, "새 본문");
                assertThat(comment.getAnsCn()).isEqualTo("새 본문");
            } else {
                assertThatThrownBy(() -> commentService.updateComment(ID, "새 본문"))
                        .isInstanceOf(BusinessException.class)
                        .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
                assertThat(comment.getAnsCn()).isEqualTo("원래 본문");
            }
        }

        @org.junit.jupiter.params.ParameterizedTest(name = "[{index}] 로그인 {0}·권한 {1} → 허용 {2}")
        @org.junit.jupiter.params.provider.CsvSource(nullValues = "NULL", value = {
                "owner-login, '', true",
                "intruder, '', false",
                "intruder, COMMENT_DELETE_ALL, true",
                "intruder, COMMENT_UPDATE_ALL, false",
                "NULL, '', false"
        })
        @DisplayName("삭제는 작성자이거나 삭제 대행 권한(COMMENT_DELETE_ALL)이 있어야 하고, 아니면 지우지도 댓글 수를 알리지도 않는다")
        void deleteRequiresOwnerOrDeleteAll(String loginId, String permission, boolean allowed) {
            Comment comment = stored("Y");
            signedInAs(loginId, permission);

            if (allowed) {
                commentService.deleteComment(ID);
                assertThat(comment.getUseYn()).isEqualTo("N");
                verify(eventPublisher).publishEvent(any(PostCommentCountChangedEvent.class));
            } else {
                assertThatThrownBy(() -> commentService.deleteComment(ID))
                        .isInstanceOf(BusinessException.class)
                        .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
                assertThat(comment.getUseYn()).isEqualTo("Y");
                org.mockito.Mockito.verifyNoInteractions(eventPublisher);
            }
        }

        @Test
        @DisplayName("이미 지운 남의 댓글을 지우려 해도 거부한다 — 상태 확인보다 소유자 검사가 먼저다")
        void deletingSomeoneElsesDeletedCommentIsStillDenied() {
            stored("N");
            signedInAs("intruder", "");

            assertThatThrownBy(() -> commentService.deleteComment(ID))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
            org.mockito.Mockito.verifyNoInteractions(eventPublisher);
        }
    }

    /**
     * [2026-08-29] 댓글 수가 영원히 0 이던 결함의 회귀 방지.
     *
     * <p>종전에는 {@code syncCmntCntAtomic} 호출부가 저장소 전체에서 board 의
     * {@code PostCreatedEvent} 리스너 하나뿐이었다 — <b>게시글이 생성되는 순간</b>에만 돌았고,
     * 그때 댓글 수는 언제나 0 이다. 댓글을 달거나 지울 때 갱신하는 경로가 아예 없었으므로
     * 세 화면의 '댓글 N' 이 전부 0 으로 고정돼 있었다.
     *
     * <p>단건 변화량을 <b>이벤트가 나른다</b>. 그래야 comment 가 커밋 뒤 개수를 다시 세거나
     * board 가 comment 저장소를 조회하지 않아 교차 도메인 결합이 되살아나지 않는다.
     */
    @Test
    @DisplayName("댓글 등록은 같은 트랜잭션에서 +1 증가량을 알린다")
    void createComment_publishesIncrementDelta() {
        CommentDto dto = CommentDto.builder().pstSn(10L).bbsId("BBS_01").ansCn("내용").build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").build());

        commentService.createComment("ESNTL_01", "홍길동", dto);

        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, 1));
        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
    }

    /**
     * 대상이 없으면 알리지 않는다.
     *
     * <p>{@code bbsId}·{@code pstSn} 은 요청 본문에서 오므로 클라이언트가 빠뜨릴 수 있다.
     * 그 상태로 개수를 세면 <b>어느 게시글의 수인지 모르는 값</b>을 발행하게 되고, board 쪽
     * 리스너는 그것을 어디에도 반영할 수 없다. 세지도 알리지도 않는다.
     */
    @Test
    @DisplayName("대상 게시글을 특정할 수 없으면 세지도 알리지도 않는다")
    void createComment_withoutTarget_doesNotPublish() {
        CommentDto dto = CommentDto.builder().ansCn("내용").build();
        given(commentRepository.save(any(Comment.class))).willReturn(Comment.builder().ansSn(1L).build());

        commentService.createComment("ESNTL_01", "홍길동", dto);

        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
        verify(eventPublisher, org.mockito.Mockito.never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("댓글 삭제(논리)는 같은 트랜잭션에서 -1 감소량을 알린다")
    void deleteComment_publishesDecrementDelta() {
        Comment comment = Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").useYn("Y").build();
        given(commentRepository.findByIdForUpdate(1L)).willReturn(Optional.of(comment));

        commentService.deleteComment(1L);

        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, -1));
        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
    }

    @Test
    @DisplayName("댓글 수 delta는 원본 댓글 트랜잭션 안에서 즉시 발행한다")
    void createComment_publishesCountDeltaInsideSourceTransaction() {
        CommentDto dto = CommentDto.builder().pstSn(10L).bbsId("BBS_01").ansCn("내용").build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").build());
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            commentService.createComment("ESNTL_01", "홍길동", dto);

            verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, 1));
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("이미 삭제된 댓글은 다시 감소 이벤트를 발행하지 않는다")
    void deleteComment_alreadyDeleted_doesNotPublishAnotherDelta() {
        Comment comment = Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").useYn("N").build();
        given(commentRepository.findByIdForUpdate(1L)).willReturn(Optional.of(comment));

        commentService.deleteComment(1L);

        verify(eventPublisher, org.mockito.Mockito.never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("댓글 위치(게시판·게시글)를 돌려준다 — 수정·삭제 전 게시글 가드용(DIP S8)")
    void getCommentLocation_returnsBoardAndPost() {
        Comment comment = Comment.builder().ansSn(3L).bbsId("BBS_001").pstSn(7L).ansCn("c").useYn("Y").build();
        given(commentRepository.findById(3L)).willReturn(Optional.of(comment));

        CommentService.CommentLocation location = commentService.getCommentLocation(3L);

        assertThat(location.bbsId()).isEqualTo("BBS_001");
        assertThat(location.pstSn()).isEqualTo(7L);
    }

    @Test
    @DisplayName("없는 댓글의 위치는 댓글 없음으로 거부한다")
    void getCommentLocation_missingComment() {
        given(commentRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.getCommentLocation(99L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CommentErrorCode.COMMENT_NOT_FOUND));
        Comment deleted = Comment.builder().ansSn(11L).bbsId("BBS_001").pstSn(7L).ansCn("deleted").useYn("N").build();
        given(commentRepository.findById(11L)).willReturn(Optional.of(deleted));
        assertThatThrownBy(() -> commentService.getCommentLocation(11L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CommentErrorCode.COMMENT_NOT_FOUND));
        given(commentRepository.findByIdForUpdate(11L)).willReturn(Optional.of(deleted));
        assertThatThrownBy(() -> commentService.updateComment(11L, "hack"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CommentErrorCode.COMMENT_NOT_FOUND));
    }

    @Test
    @DisplayName("BOARD_READ_ALL 없는 관리자 댓글 삭제는 열람 경계 쿼리를 쓰고 경계 밖·익명 요청은 404 로 거절한다")
    void deleteCommentForModeration_withoutBoardReadAllEnforcesVisibility() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(false);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("COMMENT_DELETE_ALL"))
                .thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(any(), any()))
                .thenCallRealMethod();
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.deleteCommentForModeration(5L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
        org.mockito.Mockito.verifyNoInteractions(commentRepository, eventPublisher);

        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("VIEWER_ESNTL"));
        given(communityBoardAccess.accessibleCommunityIds("VIEWER_ESNTL")).willReturn(java.util.Set.of());
        given(commentRepository.findVisiblePublicForModerationUpdate(eq(5L), eq("VIEWER_ESNTL"), anyString()))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.deleteCommentForModeration(5L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
        verify(commentRepository, org.mockito.Mockito.never()).findByIdForUpdate(any());

        Comment visibleCommunityComment = Comment.builder()
                .ansSn(7L).pstSn(20L).bbsId("BBS_CMTY").ansCn("ok").useYn("Y").build();
        visibleCommunityComment.setFrstRgtrId("writer-login");
        given(communityBoardAccess.accessibleCommunityIds("VIEWER_ESNTL")).willReturn(java.util.Set.of(10L));
        given(commentRepository.findVisibleForModerationUpdate(
                eq(7L), eq("VIEWER_ESNTL"), anyString(), eq(java.util.Set.of(10L))))
                .willReturn(Optional.of(visibleCommunityComment));

        commentService.deleteCommentForModeration(7L);

        assertThat(visibleCommunityComment.getUseYn()).isEqualTo("N");
        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_CMTY", 20L, -1));
    }

    @Test
    @DisplayName("열람 가능한 글의 댓글이라도 본인·COMMENT_DELETE_ALL 권한이 없으면 관리자 삭제가 거부된다(H3)")
    void deleteCommentForModeration_visiblePostStillChecksDeletePermission() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(false);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("COMMENT_DELETE_ALL"))
                .thenReturn(false);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                .thenReturn(Optional.of("VIEWER_ESNTL"));
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                .thenReturn(Optional.of("other-login"));
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(any(), any()))
                .thenCallRealMethod();

        Comment visible = Comment.builder().ansSn(8L).pstSn(20L).bbsId("BBS_01").useYn("Y").build();
        visible.setFrstRgtrId("writer-login");
        given(communityBoardAccess.accessibleCommunityIds("VIEWER_ESNTL")).willReturn(java.util.Set.of());
        given(commentRepository.findVisiblePublicForModerationUpdate(eq(8L), eq("VIEWER_ESNTL"), anyString()))
                .willReturn(Optional.of(visible));

        assertThatThrownBy(() -> commentService.deleteCommentForModeration(8L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
        assertThat(visible.getUseYn()).isEqualTo("Y");
        org.mockito.Mockito.verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("BOARD_READ_ALL 권한이 있으면 관리자 삭제는 전체 단건 잠금으로 삭제한다")
    void deleteCommentForModeration_withBoardReadAllUsesFullLock() {
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("BOARD_READ_ALL"))
                .thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("COMMENT_DELETE_ALL"))
                .thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(any(), any()))
                .thenCallRealMethod();

        Comment target = Comment.builder().ansSn(9L).pstSn(30L).bbsId("BBS_01").useYn("Y").build();
        given(commentRepository.findByIdForUpdate(9L)).willReturn(Optional.of(target));

        commentService.deleteCommentForModeration(9L);

        assertThat(target.getUseYn()).isEqualTo("N");
        verify(commentRepository).findByIdForUpdate(9L);
        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 30L, -1));
    }
}
