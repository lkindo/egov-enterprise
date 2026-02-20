package egovframework.com.cop.smt.mtm.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.mtm.service.MemoTodo;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;

/**
 * 媛쒖슂
 * - 硫붾え?좎씪?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붾え?좎씪??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え?좎씪??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:47
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("MemoTodoDAO")
public class MemoTodoDAO extends EgovComAbstractDAO {

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 硫붾え?좎씪 紐⑸줉??遺덈윭?⑤떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return List<MemoTodoVO> - 硫붾え?좎씪 List
	 * 
	 * @param memoTodoVO
	 */	
	public List<MemoTodoVO> selectMemoTodoList(MemoTodoVO memoTodoVO) throws Exception{
		List<MemoTodoVO> resultList = selectList("MemoTodoDAO.selectMemoTodoList", memoTodoVO);
		for(int i=0; i < resultList.size(); i++){
			MemoTodoVO resultVO = resultList.get(i);
			resultVO.setTodoDe(resultVO.getTodoBeginTime().substring(0,10));
			resultVO.setTodoBeginHour(resultVO.getTodoBeginTime().substring(10,12));
			resultVO.setTodoBeginMin(resultVO.getTodoBeginTime().substring(12,14));
			resultVO.setTodoEndHour(resultVO.getTodoEndTime().substring(10,12));
			resultVO.setTodoEndMin(resultVO.getTodoEndTime().substring(12,14));
			resultList.set(i, resultVO);
		}
		return resultList;
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 硫붾え?좎씪??遺덈윭?⑤떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return MemoTodoVO - 硫붾え?좎씪 VO
	 * 
	 * @param memoTodoVO
	 */
	public MemoTodoVO selectMemoTodo(MemoTodoVO memoTodoVO) throws Exception{
		MemoTodoVO resultVO = (MemoTodoVO)selectOne("MemoTodoDAO.selectMemoTodo", memoTodoVO);
		resultVO.setTodoDe(resultVO.getTodoBeginTime().substring(0,10));
		resultVO.setTodoBeginHour(resultVO.getTodoBeginTime().substring(10,12));
		resultVO.setTodoBeginMin(resultVO.getTodoBeginTime().substring(12,14));
		resultVO.setTodoEndHour(resultVO.getTodoEndTime().substring(10,12));
		resultVO.setTodoEndMin(resultVO.getTodoEndTime().substring(12,14));
		
		return resultVO;
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void updateMemoTodo(MemoTodo memoTodo) throws Exception{
		update("MemoTodoDAO.updateMemoTodo", memoTodo);
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void insertMemoTodo(MemoTodo memoTodo) throws Exception{
		insert("MemoTodoDAO.insertMemoTodo", memoTodo);
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void deleteMemoTodo(MemoTodo memoTodo) throws Exception{
		delete("MemoTodoDAO.deleteMemoTodo", memoTodo);
	}

	/**
	 * 硫붾え?좎씪 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return int - 硫붾え?좎씪 紐⑸줉 媛쒖닔
	 * 
	 * @param memoTodoVO
	 */
	public int selectMemoTodoListCnt(MemoTodoVO memoTodoVO) throws Exception{
		return (Integer)selectOne("MemoTodoDAO.selectMemoTodoListCnt", memoTodoVO);
	}
	
	/**
	 * 硫붾え?좎씪 紐⑸줉 以??ㅻ뒛???좎씪??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  List - 硫붾え?좎씪 List
	 * 
	 * @param memoTodoVO
	 */
	public List<MemoTodoVO> selectMemoTodoListToday(MemoTodoVO memoTodoVO) throws Exception{
		List<MemoTodoVO> resultList = selectList("MemoTodoDAO.selectMemoTodoListToday", memoTodoVO);
		for(int i=0; i < resultList.size(); i++){
			MemoTodoVO resultVO = resultList.get(i);
			resultVO.setTodoDe(resultVO.getTodoBeginTime().substring(0,10));
			resultVO.setTodoBeginHour(resultVO.getTodoBeginTime().substring(10,12));
			resultVO.setTodoBeginMin(resultVO.getTodoBeginTime().substring(12,14));
			resultVO.setTodoEndHour(resultVO.getTodoEndTime().substring(10,12));
			resultVO.setTodoEndMin(resultVO.getTodoEndTime().substring(12,14));
			resultList.set(i, resultVO);
		}
		return resultList;
	}

}