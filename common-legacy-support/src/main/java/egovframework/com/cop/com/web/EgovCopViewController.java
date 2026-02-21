package egovframework.com.cop.com.web;

import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * ? ?? ??????? ?????
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.4.10  ????         ????
 *
 * </pre>
 **/
@Controller
public class EgovCopViewController {

	/**
	 * ?? ???????.
	 *
	 * @param userVO
	 * @param sessionVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/cop/com/openPopup.do")
	public String openPopupWindow(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		String requestUrl = (String) commandMap.get("requestUrl");
		String trgetId = (String) commandMap.get("trgetId");
		String width = (String) commandMap.get("width");
		String height = (String) commandMap.get("height");
		String typeFlag = (String) commandMap.get("typeFlag");

		if (trgetId != null && trgetId != "") {
			if (typeFlag != null && typeFlag != "") {
				model.addAttribute("requestUrl", requestUrl + "?trgetId=" + trgetId + "&PopFlag=Y&typeFlag=" + typeFlag);
			} else {
				model.addAttribute("requestUrl", requestUrl + "?trgetId=" + trgetId + "&PopFlag=Y");
			}
		} else {
			if (typeFlag != null && typeFlag != "") {
				model.addAttribute("requestUrl", requestUrl + "?PopFlag=Y&typeFlag=" + typeFlag);
			} else {
				model.addAttribute("requestUrl", requestUrl + "?PopFlag=Y");
			}

		}

		model.addAttribute("width", width);
		model.addAttribute("height", height);

		return "egovframework/com/cop/com/EgovModalPopupFrame";
	}
}
