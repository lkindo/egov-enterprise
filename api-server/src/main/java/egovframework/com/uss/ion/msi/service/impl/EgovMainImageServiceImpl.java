package egovframework.com.uss.ion.msi.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.MainImage;
import com.company.project.domain.notification.MainImageRepository;

import egovframework.com.uss.ion.msi.service.EgovMainImageService;
import egovframework.com.uss.ion.msi.service.MainImageVO;
import jakarta.annotation.Resource;

@Service("egovMainImageService")
public class EgovMainImageServiceImpl extends EgovAbstractServiceImpl implements EgovMainImageService {

	@Resource(name = "mainImageRepository")
	private MainImageRepository mainImageRepository;

	@Resource(name = "egovMainImageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<MainImageVO> selectMainImageList(MainImageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<MainImage> page = mainImageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectLoginScrinImageListTotCnt(MainImageVO searchVO) throws Exception {
		return (int) mainImageRepository.count();
	}

	@Override
	public MainImageVO selectMainImage(MainImageVO searchVO) throws Exception {
		return mainImageRepository.findById(searchVO.getImageId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public MainImageVO insertMainImage(egovframework.com.uss.ion.msi.service.MainImage mainImage, MainImageVO searchVO)
			throws Exception {
		String id = idgenService.getNextStringId();
		mainImage.setImageId(id);

		MainImage entity = MainImage.builder()
				.imageId(id)
				.imageNm(mainImage.getImageNm())
				.image(mainImage.getImage())
				.imageFile(mainImage.getImageFile())
				.imageDc(mainImage.getImageDc())
				.reflctAt(mainImage.getReflctAt())
				.frstRegisterId(mainImage.getUserId())
				.build();

		mainImageRepository.save(entity);
		return toVO(entity);
	}

	@Override
	public void updateMainImage(egovframework.com.uss.ion.msi.service.MainImage searchVO) throws Exception {
		mainImageRepository.findById(searchVO.getImageId()).ifPresent(entity -> {
			entity.update(searchVO.getImageNm(), searchVO.getImage(), searchVO.getImageFile(), searchVO.getImageDc(),
					searchVO.getReflctAt(), searchVO.getUserId());
			mainImageRepository.save(entity);
		});
	}

	@Override
	public void deleteMainImage(egovframework.com.uss.ion.msi.service.MainImage searchVO) throws Exception {
		mainImageRepository.deleteById(searchVO.getImageId());
	}

	@Override
	public void deleteMainImageFile(egovframework.com.uss.ion.msi.service.MainImage searchVO) throws Exception {
		deleteMainImage(searchVO);
	}

	@Override
	public List<MainImageVO> selectMainImageResult(MainImageVO searchVO) throws Exception {
		return mainImageRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getReflctAt()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	private MainImageVO toVO(MainImage entity) {
		MainImageVO vo = new MainImageVO();
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
