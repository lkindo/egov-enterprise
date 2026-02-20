package egovframework.com.cmm.service;

import java.util.List;

public interface EgovUserDetailsService {

	/**
	 * ?몄쬆???ъ슜?먭컼泥대? VO?뺤떇?쇰줈 媛?몄삩??
	 * @return Object - ?ъ슜??ValueObject
	 */
	public Object getAuthenticatedUser();

	/**
	 * ?몄쬆???ъ슜?먯쓽 沅뚰븳 ?뺣낫瑜?媛?몄삩??
	 * ?? [ROLE_ADMIN, ROLE_USER, ROLE_A, ROLE_B, ROLE_RESTRICTED, IS_AUTHENTICATED_FULLY, IS_AUTHENTICATED_REMEMBERED, IS_AUTHENTICATED_ANONYMOUSLY]
	 * @return List - ?ъ슜??沅뚰븳?뺣낫 紐⑸줉
	 */
	public List<String> getAuthorities();
	
	/**
	 * ?몄쬆???ъ슜???щ?瑜?泥댄겕?쒕떎.
	 * @return Boolean - ?몄쬆???ъ슜???щ?(TRUE / FALSE)	
	 */
	public Boolean isAuthenticated(); 

}
