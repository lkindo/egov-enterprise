package nuri.business.domain.group;

import nuri.business.support.PersistenceTestSupport;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.group.GroupManageService;
import org.hibernate.Session;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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

    @Autowired
    private UserRepository userRepository;

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

    @ParameterizedTest
    @CsvSource({"팀, 3", "팀%, 3", "없는이름, 0"})
    @DisplayName("검색 총건수는 접두어·LIKE 의미를 유지하고 그룹 엔티티를 적재하지 않는다")
    void countSearchMatchesWithoutLoadingGroups(String keyword, int expectedCount) {
        String[] names = {"팀A", "팀B", "타팀A", "팀%기호", "다른그룹"};
        for (int i = 0; i < names.length; i++) {
            groupManageRepository.save(GroupManage.builder()
                    .groupId("COUNT_0" + i)
                    .groupNm(names[i])
                    .build());
        }
        groupManageRepository.flush();
        entityManager.clear();
        BaseSearchDto search = new BaseSearchDto();
        search.setSearchKeyword(keyword);
        GroupManageService service = new GroupManageService(groupManageRepository, userRepository);

        int count = service.selectGroupListTotCnt(search);

        assertThat(count).isEqualTo(expectedCount);
        assertThat(entityManager.unwrap(Session.class).getStatistics().getEntityCount())
                .as("총건수 조회가 일치하는 그룹 전체를 영속성 컨텍스트에 적재해서는 안 된다")
                .isZero();
    }
}
