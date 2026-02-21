package egovframework.com.cmm.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *
 * @author ???????? ?????
 * @since 2011. 6. 25.
 * @version 1.0
 * @see
 *
 *      <pre>
 * ?????Modification Information)
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2011. 8. 12.    ?????       ???
 *  2025. 01. 02.   Refactor    Session ??? ??? ?(RTE ??????)
 *
 *      </pre>
 **/

@Service("egovUserDetailsService")
public class EgovUserDetailsSessionServiceImpl extends EgovAbstractServiceImpl implements EgovUserDetailsService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovUserDetailsSessionServiceImpl.class);

	/**
	 * ?????????? VO??? ???
	 * 
	 * @return Object - ?????ValueObject
	 **/
	@Override
	public Object getAuthenticatedUser() {
		if (RequestContextHolder.getRequestAttributes() == null) {
			LOGGER.debug(">>> EgovUserDetailsSessionServiceImpl.getAuthenticatedUser: RequestAttributes is NULL");
			return null;
		}
		Object loginVO = RequestContextHolder.getRequestAttributes().getAttribute("LoginVO",
				RequestAttributes.SCOPE_SESSION);
		LOGGER.debug(">>> EgovUserDetailsSessionServiceImpl.getAuthenticatedUser: Retrieved LoginVO from session: {}",
				loginVO);
		return loginVO;
	}

	@Override
	public List<String> getAuthorities() {
		// ????????.
		return new ArrayList<String>();
	}

	@Override
	public Boolean isAuthenticated() {
		// ??????? ???.
		if (RequestContextHolder.getRequestAttributes() == null) {
			LOGGER.debug(">>> EgovUserDetailsSessionServiceImpl.isAuthenticated: RequestAttributes is NULL");
			return false;
		}

		Object loginVO = RequestContextHolder.getRequestAttributes().getAttribute("LoginVO",
				RequestAttributes.SCOPE_SESSION);
		if (loginVO == null) {
			// Check for lowercase 'loginVO' just in case
			loginVO = RequestContextHolder.getRequestAttributes().getAttribute("loginVO",
					RequestAttributes.SCOPE_SESSION);
		}

		LOGGER.debug(">>> EgovUserDetailsSessionServiceImpl.isAuthenticated: LoginVO present? {}", (loginVO != null));
		return loginVO != null;
	}

}
