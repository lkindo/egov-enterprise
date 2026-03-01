package egovframework.com.uss.ion.ism.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.ism.service.SanctnerVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * ?쎌떇寃곗옱愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쎌떇寃곗옱愿由ъ뿉 ????깅줉, ?섏젙, ??젣湲곕뒫???쒓났?쒕떎.
 * - 寃곗옱?먯뿉 ???紐⑸줉議고쉶湲곕뒫???쒓났?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:26
 */

@Service("EgovInfrmlSanctnService")
public class EgovInfrmlSanctnServiceImpl extends EgovAbstractServiceImpl implements EgovInfrmlSanctnService {

	@Resource(name = "InfrmlSanctnDAO")
    private InfrmlSanctnDAO infrmlSanctnDAO;

	@Resource(name="egovInfrmlSanctnIdGnrService")
	private EgovIdGnrService idgenServiceInfrmlSanctn;
	/**
	 * 寃곗옱??紐⑸줉??議고쉶?쒕떎.
	 * @param SanctnerVO
	 * @return  Map<String, Object>
	 *
	 * @param sanctnerVO
	 */
	@Override
	public Map<String, Object> selectSanctnerList(SanctnerVO sanctnerVO) throws Exception{
		List<SanctnerVO> result = infrmlSanctnDAO.selectSanctnerList(sanctnerVO);
		int cnt = infrmlSanctnDAO.selectSanctnerListCnt(sanctnerVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?쎌떇寃곗옱 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param InfrmlSanctnVO
	 * @return  InfrmlSanctnVO
	 *
	 * @param infrmlSanctnVO
	 */
	@Override
	public InfrmlSanctn selectInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		InfrmlSanctn result = infrmlSanctnDAO.selectInfrmlSanctn(infrmlSanctn);
		if(result.getSanctnDt() != null && !result.getSanctnDt().equals("")){
			if(result.getSanctnDt().length() > 18){
				result.setSanctnDt(result.getSanctnDt().substring(0, 19));
			}
		}
		return result;
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param InfrmlSanctn
	 *
	 * @param infrmlSanctn
	 */
	@Override
	public InfrmlSanctn updateInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		infrmlSanctnDAO.updateInfrmlSanctn(infrmlSanctn);
		return selectInfrmlSanctn(infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??뱀씤?쒕떎.
	 * @param InfrmlSanctn
	 *
	 * @param infrmlSanctn
	 */
	@Override
	public InfrmlSanctn updateInfrmlSanctnConfm(InfrmlSanctn infrmlSanctn) throws Exception{
		infrmlSanctn.setConfmAt("C");
		infrmlSanctnDAO.updateInfrmlSanctnConfm(infrmlSanctn);

		return selectInfrmlSanctn(infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜?諛섎젮?쒕떎.
	 * @param InfrmlSanctn
	 *
	 * @param infrmlSanctn
	 */
	@Override
	public InfrmlSanctn updateInfrmlSanctnReturn(InfrmlSanctn infrmlSanctn) throws Exception{
		infrmlSanctn.setConfmAt("R");
		infrmlSanctnDAO.updateInfrmlSanctnConfm(infrmlSanctn);

		return selectInfrmlSanctn(infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??깅줉?쒕떎.
	 * @param InfrmlSanctn
	 *
	 * @param infrmlSanctn
	 */
	@Override
	public InfrmlSanctn insertInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		infrmlSanctn.setInfrmlSanctnId(idgenServiceInfrmlSanctn.getNextStringId());
		infrmlSanctn.setConfmAt("A");
		infrmlSanctnDAO.insertInfrmlSanctn(infrmlSanctn);

		return selectInfrmlSanctn(infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜???젣?쒕떎.
	 * @param InfrmlSanctn
	 *
	 * @param infrmlSanctn
	 */
	@Override
	public void deleteInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		infrmlSanctnDAO.deleteInfrmlSanctn(infrmlSanctn);
	}

}
