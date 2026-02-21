package egovframework.com.uss.ion.lsi.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.LoginScrinImage;
import com.company.project.domain.notification.LoginScrinImageRepository;

import egovframework.com.uss.ion.lsi.service.EgovLoginScrinImageService;
import egovframework.com.uss.ion.lsi.service.LoginScrinImageVO;
import jakarta.annotation.Resource;

@Service("egovLoginScrinImageService")
public class EgovLoginScrinImageServiceImpl extends EgovAbstractServiceImpl implements EgovLoginScrinImageService {

	@Resource(name = "loginScrinImageRepository")
	private LoginScrinImageRepository loginScrinImageRepository;

	@Resource(name = "egovLoginScrinImageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<LoginScrinImageVO> selectLoginScrinImageList(LoginScrinImageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<LoginScrinImage> page = loginScrinImageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectLoginScrinImageListTotCnt(LoginScrinImageVO searchVO) throws Exception {
		return (int) loginScrinImageRepository.count();
	}

	@Override
	public LoginScrinImageVO selectLoginScrinImage(LoginScrinImageVO searchVO) throws Exception {
		return loginScrinImageRepository.findById(searchVO.getImageId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public LoginScrinImageVO insertLoginScrinImage(
			egovframework.com.uss.ion.lsi.service.LoginScrinImage loginScrinImage, LoginScrinImageVO searchVO)
			throws Exception {
		String id = idgenService.getNextStringId();
		loginScrinImage.setImageId(id);

		LoginScrinImage entity = LoginScrinImage.builder()
				.imageId(id)
				.imageNm(loginScrinImage.getImageNm())
				.image(loginScrinImage.getImage())
				.imageFile(loginScrinImage.getImageFile())
				.imageDc(loginScrinImage.getImageDc())
				.reflctAt(loginScrinImage.getReflctAt())
				.frstRegisterId(loginScrinImage.getUserId())
				.build();

		loginScrinImageRepository.save(entity);
		return toVO(entity);
	}

	@Override
	public void updateLoginScrinImage(egovframework.com.uss.ion.lsi.service.LoginScrinImage searchVO) throws Exception {
		loginScrinImageRepository.findById(searchVO.getImageId()).ifPresent(entity -> {
			entity.update(searchVO.getImageNm(), searchVO.getImage(), searchVO.getImageFile(), searchVO.getImageDc(),
					searchVO.getReflctAt(), searchVO.getUserId());
			loginScrinImageRepository.save(entity);
		});
	}

	@Override
	public void deleteLoginScrinImage(egovframework.com.uss.ion.lsi.service.LoginScrinImage searchVO) throws Exception {
		loginScrinImageRepository.deleteById(searchVO.getImageId());
	}

	@Override
	public void deleteLoginScrinImageFile(egovframework.com.uss.ion.lsi.service.LoginScrinImage searchVO)
			throws Exception {
		// Just logic for deleting the record for now as simplified implementation
		deleteLoginScrinImage(searchVO);
	}

	@Override
	public List<LoginScrinImageVO> selectLoginScrinImageResult(LoginScrinImageVO searchVO) throws Exception {
		return loginScrinImageRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getReflctAt()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	private LoginScrinImageVO toVO(LoginScrinImage entity) {
		LoginScrinImageVO vo = new LoginScrinImageVO();
		vo.setImageId(entity.getImageId());
		vo.setImageNm(entity.getImageNm());
		vo.setImage(entity.getImage());
		vo.setImageFile(entity.getImageFile());
		vo.setImageDc(entity.getImageDc());
		vo.setReflctAt(entity.getReflctAt());
		vo.setUserId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setRegDate(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
