package nuri.business.domain.deptjob;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DeptJob 관련 엔티티 테스트")
class DeptJobEntityTest {

    @Test
    @DisplayName("DeptJobBox 빌더 및 초기화 테스트")
    void deptJobBoxTest() {
        DeptJobBox box = DeptJobBox.builder()
                .deptTaskBoxSn(1L)
                .deptTaskBoxNm("Job Box 1")
                .deptId("DEPT_001")
                .sortOrdr(1L)
                .build();

        assertThat(box.getDeptTaskBoxSn()).isEqualTo(1L);
        assertThat(box.getDeptTaskBoxNm()).isEqualTo("Job Box 1");
        assertThat(box.getDeptId()).isEqualTo("DEPT_001");
        assertThat(box.getSortOrdr()).isEqualTo(1L);
    }

    @Test
    @DisplayName("DeptJob 빌더 및 수정 테스트")
    void deptJobTest() {
        DeptJob job = DeptJob.builder()
                .deptTaskId("JOB_001")
                .deptTaskNm("Initial Job")
                .deptTaskCn("Initial Content")
                .prrtyRnk("1")
                .build();

        assertThat(job.getDeptTaskId()).isEqualTo("JOB_001");
        assertThat(job.getDeptTaskNm()).isEqualTo("Initial Job");

        job.update(2L, "Updated Job", "Updated Content", "user01", "2", "FILE_001");
        
        assertThat(job.getDeptTaskBoxSn()).isEqualTo(2L);
        assertThat(job.getDeptTaskNm()).isEqualTo("Updated Job");
        assertThat(job.getDeptTaskCn()).isEqualTo("Updated Content");
        assertThat(job.getPicId()).isEqualTo("user01");
        assertThat(job.getPrrtyRnk()).isEqualTo("2");
        assertThat(job.getAtchFileId()).isEqualTo("FILE_001");
    }
}
