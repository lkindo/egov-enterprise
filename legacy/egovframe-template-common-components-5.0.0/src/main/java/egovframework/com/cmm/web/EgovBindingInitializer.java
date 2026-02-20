package egovframework.com.cmm.web;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.springframework.beans.propertyeditors.CustomDateEditor;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.support.WebBindingInitializer;

/**
 * ?뚯씪 議고쉶, ??젣, ?ㅼ슫濡쒕뱶 泥섎━瑜??꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author ?쒖??꾨젅?꾩썙?ы? ?댁궪??
 * @since 2022.12.22
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2022.12.22  ?좎슜??         atchFileId ?뚮씪誘명꽣 異붽? 蹂댁셿
 *   2024.07.05  ?좎슜??         reprtId/noteId/noteTrnsmitId/noteRecptnId ?뚮씪誘명꽣 異붽? 蹂댁셿
 *   2025.05.29  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimpleDateFormatNeedsLocale(媛꾨떒???좎쭨 ?뺤떇??濡쒖틮???꾩슂?⑸땲??)
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

		binder.registerCustomEditor(String.class, "reprtId", new EgovCipherIdPropertyEditor()); // 硫붾え蹂닿퀬/二쇨컙/?붽컙 蹂닿퀬
		binder.registerCustomEditor(String.class, "noteId", new EgovCipherIdPropertyEditor()); // 履쎌?愿由?
		binder.registerCustomEditor(String.class, "noteTrnsmitId", new EgovCipherIdPropertyEditor()); // 履쎌?愿由?
		binder.registerCustomEditor(String.class, "noteRecptnId", new EgovCipherIdPropertyEditor()); // 履쎌?愿由?
	}

}
