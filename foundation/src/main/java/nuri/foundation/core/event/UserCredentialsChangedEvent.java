package nuri.foundation.core.event;

/** 사용자 행 UPDATE 뒤 같은 트랜잭션에서 비밀번호 이전의 제한 인증 도전을 폐기한다. */
public record UserCredentialsChangedEvent(String esntlId) implements DomainEvent {}
