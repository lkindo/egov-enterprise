package egovframework.com.cmm;

import java.util.Locale;

import org.springframework.context.support.ReloadableResourceBundleMessageSource;

/**
 * ?? ????????? MessageSource ??????ReloadableResourceBundleMessageSource
 * ????? ??
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.11  ??          ????
 *   2017.07.21  ???			args, locale ??
 *
 *      </pre>
 **/

public class EgovMessageSource extends ReloadableResourceBundleMessageSource {

	private ReloadableResourceBundleMessageSource reloadableResourceBundleMessageSource;

	/**
	 * getReloadableResourceBundleMessageSource()
	 * 
	 * @param reloadableResourceBundleMessageSource - resource MessageSource
	 * @return ReloadableResourceBundleMessageSource
	 **/
	public void setReloadableResourceBundleMessageSource(
			ReloadableResourceBundleMessageSource reloadableResourceBundleMessageSource) {
		this.reloadableResourceBundleMessageSource = reloadableResourceBundleMessageSource;
	}

	/**
	 * getReloadableResourceBundleMessageSource()
	 * 
	 * @return ReloadableResourceBundleMessageSource
	 **/
	public ReloadableResourceBundleMessageSource getReloadableResourceBundleMessageSource() {
		return reloadableResourceBundleMessageSource;
	}

	/**
	 * ????? ??
	 * 
	 * @param code - ?? ??
	 * @return String
	 **/
	public String getMessage(String code) {
		return getReloadableResourceBundleMessageSource().getMessage(code, null, Locale.getDefault());
	}

	/**
	 * ????? ??
	 * 
	 * @param code   - ?? ??
	 * @param locale - ???
	 * @return String
	 **/
	public String getMessage(String code, Locale locale) {
		return getReloadableResourceBundleMessageSource().getMessage(code, null, locale);
	}

	/**
	 * ????? ??
	 * 
	 * @param code - ?? ??
	 * @param args - ???
	 * @return String
	 **/
	public String getMessageArgs(String code, Object[] args) {
		return getReloadableResourceBundleMessageSource().getMessage(code, args, Locale.getDefault());
	}

	/**
	 * ????? ??
	 * 
	 * @param code   - ?? ??
	 * @param args   - ???
	 * @param locale - ???
	 * @return String
	 **/
	public String getMessageArgsLocale(String code, Object[] args, Locale locale) {
		return getReloadableResourceBundleMessageSource().getMessage(code, args, locale);
	}

}
