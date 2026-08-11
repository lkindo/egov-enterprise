package nuri.business.domain.comment;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 댓글 목록 조회가 <b>논리 삭제된 댓글을 제외하는가</b>를 고정한다.
 *
 * <p><b>[왜 필요한가 — 2026-08-12]</b> `CommentService.deleteComment` 는 물리 삭제가 아니라
 * {@code useYn = "N"} 을 세우는 <b>논리 삭제</b>다. 그런데 상세 화면이 쓰는 목록 쿼리
 * {@code findByBbsIdAndPstId} 에는 {@code useYn} 조건이 <b>없었다</b>. 그래서 사용자가 댓글을
 * 삭제해도 <b>목록에서 사라지지 않았다</b> — 버튼은 눌리고 서버는 200 을 주는데 화면은 그대로다.
 *
 * <p>같은 저장소가 이미 {@code countByBbsIdAndPstIdAndUseYn(..., "Y")} 로 <b>개수는 살아 있는 것만</b>
 * 세고 있었다(`BoardEventListener`). 즉 "목록은 삭제된 것을 포함하고 개수는 제외하는" 비대칭이
 * 존재했다 — {@code useYn='Y'} 가 '살아 있는 댓글'이라는 규약임은 저장소 자신이 증명한다.
 *
 * <p>E2E(`03-board-community` 댓글 생명주기)가 이 결함을 처음 드러냈지만, 그 신호는 느리고
 * 간헐적이다. 같은 불변식을 여기서 <b>결정적으로</b> 고정한다.
 */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("CommentRepository 테스트")
class CommentRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private CommentRepository commentRepository;

    private static final String BBS_ID = "BBSMSTR_TEST00000001";
    private static final String PST_ID = "1";

    private Comment save(String content) {
        return commentRepository.save(Comment.builder()
                .bbsId(BBS_ID)
                .pstId(PST_ID)
                .wrterId("tester")
                .wrterNm("Tester")
                .ansCn(content)
                .useYn("Y")
                .build());
    }

    @Test
    @DisplayName("논리 삭제된 댓글은 목록에서 제외된다")
    void excludesSoftDeletedComment() {
        save("살아있는 댓글");
        Comment removed = save("삭제된 댓글");
        removed.delete();
        commentRepository.saveAndFlush(removed);

        Page<Comment> page = commentRepository.findByBbsIdAndPstId(BBS_ID, PST_ID, PageRequest.of(0, 10));

        assertThat(page.getContent())
                .extracting(Comment::getAnsCn)
                .as("삭제한 댓글이 목록에 그대로 남아 있다 — 사용자에게는 '삭제가 안 되는' 것으로 보인다")
                .containsExactly("살아있는 댓글");
    }

    @Test
    @DisplayName("살아 있는 댓글은 그대로 조회된다 — 필터가 과해져 전부 감추면 그것대로 결함이다")
    void keepsLiveComments() {
        save("첫 번째");
        save("두 번째");

        Page<Comment> page = commentRepository.findByBbsIdAndPstId(BBS_ID, PST_ID, PageRequest.of(0, 10));

        assertThat(page.getContent())
                .extracting(Comment::getAnsCn)
                .containsExactlyInAnyOrder("첫 번째", "두 번째");
    }
}
