package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 업무 홈 맨 위 소개. 지정이 없는 것이 기본이라 응답은 늘 이 객체이고, 보일 게시본이 없으면 {@code page} 가 비어 있다 —
 * 응답 본문 자체를 비우면 생성 계약이 "없음"과 "계약 위반"을 가르지 못한다.
 *
 * @param page 보일 게시본(지정이 없거나 게시 중이 아니면 없음)
 */
@Schema(description = "업무 홈 소개")
public record CmsHomeIntroDto(@Schema(description = "보일 게시본. 지정이 없거나 게시 중이 아니면 비어 있다") CmsPublishedPageDto page) {
}
