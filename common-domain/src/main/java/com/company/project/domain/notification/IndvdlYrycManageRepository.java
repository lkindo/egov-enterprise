package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IndvdlYrycManageRepository extends JpaRepository<IndvdlYrycManage, IndvdlYrycManageId> {
    List<IndvdlYrycManage> findByOccrrncYear(String occrrncYear);
}
