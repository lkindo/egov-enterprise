package egovframework.com.utl.sys.fsm.service.impl;
import java.io.IOException;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.fsm.service.EgovFileSysMntrngService;
import egovframework.com.utl.sys.fsm.service.FileSysMntrng;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLog;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLogVO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@Service("EgovFileSysMntrngService")
public class EgovFileSysMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovFileSysMntrngService {

	@Resource(name = "FileSysMntrngDAO")
    private FileSysMntrngDAO fileSysMntrngDAO;

	@Resource(name="egovFileSysMntrngIdGnrService")
	private EgovIdGnrService idgenServiceFileSysMntrng;

	@Resource(name="egovFileSysMntrngLogIdGnrService")
	private EgovIdGnrService idgenServiceFileSysMntrngLog;
	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅???紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 * @return  Map<String, Object> - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 List
	 *
	 * @param fileSysMntrngVO
	 */
	@Override
	public Map<String, Object> selectFileSysMntrngList(FileSysMntrngVO fileSysMntrngVO) throws Exception{
		List<FileSysMntrngVO> result = fileSysMntrngDAO.selectFileSysMntrngList(fileSysMntrngVO);
		int cnt = fileSysMntrngDAO.selectFileSysMntrngListCnt(fileSysMntrngVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 議고쉶?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 * @return  FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???VO
	 *
	 * @param fileSysMntrngVO
	 */
	@Override
	public FileSysMntrngVO selectFileSysMntrng(FileSysMntrngVO fileSysMntrngVO) throws Exception{
		return fileSysMntrngDAO.selectFileSysMntrng(fileSysMntrngVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ?섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	@Override
	public void updateFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		fileSysMntrngDAO.updateFileSysMntrng(fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ?깅줉?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	@Override
	public void insertFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		fileSysMntrng.setFileSysId(idgenServiceFileSysMntrng.getNextStringId());
		fileSysMntrngDAO.insertFileSysMntrng(fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓣 ??젣?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	@Override
	public void deleteFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		fileSysMntrngDAO.deleteFileSysMntrng(fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ш린瑜?議고쉶?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 * @return  int
	 *
	 * @param fileSysMntrng
	 */
	@Override
	public int selectFileSysMg(FileSysMntrng fileSysMntrng) throws Exception{
		Path path = Paths.get("");
		FileStore fs = null;
		long usableSpaceBytes = 0;
		try {
			fs = Files.getFileStore(path);
			usableSpaceBytes = fs.getUsableSpace();
		} catch (IOException e) {
			egovLogger.error("IOException");
		}
		long usableSpaceKb = usableSpaceBytes / 1024;
		return  Math.toIntExact(usableSpaceKb);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 寃곌낵瑜??섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪??紐⑤땲?곕쭅???model
	 *
	 * @param fileSysMntrng
	 */
	@Override
	public void updateFileSysMntrngSttus(FileSysMntrng fileSysMntrng) throws Exception{
		fileSysMntrngDAO.updateFileSysMntrngSttus(fileSysMntrng);

		FileSysMntrngLog fileSysMntrngLog = new FileSysMntrngLog();
		fileSysMntrngLog.setFileSysId(fileSysMntrng.getFileSysId());
		fileSysMntrngLog.setLogId(idgenServiceFileSysMntrngLog.getNextStringId());
		fileSysMntrngLog.setFileSysNm(fileSysMntrng.getFileSysNm());
		fileSysMntrngLog.setFileSysManageNm(fileSysMntrng.getFileSysManageNm());
		fileSysMntrngLog.setFileSysMg(fileSysMntrng.getFileSysMg());
		fileSysMntrngLog.setFileSysThrhld(fileSysMntrng.getFileSysThrhld());
		fileSysMntrngLog.setFileSysUsgQty(fileSysMntrng.getFileSysUsgQty());
		fileSysMntrngLog.setLogInfo(fileSysMntrng.getLogInfo());
		fileSysMntrngLog.setMntrngSttus(fileSysMntrng.getMntrngSttus());
		fileSysMntrngLog.setCreatDt(fileSysMntrng.getCreatDt());
		insertFileSysMntrngLog(fileSysMntrngLog);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  Map<String, Object> - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 List
	 *
	 * @param fileSysMntrngLogVO
	 */
	@Override
	public Map<String, Object> selectFileSysMntrngLogList(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception{
		List<FileSysMntrngLogVO> result = fileSysMntrngDAO.selectFileSysMntrngLogList(fileSysMntrngLogVO);
		int cnt = fileSysMntrngDAO.selectFileSysMntrngLogListCnt(fileSysMntrngLogVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  FileSysMntrngLogVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 VO
	 *
	 * @param fileSysMntrngLogVO
	 */
	@Override
	public FileSysMntrngLogVO selectFileSysMntrngLog(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception{
		return fileSysMntrngDAO.selectFileSysMntrngLog(fileSysMntrngLogVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇瑜??깅줉?쒕떎.
	 * @param FileSysMntrngLog - ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 model
	 *
	 * @param fileSysMntrngLog
	 */
	@Override
	public void insertFileSysMntrngLog(FileSysMntrngLog fileSysMntrngLog) throws Exception{
		fileSysMntrngDAO.insertFileSysMntrngLog(fileSysMntrngLog);
	}

}