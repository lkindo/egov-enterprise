package egovframework.com.uat.sso.service;

import java.io.IOException;

import egovframework.com.cmm.LoginVO;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;


/**
 *
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011. 8. 2.
 * @version 1.0
 * @see
 *
 * <pre>
 * 媛쒖젙?대젰(Modification Information)
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011. 8. 2.    ?쒖???       理쒖큹?앹꽦
 *
 *  </pre>
 */

public interface EgovSSOService {

	/**
	 * SSO ?듯빀 ?몄쬆 ?쒕쾭???몄쬆?щ?瑜??뺤씤 ?섎뒗 硫붿꽌??
	 *
	 */
	public boolean hasTokenInSSOServer(ServletRequest request, ServletResponse response);

	/**
	 * SSO ?듯빀 ?몄쬆 ?쒕쾭???몄쬆 ?좏겙 ?앹꽦???붿껌?섎뒗 硫붿꽌??
	 *
	 */
	public void requestIssueToken(ServletRequest request, ServletResponse response) throws Exception ;


	/**
	 * SSO ?듯빀 ?몄쬆 ?쒕쾭???몄쬆????寃쎌슦 ?몄쬆 ?쒕쾭???좏겙???쒖슜?섏뿬 濡쒖뺄 濡쒓렇?몄쓣 泥섎━?섎뒗 硫붿꽌??
	 *
	 */
	public void ssoLoginByServer(ServletRequest request, ServletResponse response) throws Exception;


	/**
	 * ?좏겙 ?뺣낫瑜?諛뷀깢?쇰줈  loginVO 媛앹껜瑜??앹꽦?섎뒗 硫붿꽌??
	 *
	 */
	public LoginVO getLoginVO(ServletRequest request, ServletResponse response);

	/**
	 * SSO ?듯빀 ?몄쬆 ?쒕쾭??湲濡쒕쾶 濡쒓렇?꾩썐(?좏겙 ??젣)???붿껌?섎뒗 硫붿꽌??
	 *
	 */
	public void ssoLogout(ServletRequest request, ServletResponse response, String returnURL) throws IOException;
}
