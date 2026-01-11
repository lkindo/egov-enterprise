package com.company.project.domain.note;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 보낸쪽지 Repository
 */
@Repository("noteTrnsmitDomainRepository")
public interface NoteTrnsmitDomainRepository extends JpaRepository<NoteTrnsmit, String> {
}
