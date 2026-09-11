package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.DeptManage;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class DeptManageRepositoryPagingTest extends PersistenceTestSupport {

    @Autowired
    private DeptManageRepository repository;

    @BeforeEach
    void seedDepartments() {
        repository.deleteAll();
        for (int index = 12; index >= 1; index--) {
            repository.save(DeptManage.builder()
                    .ognzId("DEPT_PAGING_%02d".formatted(index))
                    .ognzNm("Team %02d".formatted(index))
                    .build());
        }
    }

    @Test
    void treeReturnsAllDepartmentsInNameOrderWithoutPagination() {
        var result = repository.searchDeptManages(null, Pageable.unpaged());

        assertThat(result.getContent()).extracting(DeptManage::getOgnzNm)
                .containsExactlyElementsOf(IntStream.rangeClosed(1, 12)
                        .mapToObj(index -> "Team %02d".formatted(index)).toList());
        assertThat(result.getTotalElements()).isEqualTo(12);
    }

    @Test
    void unpagedSearchStillFiltersCaseInsensitively() {
        var result = repository.searchDeptManages("team 1", Pageable.unpaged());

        assertThat(result.getContent()).extracting(DeptManage::getOgnzNm)
                .containsExactly("Team 10", "Team 11", "Team 12");
        assertThat(result.getTotalElements()).isEqualTo(3);
    }

    @Test
    void unpagedSearchCanReturnAnEmptyResult() {
        var result = repository.searchDeptManages("missing", Pageable.unpaged());

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void pagedSearchPreservesOffsetLimitOrderAndTotal() {
        var result = repository.searchDeptManages("team", PageRequest.of(1, 5));

        assertThat(result.getContent()).extracting(DeptManage::getOgnzNm)
                .containsExactly("Team 06", "Team 07", "Team 08", "Team 09", "Team 10");
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalElements()).isEqualTo(12);
        assertThat(result.getTotalPages()).isEqualTo(3);
    }
}
