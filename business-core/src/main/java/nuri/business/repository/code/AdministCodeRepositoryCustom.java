package nuri.business.repository.code;

import nuri.business.domain.code.AdministCode;

public interface AdministCodeRepositoryCustom {
    /** Serialize hierarchy writers until their transaction commits or rolls back. */
    void lockHierarchy();

    void insert(AdministCode code);
}
