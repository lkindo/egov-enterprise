package egovframework.com.cop.smt.mtm.service.impl;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cop.smt.mtm.service.EgovMemoTodoService;
import egovframework.com.cop.smt.mtm.service.MemoTodo;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * 硫붾え?좎씪?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 硫붾え?좎씪??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え?좎씪??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶, ?ㅻ뒛???좎씪議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:06
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("EgovMemoTodoService")
public class EgovMemoTodoServiceImpl extends EgovAbstractServiceImpl implements EgovMemoTodoService {

	@Resource(name = "MemoTodoDAO")
    private MemoTodoDAO memoTodoDAO;

	@Resource(name="egovMemoTodoIdGnrService")
	private EgovIdGnrService idgenServiceMemoTodo;

	/**
	 * 硫붾え?좎씪 紐⑸줉??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  Map<String, Object> - 硫붾え?좎씪 List
	 *
	 * @param memoTodoVO
	 */
	@Override
	public Map<String, Object> selectMemoTodoList(MemoTodoVO memoTodoVO) throws Exception{
		List<MemoTodoVO> result = memoTodoDAO.selectMemoTodoList(memoTodoVO);
		int cnt = memoTodoDAO.selectMemoTodoListCnt(memoTodoVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  MemoTodoVO - 硫붾え?좎씪 VO
	 *
	 * @param memoTodoVO - 硫붾え?좎씪 VO
	 */
	@Override
	public MemoTodoVO selectMemoTodo(MemoTodoVO memoTodoVO) throws Exception{
		return memoTodoDAO.selectMemoTodo(memoTodoVO);
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 *
	 * @param memoTodo - 硫붾え?좎씪 model
	 */
	@Override
	public void updateMemoTodo(MemoTodo memoTodo) throws Exception{
		memoTodoDAO.updateMemoTodo(memoTodo);
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 *
	 * @param memoTodo - 硫붾え?좎씪 model
	 */
	@Override
	public void insertMemoTodo(MemoTodo memoTodo) throws Exception{
		memoTodo.setTodoId(idgenServiceMemoTodo.getNextStringId());
		memoTodoDAO.insertMemoTodo(memoTodo);
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 *
	 * @param memoTodo - 硫붾え?좎씪 model
	 */
	@Override
	public void deleteMemoTodo(MemoTodo memoTodo) throws Exception{
		memoTodoDAO.deleteMemoTodo(memoTodo);
	}

	/**
	 * 硫붾え?좎씪 紐⑸줉 以??ㅻ뒛???좎씪??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  List<MemoTodoVO> - 硫붾え?좎씪 List
	 *
	 * @param memoTodoVO - 硫붾え?좎씪 VO
	 */
	@Override
	public List<MemoTodoVO> selectMemoTodoListToday(MemoTodoVO memoTodoVO) throws Exception{
		return memoTodoDAO.selectMemoTodoListToday(memoTodoVO);
	}

}