package nuri.business.domain.group;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

class GroupManagePersistenceTest extends PersistenceTestSupport {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private GroupManageRepository groupManageRepository;

    @Test
    @DisplayName("그룹 정보 CRUD 테스트")
    void groupManageCrud() {
        // given
        GroupManage group = GroupManage.builder()
                .groupId("GROUP_01")
                .groupNm("테스트 그룹")
                .groupDc("테스트 그룹 설명")
                .build();

        // when: Save
        groupManageRepository.save(group);
        groupManageRepository.flush();
        entityManager.clear();

        // then: Find
        GroupManage saved = groupManageRepository.findById("GROUP_01").orElseThrow();
        assertThat(saved.getGroupNm()).isEqualTo("테스트 그룹");

        // when: Update
        saved.update("수정된 그룹", "수정된 설명");
        groupManageRepository.save(saved);
        groupManageRepository.flush();
        entityManager.clear();

        // then: Verify Update
        GroupManage updated = groupManageRepository.findById("GROUP_01").orElseThrow();
        assertThat(updated.getGroupNm()).isEqualTo("수정된 그룹");
        assertThat(updated.getGroupDc()).isEqualTo("수정된 설명");

        // when: Delete
        groupManageRepository.delete(updated);
        groupManageRepository.flush();
        entityManager.clear();

        // then: Verify Delete
        assertThat(groupManageRepository.findById("GROUP_01")).isEmpty();
    }

    @Test
    @DisplayName("그룹 검색 기능 테스트")
    void searchByKeyword() {
        // given
        groupManageRepository.save(GroupManage.builder()
                .groupId("GROUP_02")
                .groupNm("검색용 그룹")
                .build());
        groupManageRepository.flush();
        entityManager.clear();

        // when
        Page<GroupManage> result = groupManageRepository.searchByKeyword("검색", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getGroupNm()).contains("검색");
    }
}
