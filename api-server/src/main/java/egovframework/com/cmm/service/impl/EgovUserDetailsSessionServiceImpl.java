package egovframework.com.cmm.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *
 * @author 공통서비스 개발팀 서준식
 * @since 2011. 6. 25.
 * @version 1.0
 * @see
 *
 *      <pre>
 * 개정이력(Modification Information)
 *
 *   수정일      수정자          수정내용
 *  -------    --------    ---------------------------
 *  2011. 8. 12.    서준식        최초생성
 *  2025. 01. 02.   Refactor    Session 직접 접근 방식으로 변경 (RTE 의존성 제거)
 *
 *      </pre>
 */

@Service("egovUserDetailsSessionService")
public class EgovUserDetailsSessionServiceImpl extends EgovAbstractServiceImpl implements EgovUserDetailsService {

	/**
	 * 인증된 사용자객체를 VO형식으로 가져온다.
	 * 
	 * @return Object - 사용자 ValueObject
	 */
	@Override
	public Object getAuthenticatedUser() {
		if (RequestContextHolder.getRequestAttributes() == null) {
			return null;
		}
		return RequestContextHolder.getRequestAttributes().getAttribute("LoginVO", RequestAttributes.SCOPE_SESSION);
	}

	@Override
	public List<String> getAuthorities() {
		// 권한 설정을 리턴한다.
		return new ArrayList<String>();
	}

	@Override
	public Boolean isAuthenticated() {
		// 인증된 유저인지 확인한다.
		if (RequestContextHolder.getRequestAttributes() == null) {
			return false;
		}

		Object loginVO = RequestContextHolder.getRequestAttributes().getAttribute("LoginVO",
				RequestAttributes.SCOPE_SESSION);
		return loginVO != null;
	}

}
