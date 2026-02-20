package egovframework.com.cmm.resolver;

import java.util.HashMap;
import java.util.Map;

import egovframework.com.cmm.web.EgovComUtlController;
import lombok.extern.slf4j.Slf4j;

/**
 * Map????? ??????? ? EgovSecurityMap ?????
 * 
 * @author ???????? ???
 * @since 2024.07.09
 * @version 4.3.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2024.07.09  ???         Map ??????noteId ??????? EgovSecurityMap ??
 *   2025.05.24  ????         PMD???????? ????????-SwitchStmtsShouldHaveDefault(??????? ????????), AvoidReassigningParameters(????????)
 *
 *      </pre>
 * 
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????       ????
 *  ----------     --------    ---------------------------
 *
 * 
 *      </pre>
 **/
@Slf4j
public class EgovSecurityMap {

	Map<String, String> map = new HashMap<>();

	public String get(String key) {
		return map.get(key);
	}

	public void put(String key, String value) {
		String value2 = value;

		// ?????? ?????????
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
