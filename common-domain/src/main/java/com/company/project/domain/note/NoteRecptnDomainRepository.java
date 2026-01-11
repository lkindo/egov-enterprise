package com.company.project.domain.note;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 받은쪽지 Repository
 */
@Repository("noteRecptnDomainRepository")
public interface NoteRecptnDomainRepository extends JpaRepository<NoteRecptn, String> {
}
