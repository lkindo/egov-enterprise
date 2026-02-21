package egovframework.com.cmm.web;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.springframework.beans.propertyeditors.CustomDateEditor;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.support.WebBindingInitializer;

/**
 * ??? ?? ???? ?????? ??? ?????
 * 
 * @author ???????? ????
 * @since 2022.12.22
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2022.12.22  ???         atchFileId ?????? ??
 *   2024.07.05  ???         reprtId noteId/noteTrnsmitId/noteRecptnId ???               ??      ?          ??   
 *   2025.05.29  ??     ??         PMD   ???      ?         ??            ??                ???     ???      ??      -SimpleDateFormatNeedsLocale(         ????      ? ?         ??         ????         ??      ??)
 *
 *      </pre>
 */
public class EgovBindingInitializer implements WebBindingInitializer {

	@Override
	public void initBinder(WebDataBinder binder) {
		SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault(Locale.Category.FORMAT));
		dateFormat.setLenient(false);
		binder.registerCustomEditor(Date.class, new CustomDateEditor(dateFormat, false));
		binder.registerCustomEditor(String.class, new StringTrimmerEditor(false));

		binder.registerCustomEditor(String.class, "atchFileId", new EgovAtchFileIdPropertyEditor());

		binder.registerCustomEditor(String.class, "reprtId", new EgovCipherIdPropertyEditor()); // ????? ??
		binder.registerCustomEditor(String.class, "noteId", new EgovCipherIdPropertyEditor()); // ????
		binder.registerCustomEditor(String.class, "noteTrnsmitId", new EgovCipherIdPropertyEditor()); // ????
		binder.registerCustomEditor(String.class, "noteRecptnId", new EgovCipherIdPropertyEditor()); // ????
	}

}
