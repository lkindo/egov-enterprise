package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CommonCodeRepository extends JpaRepository<CommonCode, CommonCodeId>, CommonCodeRepositoryCustom {
    List<CommonCode> findByCodeGroupIdAndUseAt(String codeGroupId, String useAt);
}
