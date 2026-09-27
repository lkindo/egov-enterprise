/**
 * 오류 참조 번호(2026-09-27 DIP B5 F11).
 *
 * Next 는 서버에서 난 오류를 브라우저로 넘길 때 원문 대신 해시(digest)만 붙이고, 서버 로그에 같은 digest 를 남긴다.
 * 사용자가 이 번호를 알려 주면 운영자가 서버 로그에서 원인을 찾는다. 종전 오류 화면은 번호를 보이지 않아, 문의를
 * 받아도 어느 오류인지 짚을 수 없었다.
 *
 * ⚠ 번호는 Next 형식(숫자 해시)일 때만 보인다. 클라이언트 코드가 던진 오류 객체의 digest 는 누구나 채울 수 있어
 *   토큰·주소 같은 값이 실릴 수 있다 — 형식이 맞지 않으면 보이지 않는다(오류 원문도 보이지 않는다).
 */
const NEXT_DIGEST = /^\d{1,20}$/;

export function trustedErrorDigest(digest: unknown): string | null {
  return typeof digest === 'string' && NEXT_DIGEST.test(digest) ? digest : null;
}

export function ErrorReference({ digest, className }: { digest?: string; className?: string }) {
  const reference = trustedErrorDigest(digest);
  if (!reference) return null;
  return (
    <p className={className ?? 'text-xs text-muted-foreground'}>
      문의할 때 오류 참조 번호를 알려 주세요: <code className="font-mono select-all">{reference}</code>
    </p>
  );
}
