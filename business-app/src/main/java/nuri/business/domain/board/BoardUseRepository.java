package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;

// [V2_16 정리] 死메서드 3건(findByTrgtIdAndUseYnY/findAllActive/deleteByBbsId) 제거 — 호출 0건 실측(2026-07-17).
// BoardUse 기록 기능 도입 시 파생 쿼리는 사용처와 함께 재정의할 것 (마스터 물리삭제 가드의 use_info 정리 포함).
public interface BoardUseRepository extends JpaRepository<BoardUse, BoardUseId> {
}
