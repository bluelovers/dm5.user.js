// ==UserScript==
// @name         DM5漫画阅读器
// @namespace    http://tampermonkey.net/
// @version      2026-01-10
// @description  DM5漫画阅读器
// @author       bluelovers
// @match        https://www.dm5.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dm5.com
// @grant        none
// ==/UserScript==

(function ()
{
	'use strict';

	// ========================================
	// 工具函數
	// ========================================

	/**
	 * 防抖函數 - 延遲執行，在等待期間再次觸發會重置計時器
	 */
	function debounce(func, wait)
	{
		let timeout;
		return function ()
		{
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(context, args), wait);
		};
	}

	/**
	 * 節流函數 - 限制執行頻率，在指定時間內只執行一次
	 */
	function throttle(func, wait)
	{
		let lastTime = 0;
		return function ()
		{
			const now = Date.now();
			if (now - lastTime >= wait)
			{
				lastTime = now;
				func.apply(this, arguments);
			}
		};
	}

	/**
	 * 滾動到指定元素
	 */
	function scrollToElement(element)
	{
		if (element && element.length > 0)
		{
			element[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	/**
	 * 獲取圖片元素
	 */
	function getImages()
	{
		return document.querySelectorAll('#cp_image2, #cp_image');
	}

	/**
	 * 停止事件傳播，可選阻止默認行為
	 * @param {Event} event - 事件對象
	 * @param {boolean} [mode=false] - 是否允許默認行為
	 */
	function _uf_done(event, mode)
	{
		event.stopPropagation();
		if (!mode) event.preventDefault();
	}

// ========================================
// 主程式
// ========================================

// 只在漫畫閱讀頁面執行
if (!document.querySelector('body.vPage') && !document.querySelector('#showimage'))
{
	return;
}

let imgElements = getImages();

	// 創建頁數顯示的浮動元素
	const divPage = document.createElement('div');
	divPage.style.cssText = `
		position: absolute;
		background-color: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 14px;
		z-index: 10000;
		border: 1px solid rgba(255, 255, 255, 0.2);
	`;
	document.body.appendChild(divPage);

	// 添加樣式：工具欄透明度
	document.head.insertAdjacentHTML('beforeend', `
		<style>
			.rightToolBar { opacity: 0.1; }
			.rightToolBar:hover { opacity: 1; }
		</style>
	`);

	// ========================================
	// 事件處理器
	// ========================================

	/**
	 * 滾動到當前圖片視圖
	 */
	function scrollToImage()
	{
		const imgs = getImages();
		if (imgs.length > 0)
		{
			imgs[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	/**
	 * 觸發 resize（節流）
	 */
	const emitResize = throttle(300, () => {
		handleResize();
	});

	/**
 * 取得圖片尺寸 (naturalWidth / naturalHeight)
 * 在各種狀況下都能穩定回傳 Promise
 */
	function getImageSize(img)
	{
		return new Promise((resolve, reject) =>
		{
			let resolved = false;

			// 方法一：快取檢查
			if (img.complete && img.naturalWidth > 0)
			{
				resolved = true;
				return resolve({
					width: img.naturalWidth,
					height: img.naturalHeight,
					method: "cache"
				});
			}

			// 方法二：輪詢 (在 load 前可能就能拿到)
			const checkSize = setInterval(() =>
			{
				if (img.naturalWidth > 0 && img.naturalHeight > 0 && !resolved)
				{
					resolved = true;
					clearInterval(checkSize);
					resolve({
						width: img.naturalWidth,
						height: img.naturalHeight,
						method: "polling"
					});
				}
			}, 50);

			// 方法三：decode()（非同步解碼）
			img.decode().then(() =>
			{
				if (!resolved)
				{
					resolved = true;
					clearInterval(checkSize);
					resolve({
						width: img.naturalWidth,
						height: img.naturalHeight,
						method: "decode"
					});
				}
			}).catch(() =>
			{
				// decode 失敗時忽略，交給 onload/onerror
			});

			// 方法四：onload（保險做法）
			img.onload = () =>
			{
				if (!resolved)
				{
					resolved = true;
					clearInterval(checkSize);
					resolve({
						width: img.naturalWidth,
						height: img.naturalHeight,
						method: "onload"
					});
				}
			};

			// 方法五：onerror（錯誤處理）
			img.onerror = (e) =>
			{
				clearInterval(checkSize);
				if (!resolved)
				{
					reject(new Error("圖片載入失敗: " + src));
				}
			};
		});
	}

	/**
	 * 更新圖片樣式和頁數顯示
	 */
	function updateImageStyles()
	{
		imgElements = getImages();

		// 使用 getImageSize 調整每張圖片的尺寸
		imgElements.forEach(img => {
			adjustImageSize(img);
		});

		// 更新頁數顯示
		if (typeof unsafeWindow !== 'undefined' && unsafeWindow.DM5_PAGE && unsafeWindow.DM5_IMAGE_COUNT)
		{
			divPage.textContent = `${unsafeWindow.DM5_PAGE}/${unsafeWindow.DM5_IMAGE_COUNT}`;

			// 添加錨點（用於頁面跳轉）
			if (!document.querySelector(`#showimage #ipg${unsafeWindow.DM5_PAGE + 1}`))
			{
				const showimage = document.querySelector('#showimage');
				if (showimage)
				{
					const anchor = document.createElement('a');
					anchor.id = `ipg${unsafeWindow.DM5_PAGE + 1}`;
					anchor.name = `ipg${unsafeWindow.DM5_PAGE + 1}`;
					showimage.insertBefore(anchor, showimage.firstChild);
				}
			}
		}

		// 定位頁數顯示元素到圖片左上方
		if (imgElements.length > 0)
		{
			const img = imgElements[0];
			const imgRect = img.getBoundingClientRect();
			const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
			const scrollTop = window.scrollY || document.documentElement.scrollTop;

			divPage.style.top = `${scrollTop + imgRect.top + 50}px`;
			divPage.style.left = `${scrollLeft + imgRect.left - divPage.offsetWidth}px`;
		}
	}

	/**
	 * 處理窗口大小調整（用於 resize.scroll 事件）
	 */
	function handleResizeScroll()
	{
		imgElements = getImages();

		// 設置 #showimage 容器高度
		const showimage = document.querySelector('#showimage');
		if (showimage)
		{
			showimage.style.minHeight = `${window.innerHeight}px`;
		}

		// 設置 body 樣式
		document.body.style.minWidth = 'auto';
		document.body.style.backgroundColor = '#1a1a1a';

		// 滾動到圖片
		scrollToElement(getImages());
	}

	/**
	 * 處理窗口大小調整（主處理函數）
	 */
	function handleResize()
	{
		handleResizeScroll();
		updateImageStyles();
	}

	/**
	 * 處理鍵盤導航
	 */
	function handleKeydown(event)
	{
		const keycodes = { pageup: 33, left: 37, pagedown: 34, right: 39 };
		const key = event.which;

		if ([keycodes.pageup, keycodes.left].includes(key))
		{
			// 上一頁
			const preLinks = document.querySelectorAll('#s_pre a, a.s_pre');
			if (preLinks.length > 0)
			{
				_uf_done(event);
				preLinks[0].click();
				setTimeout(scrollToImage, 0);
			}
		}
		else if ([keycodes.pagedown, keycodes.right].includes(key))
		{
			// 下一頁
			const nextLinks = document.querySelectorAll('#s_next a, a.s_next, #last-win:visible a.view-btn-next');
			for (const link of nextLinks)
			{
				_uf_done(event);

				// 優先使用原生的 ShowNext 函數
				if (!link.classList.contains('view-btn-next') && typeof unsafeWindow !== 'undefined' && unsafeWindow.ShowNext)
				{
					unsafeWindow.ShowNext();
					setTimeout(scrollToImage, 0);
				}
				else
				{
					link.click();
				}
				break;
			}
		}

		setTimeout(handleResize, 300);
	}

	/**
	 * 處理圖片加載完成
	 */
	function handleImageLoad()
	{
		// 直接調用更新樣式
		updateImageStyles();
	}

	/**
	 * 處理圖片尺寸調整
	 */
	function adjustImageSize(img)
	{
		getImageSize(img).then(({ width, height }) => {
			// 根據窗口大小和圖片比例調整圖片顯示
			const containerWidth = window.innerWidth;
			const containerHeight = window.innerHeight;
			const aspectRatio = width / height;

			// 計算最適合的寬度
			let newWidth = Math.min(width, containerWidth - 40);
			let newHeight = newWidth / aspectRatio;

			// 如果高度超出視窗，則按高度調整
			if (newHeight > containerHeight - 40)
			{
				newHeight = containerHeight - 40;
				newWidth = newHeight * aspectRatio;
			}

			img.style.width = `${newWidth}px`;
			img.style.height = `${newHeight}px`;
			img.style.maxWidth = '100%';
		}).catch(err => {
			console.error('Failed to get image size:', err);
			// 回退到簡單的響應式樣式
			img.style.maxWidth = '100%';
			img.style.height = 'auto';
		});
	}

	/**
	 * 處理圖片點擊（觸發下一頁）
	 */
	function handleImageClick()
	{
		// 模擬 PageDown 鍵盤事件
		handleKeydown({ which: 34, keyCode: 34, preventDefault: () => {}, stopPropagation: () => {} });
	}

	// ========================================
	// DOM 監控
	// ========================================

	/**
	 * 使用 MutationObserver 等待圖片元素出現
	 */
	function waitForImages()
	{
		return new Promise((resolve, reject) => {
			imgElements = getImages();

			// 如果圖片已存在，直接返回
			if (imgElements.length > 0)
			{
				resolve(imgElements);
				return;
			}

			// 使用 MutationObserver 監聽 #showimage 的 DOM 變化
			const observer = new MutationObserver((mutations, obs) => {
				imgElements = getImages();
				if (imgElements.length > 0)
				{
					obs.disconnect();
					resolve(imgElements);
				}
			});

			// 監聽 #showimage 的 DOM 變化
			const showimage = document.querySelector('#showimage');
			if (showimage)
			{
				observer.observe(showimage, {
					childList: true,
					subtree: true
				});
			}
			else
			{
				// 如果 #showimage 不存在，監聽 body
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
			}

			// 設置超時，避免永久等待
			setTimeout(() => {
				observer.disconnect();
				reject(imgElements);
			}, 5000);
		}).then(initImages).catch(() => console.error('Failed to load images'));
	}

	// ========================================
	// 初始化圖片元素
	// ========================================

	/**
	 * 初始化圖片：移除右鍵限制，添加事件監聽，調整尺寸
	 */
	function initImages()
	{
		imgElements.forEach(img => {
			img.removeAttribute('oncontextmenu');
			img.addEventListener('load', handleImageLoad);
			img.addEventListener('click', handleImageClick);
			// 調整圖片尺寸
			adjustImageSize(img);
		});
	}

	/**
	 * 主要的圖片初始化邏輯
	 */
	function dm5()
	{
		waitForImages().then(() => {
			updateImageStyles();
		});
	}

// ========================================
// 事件監聽器綁定
// ========================================

// 窗口事件
window.addEventListener('resize', handleResize);
window.addEventListener('load', dm5);

// 鍵盤事件
window.addEventListener('keydown', handleKeydown);

// 監聽 #showimage DOM 變化（優化版）
const showimageObserver = new MutationObserver((mutations) => {
	// 檢查是否有與圖片相關的實際變化
	let hasImageChanges = false;

	for (const mutation of mutations)
	{
		// 只檢查添加的節點中是否包含圖片
		if (mutation.type === 'childList')
		{
			for (const node of mutation.addedNodes)
			{
				if (node.nodeType === Node.ELEMENT_NODE)
				{
					// 檢查是否為圖片元素或包含圖片
					if (node.id === 'cp_image' || node.id === 'cp_image2' ||
						node.tagName === 'IMG' ||
						node.querySelector?.('#cp_image, #cp_image2, img'))
					{
						hasImageChanges = true;
						break;
					}
				}
			}
		}

		if (hasImageChanges) break;
	}

	// 只有在有圖片相關變化時才執行
	if (hasImageChanges)
	{
		dm5();
		updateImageStyles();
		setTimeout(emitResize, 300);
	}
});

const showimage = document.querySelector('#showimage');
if (showimage)
{
	// 只監聽子節點變化，不監聽屬性變化以提升性能
	showimageObserver.observe(showimage, {
		childList: true,
		subtree: true
	});
}

// 初始化執行
dm5();
updateImageStyles();

})();
