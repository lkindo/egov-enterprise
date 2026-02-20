package egovframework.com.cmm;

import java.util.Locale;

import org.springframework.context.MessageSource;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

/**
 * 硫붿떆吏 由ъ냼???ъ슜???꾪븳 MessageSource ?명꽣?섏씠??諛?ReloadableResourceBundleMessageSource ?대옒?ㅼ쓽 援ы쁽泥?
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?대Ц以          理쒖큹 ?앹꽦
 *   2017.07.21  ?λ룞??			args, locale ?ㅼ젙
 *
 * </pre>
 */

public class EgovMessageSource extends ReloadableResourceBundleMessageSource implements MessageSource {

	private ReloadableResourceBundleMessageSource reloadableResourceBundleMessageSource;

	/**
	 * getReloadableResourceBundleMessageSource() 
	 * @param reloadableResourceBundleMessageSource - resource MessageSource
	 * @return ReloadableResourceBundleMessageSource
	 */	
	public void setReloadableResourceBundleMessageSource(ReloadableResourceBundleMessageSource reloadableResourceBundleMessageSource) {
		this.reloadableResourceBundleMessageSource = reloadableResourceBundleMessageSource;
	}
	
	/**
	 * getReloadableResourceBundleMessageSource() 
	 * @return ReloadableResourceBundleMessageSource
	 */	
	public ReloadableResourceBundleMessageSource getReloadableResourceBundleMessageSource() {
		return reloadableResourceBundleMessageSource;
	}
	
	/**
	 * ?뺤쓽??硫붿꽭吏 議고쉶
	 * @param code - 硫붿꽭吏 肄붾뱶
	 * @return String
	 */	
	public String getMessage(String code) {
		return getReloadableResourceBundleMessageSource().getMessage(code, null, Locale.getDefault());
	}
	
	/**
	 * ?뺤쓽??硫붿꽭吏 議고쉶
	 * @param code - 硫붿꽭吏 肄붾뱶
	 * @param locale - 濡쒖???
	 * @return String
	 */	
	public String getMessage(String code, Locale locale) {
		return getReloadableResourceBundleMessageSource().getMessage(code, null, locale);
	}
	
	/**
	 * ?뺤쓽??硫붿꽭吏 議고쉶
	 * @param code - 硫붿꽭吏 肄붾뱶
	 * @param args - 留ㅺ컻蹂??
	 * @return String
	 */	
	public String getMessageArgs(String code, Object[] args) {
		return getReloadableResourceBundleMessageSource().getMessage(code, args, Locale.getDefault());
	}
	
	/**
	 * ?뺤쓽??硫붿꽭吏 議고쉶
	 * @param code - 硫붿꽭吏 肄붾뱶
	 * @param args - 留ㅺ컻蹂??
	 * @param locale - 濡쒖???
	 * @return String
	 */	
	public String getMessageArgsLocale(String code, Object[] args, Locale locale) {
		return getReloadableResourceBundleMessageSource().getMessage(code, args, locale);
	}

}
