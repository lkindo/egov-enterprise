package egovframework.com.cmm.resolver;

import java.util.HashMap;
import java.util.Map;

import egovframework.com.cmm.web.EgovComUtlController;
import lombok.extern.slf4j.Slf4j;

/**
 * Map????곸슜 ?뚮씪誘명꽣 蹂듯샇?붾? ?꾪븳 EgovSecurityMap ?대옒??
 * 
 * @author ?쒖??꾨젅?꾩썙?ы? ?좎슜??
 * @since 2024.07.09
 * @version 4.3.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2024.07.09  ?좎슜??         Map ??낆뿉??noteId 蹂듯샇???곸슜???꾪븳 EgovSecurityMap 異붽?
 *   2025.05.24  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SwitchStmtsShouldHaveDefault(?ㅼ쐞移?紐낅졊臾몄뿉??湲곕낯媛믪씠 ?덉뼱???⑸땲??), AvoidReassigningParameters(留ㅺ컻蹂???ы븷??諛⑹?)
 *
 *      </pre>
 * 
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??       ?섏젙?댁슜
 *  ----------     --------    ---------------------------
 *
 * 
 *      </pre>
 */
@Slf4j
public class EgovSecurityMap {

	Map<String, String> map = new HashMap<>();

	public String get(String key) {
		return map.get(key);
	}

	public void put(String key, String value) {
		String value2 = value;

		// ?뱀젙 ?뷀샇?붾맂 ?뚮씪誘명꽣 蹂듯샇??泥섎━
		switch (key) {
		case "noteId":

		case "noteTrnsmitId":

		case "noteRecptnId":

		case "reprtId":
			log.debug("===> {} : {}", key, value);
			value2 = EgovComUtlController.decryptId(value);
			break;

		default:
			break;
		}

		map.put(key, value2);
	}

	@Override
	public String toString() {
		return map.toString();
	}

}
