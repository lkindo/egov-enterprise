package nuri.business.domain.cms;

/** 게시본 파기의 트랜잭션 지역 표시. 불변 트리거는 이 표시가 켜진 동안에만 삭제를 받는다(ADR-0042, ADR-0047). */
public interface CmsRevisionPurgePermit {

    /** 지금 트랜잭션에서만 게시본 삭제를 허용한다. 트랜잭션이 끝나면 풀린다. */
    void allowPurgeInCurrentTransaction();
}
