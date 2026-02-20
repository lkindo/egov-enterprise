package egovframework.com.cmm.util;

import java.util.List;

import egovframework.com.cmm.service.EgovUserDetailsService;
import com.company.project.core.config.ApplicationContextProvider;

/**
 * EgovUserDetails Helper ?????
 *
 * @since 2009.06.01
 * @version 1.0
 * @author sjyoon
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    -------------    ----------------------
 *   2009.03.10  sjyoon         ????
 *   2011.07.01	 ?????         interface ????? ?????
 *      </pre>
 **/

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
	 * ?????????? VO??? ???
	 * 
	 * @return Object - ?????ValueObject
	 **/
	public static Object getAuthenticatedUser() {
		return getService().getAuthenticatedUser();
	}

	/**
	 * ???????? ???????
	 *
	 * @return List - ?????? ?
	 **/
	public static List<String> getAuthorities() {
		return getService().getAuthorities();
	}

	/**
	 * ???????????????.
	 * 
	 * @return Boolean - ???????????(TRUE  FALSE)   
	 */
	public static Boolean isAuthenticated() {
		return getService().isAuthenticated();
	}
}
