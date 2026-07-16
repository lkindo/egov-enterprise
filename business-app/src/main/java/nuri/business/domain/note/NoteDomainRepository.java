package nuri.business.domain.note;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteDomainRepository extends JpaRepository<Note, String> {
}
