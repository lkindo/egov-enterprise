package egovframework.com.utl.sim.service;

import java.security.MessageDigest;
import org.apache.commons.codec.binary.Base64;

/**
 * 전자정부 표준프레임워크 레거시 비밀번호 해시(SHA-256, 사용자 ID 를 salt 로 앞에 붙임)를 계산한다.
 *
 * <p>남은 소비처는 레거시 해시 계정의 로그인 검증({@code EgovPasswordEncoder})뿐이다.
 * 해시 형식(기본 문자셋 바이트·{@code md.update(id)} 순서·Base64)은 기존 저장값과의 호환 계약이므로 바꾸지 않는다.</p>
 *
 * @author 공통서비스 개발팀
 * @since 2009.01.19
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자              수정내용
 *  -------    --------    ---------------------------
 *   2009.01.19  박지욱             최초 생성
 *   2011.08.31  JJY            경량환경 템플릿 커스터마이징버전 생성
 *   2026.10.07  -              레거시 비밀번호 해시 외 미사용 멤버(Base64 파일 변환·무염 해시 등) 제거
 *
 *      </pre>
 */
public class EgovFileScrty {

	public static String encryptPassword(String password, String id) throws Exception {

		if (password == null) {
			return "";
		}

		byte[] hashValue = null; // 해시값

		MessageDigest md = MessageDigest.getInstance("SHA-256");

		md.reset();
		md.update(id.getBytes());

		hashValue = md.digest(password.getBytes());

		return new String(Base64.encodeBase64(hashValue));
	}
}
