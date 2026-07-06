/**
 * 도메인 엔티티 공통 Hibernate 메타데이터 선언.
 *
 * <p>소프트삭제 동적 필터 정의({@code softDeleteFilter})를 이 패키지 레벨에 중앙 선언한다.
 * 개별 소프트삭제 대상 엔티티는 {@code @Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")}
 * 만 선언하면 되며, 필터의 활성/비활성은 {@code nuri.business.core.softdelete.SoftDeleteAspect} 가
 * 서비스/트랜잭션 경계에서 제어한다.
 *
 * <p>이전에는 {@code Board} 엔티티가 {@code @FilterDef} 를 호스팅하여 {@code Comment} 등 다른
 * 엔티티가 암묵적으로 의존했으나, 여기로 중앙화하여 결합을 제거했다.
 */
@org.hibernate.annotations.FilterDef(
        name = "softDeleteFilter",
        parameters = @org.hibernate.annotations.ParamDef(name = "useYn", type = String.class)
)
package nuri.business.domain;
