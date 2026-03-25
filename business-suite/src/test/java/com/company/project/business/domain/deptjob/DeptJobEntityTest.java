package com.company.project.business.domain.deptjob;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DeptJob 관련 엔티티 테스트")
class DeptJobEntityTest {

    @Test
    @DisplayName("DeptJobBox 빌더 및 초기화 테스트")
    void deptJobBoxTest() {
        DeptJobBox box = DeptJobBox.builder()
                .deptJobbxId("BOX_001")
                .deptJobbxNm("Job Box 1")
                .deptId("DEPT_001")
                .indictOrdr(1)
                .build();

        assertThat(box.getDeptJobbxId()).isEqualTo("BOX_001");
        assertThat(box.getDeptJobbxNm()).isEqualTo("Job Box 1");
        assertThat(box.getDeptId()).isEqualTo("DEPT_001");
        assertThat(box.getIndictOrdr()).isEqualTo(1);
    }

    @Test
    @DisplayName("DeptJob 빌더 및 수정 테스트")
    void deptJobTest() {
        DeptJob job = DeptJob.builder()
                .deptJobId("JOB_001")
                .deptJobNm("Initial Job")
                .deptJobCn("Initial Content")
                .priort("1")
                .build();

        assertThat(job.getDeptJobId()).isEqualTo("JOB_001");
        assertThat(job.getDeptJobNm()).isEqualTo("Initial Job");

        job.update("BOX_002", "Updated Job", "Updated Content", "user01", "2", "FILE_001");
        
        assertThat(job.getDeptJobbxId()).isEqualTo("BOX_002");
        assertThat(job.getDeptJobNm()).isEqualTo("Updated Job");
        assertThat(job.getDeptJobCn()).isEqualTo("Updated Content");
        assertThat(job.getChargerId()).isEqualTo("user01");
        assertThat(job.getPriort()).isEqualTo("2");
        assertThat(job.getAtchFileId()).isEqualTo("FILE_001");
    }
}
