package com.company.project.domain.program;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.company.project.domain.program.ProgramChangeRequest.ProgramChangeRequestId;

public interface ProgramChangeRequestRepository extends JpaRepository<ProgramChangeRequest, ProgramChangeRequestId> {

    @Query("SELECT COALESCE(MAX(p.id.requstNo), 0) FROM ProgramChangeRequest p")
    Long findMaxRequstNo();

    void deleteAllByIdProgrmFileNmIn(Iterable<String> progrmFileNms);
}