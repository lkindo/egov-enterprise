package nuri.business.domain.blog;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Blog 엔티티 단위 테스트")
class BlogTest {

    @Test
    @DisplayName("Blog 빌더 및 기본값 테스트")
    void builderTest() {
        Blog blog = Blog.builder()
                .blogSn(1L)
                .blogTtl("My Blog")
                .blogIntroCn("Welcome")
                .regSeCd("REG01")
                .tmpltId("TMP_01")
                .useYn("Y")
                .bbsId("BBS_001")
                .blogYn("Y")
                .build();

        assertThat(blog.getBlogSn()).isEqualTo(1L);
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

}
