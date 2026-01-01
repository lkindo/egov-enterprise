package egovframework.com.cmm.util;

import java.util.List;

import egovframework.com.cmm.service.EgovUserDetailsService;
import com.company.project.api.config.ApplicationContextProvider;

/**
 * EgovUserDetails Helper 클래스
 *
 * @since 2009.06.01
 * @version 1.0
 * @author sjyoon
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자           수정내용
 *  -------    -------------    ----------------------
 *   2009.03.10  sjyoon         최초 생성
 *   2011.07.01	 서준식          interface 생성후 상세 로직의 분리
 *      </pre>
 */

public class EgovUserDetailsHelper {

	static EgovUserDetailsService egovUserDetailsService;

	public EgovUserDetailsService getEgovUserDetailsService() {
		return getService();
	}

	public void setEgovUserDetailsService(EgovUserDetailsService egovUserDetailsService) {
		EgovUserDetailsHelper.egovUserDetailsService = egovUserDetailsService;
	}

	private static EgovUserDetailsService getService() {
		if (egovUserDetailsService == null) {
			System.err.println(
					">>> EgovUserDetailsHelper: egovUserDetailsService is NULL, trying to find bean via ApplicationContextProvider...");

			// 1. Try by Class
			try {
				egovUserDetailsService = ApplicationContextProvider.getBean(EgovUserDetailsService.class);
			} catch (Exception e) {
				System.err.println(">>> EgovUserDetailsHelper: Failed to get bean by class: " + e.getMessage());
			}

			// 2. Try by Name
			if (egovUserDetailsService == null) {
				try {
					egovUserDetailsService = (EgovUserDetailsService) ApplicationContextProvider
							.getBean("egovUserDetailsService");
				} catch (Exception e) {
					System.err
							.println(">>> EgovUserDetailsHelper: Failed to get bean by name 'egovUserDetailsService': "
									+ e.getMessage());
				}
			}

			// 3. Fallback to Dummy to prevent NPE
			if (egovUserDetailsService == null) {
				System.err.println(
						">>> EgovUserDetailsHelper: CRITICAL - No EgovUserDetailsService bean found! Using Dummy implementation.");
				egovUserDetailsService = new EgovUserDetailsService() {
					@Override
					public Object getAuthenticatedUser() {
						return null;
					}

					@Override
					public java.util.List<String> getAuthorities() {
						return new java.util.ArrayList<String>();
					}

					@Override
					public Boolean isAuthenticated() {
						return false;
					}
				};
			} else {
				System.err.println(
						">>> EgovUserDetailsHelper: Found bean: " + egovUserDetailsService.getClass().getName());
			}
		}
		return egovUserDetailsService;
	}

	/**
	 * 인증된 사용자객체를 VO형식으로 가져온다.
	 * 
	 * @return Object - 사용자 ValueObject
	 */
	public static Object getAuthenticatedUser() {
		return getService().getAuthenticatedUser();
	}

	/**
	 * 인증된 사용자의 권한 정보를 가져온다.
	 *
	 * @return List - 사용자 권한정보 목록
	 */
	public static List<String> getAuthorities() {
		return getService().getAuthorities();
	}

	/**
	 * 인증된 사용자 여부를 체크한다.
	 * 
	 * @return Boolean - 인증된 사용자 여부(TRUE / FALSE)
	 */
	public static Boolean isAuthenticated() {
		return getService().isAuthenticated();
	}
}
