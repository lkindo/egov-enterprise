package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Blog 엔티티 단위 테스트")
class BlogTest {

    @Test
    @DisplayName("Blog 빌더 및 기본값 테스트")
    void builderTest() {
        Blog blog = Blog.builder()
                .blogId("BLOG_001")
                .blogTtl("My Blog")
                .blogIntroCn("Welcome")
                .regSeCd("REG01")
                .tmpltId("TMP_01")
                .useYn("Y")
                .bbsId("BBS_001")
                .blogYn("Y")
                .build();

        assertThat(blog.getBlogId()).isEqualTo("BLOG_001");
        assertThat(blog.getBlogTtl()).isEqualTo("My Blog");
        assertThat(blog.getBlogIntroCn()).isEqualTo("Welcome");
        assertThat(blog.getRegSeCd()).isEqualTo("REG01");
        assertThat(blog.getTmpltId()).isEqualTo("TMP_01");
        assertThat(blog.getUseYn()).isEqualTo("Y");
        assertThat(blog.getBbsId()).isEqualTo("BBS_001");
        assertThat(blog.getBlogYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Blog 수정 비즈니스 로직 테스트")
    void updateTest() {
        Blog blog = Blog.builder()
                .blogTtl("Old Title")
                .blogIntroCn("Old Intro")
                .useYn("Y")
                .build();

        blog.update("New Title", "New Intro", "N");

        assertThat(blog.getBlogTtl()).isEqualTo("New Title");
        assertThat(blog.getBlogIntroCn()).isEqualTo("New Intro");
        assertThat(blog.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("Blog 레거시 별칭(Aliases) 및 Transient 필드 Getter/Setter 테스트")
    void legacyAliasesAndSettersTest() {
        Blog blog = Blog.builder().build();

        // Setter aliases 호출
        blog.setBlogNm("Legacy Blog Name");
        blog.setBlogIntrcn("Legacy Blog Intro");
        blog.setRegTypeCd("REGT02");
        blog.setTmplatId("TMP_09");

        // Getter aliases 및 매핑 검증
        assertThat(blog.getBlogNm()).isEqualTo("Legacy Blog Name");
        assertThat(blog.getBlogTtl()).isEqualTo("Legacy Blog Name");

        assertThat(blog.getBlogIntrcn()).isEqualTo("Legacy Blog Intro");
        assertThat(blog.getBlogIntroCn()).isEqualTo("Legacy Blog Intro");

        assertThat(blog.getRegTypeCd()).isEqualTo("REGT02");
        assertThat(blog.getRegSeCd()).isEqualTo("REGT02");

        assertThat(blog.getTmplatId()).isEqualTo("TMP_09");
        assertThat(blog.getTmpltId()).isEqualTo("TMP_09");
    }
}
