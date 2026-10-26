package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Builder;
import java.time.LocalDateTime;

/**
 * 게시글 정보 DTO (v5 standardized - Record 버전)
 */
@Builder(toBuilder = true)
public record BoardDto(
    @Schema(description = "게시글 ID")
    Long pstSn,

    @Schema(description = "게시판 ID")
    @Size(max = 20)
    String bbsId,

    // [2026-10-26 ADR-0043, NAV-10] 통합 검색 결과가 어느 게시판의 글인지 알리는 게시판 이름. 검색 질의가 이미 잇는 게시판 마스터의
    //   값이다. 통합 검색에서만 싣고 그 밖의 경로(게시판 목록·상세·업무 홈)는 null 이다 — 그 화면들은 게시판 메타로 이름을 안다.
    @Schema(description = "게시판 이름. 통합 검색에서만 싣고 그 밖은 null", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    String bbsTtl,

    @Schema(description = "답글 번호", nullable = true, types = {"integer", "null"})
    Long ansSn,

    @Schema(description = "제목", nullable = true, types = {"string", "null"})
    @Size(max = 256)
    String pstTtl,

    @Schema(description = "내용", nullable = true, types = {"string", "null"})
    @Size(max = 4000)
    String pstCn,

    @Schema(description = "상위 게시글 ID", nullable = true, types = {"integer", "null"})
    Long upPstSn,

    @Schema(description = "정렬 순서", nullable = true, types = {"integer", "null"})
    Long sortOrdr,

    @Schema(description = "제목 굵게 표시 여부", nullable = true, types = {"string", "null"})
    @Size(max = 1)
    String ttlBoldYn,

    @Schema(description = "조회수", nullable = true, types = {"integer", "null"})
    Integer inqCnt,

    @Schema(description = "사용 여부", nullable = true, types = {"string", "null"})
    @Size(max = 1)
    String useYn,

    @Schema(description = "게시 시작일", nullable = true, types = {"string", "null"})
    @Size(max = 20)
    String pstBgngYmd,

    @Schema(description = "게시 종료일", nullable = true, types = {"string", "null"})
    @Size(max = 20)
    String pstEndYmd,

    @Schema(description = "작성자 ID", nullable = true, types = {"string", "null"})
    @Size(max = 20)
    String userId,

    @Schema(description = "작성자명", nullable = true, types = {"string", "null"})
    @Size(max = 100)
    String userNm,

    // [보안] 게시글 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @Schema(description = "비밀번호", accessMode = Schema.AccessMode.WRITE_ONLY)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Size(max = 200)
    String pswd,

    @Schema(description = "첨부파일 일련번호", nullable = true, types = {"integer", "null"})
    Long atchFileSn,

    @Schema(description = "비밀글 여부", nullable = true, types = {"string", "null"})
    @Size(max = 1)
    String scrtYn,

    @Schema(description = "행사일", nullable = true, types = {"string", "null"})
    LocalDateTime evntDt,

    @Schema(description = "QNA 상태", nullable = true, types = {"string", "null"})
    String qnaSttsCd,

    @Schema(description = "QNA 카테고리", nullable = true, types = {"string", "null"})
    @Size(max = 12)
    String qnaCatCd,

    @Schema(description = "좋아요수", nullable = true, types = {"integer", "null"})
    Integer likeCnt,

    @Schema(description = "댓글수", nullable = true, types = {"integer", "null"})
    Integer commentCnt,

    @Schema(description = "파일수", nullable = true, types = {"integer", "null"})
    Integer fileCnt,

    @Schema(description = "등록일시", nullable = true, types = {"string", "null"})
    LocalDateTime crtDt,

    // [2026-09-26 DIP V2] 등록자명(frstRegisterNm)을 걷었다 — 매퍼 세 곳이 모두 ignore 해 늘 null 이었고,
    //   작성자 이름은 userNm 이 싣는다. 비어 있는 필드가 계약에 있으면 화면이 그것을 읽어 작성자를 '-' 로 그린다.

    @Schema(description = "답글 단계", nullable = true, types = {"integer", "null"})
    Integer ansLv,

    // [2026-10-01] 현재 사용자가 이 글을 이미 추천했는지 — 종전 화면은 알 수 없어 누를 때마다 409 로 알았다.
    //   판정할 수 없으면(비로그인·목록 밖 경로) null 이다.
    @Schema(description = "현재 사용자가 이미 추천했는지(서버 판정, 알 수 없으면 null)", nullable = true,
            types = {"boolean", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Boolean recommended,

    // [2026-10-23 ADR-0040 결정 3] 서버가 오늘(Asia/Seoul) 기준으로 판정한 게시 상태 — 화면은 날짜를 다시 계산하지 않는다
    //   (DEC-OPS-140). 게시판 목록·상세에서만 싣고, 그 밖의 경로(통합 검색·공개 FAQ)는 null 이다.
    @Schema(description = "게시 상태(서버 판정, Asia/Seoul 오늘 기준) — SCHEDULED 시작일 전·POSTING 게시 중·ENDED 종료일 지남. "
            + "게시판 목록·상세에서만 싣고 그 밖은 null", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    PostingStatus postingStatus,

    // [2026-10-23 ADR-0040 결정 10] 게시글 버전 — 수정 요청(작성 화면·운영 화면 빠른 편집)이 그대로 돌려보낸다.
    @Schema(description = "게시글 버전(낙관적 잠금). 수정 요청에 그대로 돌려보낸다", nullable = true, types = {"integer", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Integer version,

    // [ADR-0040 결정 5] 서버가 오늘(Asia/Seoul) 기준으로 판정한 '지금 목록 맨 위에 고정 중' 여부 — 고정 표시가 있어도 종료일이 지났으면
    //   false 다. 화면은 날짜를 다시 계산하지 않는다(DEC-OPS-140). 게시판 목록·상세에서만 싣고 그 밖은 null 이다.
    @Schema(description = "지금 게시판 목록 맨 위에 고정 중인지(서버 판정, Asia/Seoul 오늘 기준). 게시판 목록·상세에서만 싣고 그 밖은 null",
            nullable = true, types = {"boolean", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    Boolean pinned,

    // [ADR-0040 결정 5] 고정 중인 글의 고정 종료일. 고정 중이 아니면(종료일이 지난 옛 고정 포함) null 이다.
    @Schema(description = "상단 고정 종료일(yyyyMMdd). 지금 고정 중일 때만 싣고 그 밖은 null", nullable = true,
            types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    String upendFixEndYmd
) {
}
