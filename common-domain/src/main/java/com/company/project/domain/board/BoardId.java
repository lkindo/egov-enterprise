package com.company.project.domain.board;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * 게시판 복합키 식별자 클래스 (NBBS 테이블 대응)
 */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BoardId implements Serializable {
    private Long id;
    private String boardMaster; // Board 엔티티의 boardMaster 필드명과 일치해야 함
}
