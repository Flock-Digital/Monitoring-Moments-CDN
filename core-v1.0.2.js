////////////////// Carousel	(Splide)
	
function loadSplideLibrary() {
	return new Promise((resolve, reject) => {
		if (window.Splide) {
			resolve(window.Splide);
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js';
		script.async = true;

		script.onload = function() {
			resolve(window.Splide);
		};

		script.onerror = function() {
			reject(new Error('Failed to load Splide library'));
		};

		document.head.appendChild(script);
	});
}

function initCarousels() {
	const globalOptions = {
		type: 'slide',
		perMove: 1,
		drag: false,
		arrows: true,
		pagination: true,
		autoWidth: true,
		rewind: false,
		rewindByDrag: false,
		speed: 600,
		easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
		gap: '0rem',
		breakpoints: {
			478: {

			},
			767: {

			},
			991: {

			}
		}
	};

	const optionSets = {
		'default': {
		},
		'option-set-one': {
		}
	};

	const carousels = document.getElementsByClassName('splide');

	for (var i = 0; i < carousels.length; i++) {
		const optionSetName = carousels[i].getAttribute('data-carousel-option-set') || 'default';
		const specificOptions = optionSets[optionSetName] || optionSets['default'];

		const mergedOptions = {...globalOptions, ...specificOptions};

		var splide = new Splide(carousels[i], mergedOptions);
		splide.mount();
		
		carousels[i].splide = splide;
	}
}

function checkAndInitCarousels() {
	const carousels = document.getElementsByClassName('splide');

	if (carousels.length > 0) {
		loadSplideLibrary()
		.then(() => {
			initCarousels();
		})
		.catch(error => {
			console.error('Error loading Splide library:', error);
		});
	}
}

  
	const allowCookies = false;

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Mobile Menu

	function toggleMobileNav() {
		const hamburger = document.querySelector('.hamburger');
		const navMenu = document.querySelector('.nav-menu');
		const navOverlay = document.querySelector('.nav-overlay');
		
		if (hamburger && navMenu && navOverlay) {
			const isActive = !navMenu.classList.contains('cc-active');        
			hamburger.classList.toggle('is-active', isActive);
			navMenu.classList.toggle('cc-active', isActive);
			navOverlay.classList.toggle('cc-show', isActive);
			
			isActive ? disableScroll() : enableScroll();
		}
	}

	function bindMobileNavEvents() {
		document.querySelectorAll('.nav-trigger, .nav-overlay').forEach(element => {
			element.addEventListener('click', toggleMobileNav);
		});
		
		// Prevent touchmove when navigation is active
		document.addEventListener('touchmove', (e) => {
			if (document.querySelector('.nav-menu')?.classList.contains('cc-active')) {
				e.preventDefault();
			}
		}, { passive: false });	
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Scroll disable/enable

	let scrollPosition = 0;

	function disableScroll() {
		scrollPosition = window.pageYOffset;
		Object.assign(document.body.style, {
			overflowY: 'scroll',
			position: 'fixed',
			top: `-${scrollPosition}px`,
			width: '100%'
		});
	}

	function enableScroll() {
		Object.assign(document.body.style, {
			overflowY: '',
			position: '',
			top: '',
			width: ''
		});
		window.scrollTo(0, scrollPosition);
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Fixed Navigation Helper (Adjust first section padding)

	const originalPaddingByBreakpoint = {};


	function getCurrentBreakpoint() {
		const width = window.innerWidth;

		if (width < 576) return 'xs';
		if (width < 768) return 'sm';
		if (width < 992) return 'md';
		if (width < 1200) return 'lg';
		return 'xl';
	}

	function adjustSectionPadding() {
		const navigation = document.querySelector('.navigation');
		const firstSection = document.querySelector('section');

		if (navigation && navigation.getAttribute('data-fixed') === 'true') {
			if (firstSection) {
				firstSection.style.paddingTop = '';

				const originalPadding = parseInt(window.getComputedStyle(firstSection).paddingTop, 10) || 0;
				const navHeight = navigation.offsetHeight;
				const newPadding = originalPadding + navHeight;

				firstSection.style.paddingTop = newPadding + 'px';
			}
		}
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Create custom Lightbox

	function initCustomLightBoxes() {
		
		const videoLightboxes = document.querySelectorAll('.video.cc-lightbox');

		videoLightboxes.forEach(lightbox => {
			const backgroundEmbedSource = lightbox.querySelector('[data-video-background-embed="source"]');
			const backgroundEmbedTarget = lightbox.querySelector('[data-video-background-embed="target"]');
			const openButton = lightbox.querySelector('.btn-play');
			const lightboxElement = lightbox.querySelector('.lightbox');
			const lightboxVideo = lightbox.querySelector('.lightbox .lightbox-video-container');
			const videoImage = lightbox.querySelector('.video-bg-container .video-image');	
			const lightboxOverlay = lightbox.querySelector('.lightbox .lightbox-overlay');	
			const lightboxEmbedSource = lightbox.querySelector('[data-video-lightbox-embed="source"]');
			const lightboxEmbedTarget = lightbox.querySelector('[data-video-lightbox-embed="target"]');	
			const closeButtons = lightbox.querySelectorAll('[data-video-lightbox-action="close"]');

			if (backgroundEmbedSource && backgroundEmbedTarget) {
				const backgroundEmbedCode = backgroundEmbedSource.textContent || backgroundEmbedSource.value;

				if (backgroundEmbedCode) {
					backgroundEmbedTarget.innerHTML = backgroundEmbedCode;

					setTimeout(() => {
						if (videoImage) {
							videoImage.classList.add('cc-hide');
						}		
					}, 2000);		
				}
			}

			let lightboxEmbedCode = '';

			if (lightboxEmbedSource) {
				lightboxEmbedCode = lightboxEmbedSource.textContent || lightboxEmbedSource.value;
			}

			if (openButton && lightboxElement) {
				openButton.addEventListener('click', function(e) {
				e.preventDefault();

					if (lightboxEmbedTarget && lightboxEmbedCode) {
						lightboxEmbedTarget.innerHTML = lightboxEmbedCode;
					}

					lightboxElement.classList.add('cc-show');

					setTimeout(() => {
						if (lightboxOverlay) {
							lightboxOverlay.classList.add('cc-show');
						}

						disableScroll()

						setTimeout(() => {
							if (lightboxVideo) {
								lightboxVideo.classList.add('cc-show');
							}		
						}, 500);
					}, 100);		

				});

				closeButtons.forEach(closeButton => {
					closeButton.addEventListener('click', function(e) {

						e.preventDefault();

						lightboxElement.classList.remove('cc-show');
						enableScroll()

						setTimeout(() => {
							if (lightboxVideo) {
								lightboxVideo.classList.remove('cc-show');
							}			  

							if (lightboxOverlay) {
								lightboxOverlay.classList.remove('cc-show');
							}

							if (lightboxEmbedTarget) {
								lightboxEmbedTarget.innerHTML = '';
							}
						}, 500);		  
					});
				});
			}
		});
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Modals

	function openModal(event) {
		event.preventDefault();

		const targetModalId = this.getAttribute('data-modal-target');
		const targetModal = document.getElementById(targetModalId);

		if (!targetModal) {
			console.error(`Modal with ID ${targetModalId} not found`);
			return;
		}

		document.querySelector('.page-modals').classList.add('cc-show');
		document.querySelector('.modal-overlay').classList.add('cc-show');
		targetModal.classList.add('cc-show');
	}
  
  	function closeAllModals(){
		document.querySelectorAll('.modal').forEach(modal => {
			modal.classList.remove('cc-show');
		});

		document.querySelector('.modal-overlay').classList.remove('cc-show');

		setTimeout(() => {
			document.querySelector('.page-modals').classList.remove('cc-show');
		}, 500);      
    }

	function closeModal(event) {
		event.preventDefault();
		
      	closeAllModals();
	}


	function initModals() {
		const modalOpeners = document.querySelectorAll('[data-modal-target]:not([data-modal-target="none"])[data-modal-action="open"]');

		modalOpeners.forEach(opener => {
			opener.addEventListener('click', openModal);
		});

		const modalClosers = document.querySelectorAll('[data-modal-action="close"]');
		modalClosers.forEach(closer => {
			closer.addEventListener('click', closeModal);
		});

		const modalOverlay = document.querySelector('.modal-overlay');
		if (modalOverlay) {
			modalOverlay.addEventListener('click', closeModal);
		}
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Toggles

	function initToggles() {
		const toggleBases = document.querySelectorAll('.toggle-base');

		toggleBases.forEach(function(toggleBase) {
			toggleBase.addEventListener('click', function() {
				const toggleThumb = this.querySelector('.toggle-thumb');

				if (toggleThumb) {
					this.classList.toggle('cc-active');
					toggleThumb.classList.toggle('cc-active');
				}
			});
		});	
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////  Cookie banner and consent

	window.dataLayer = window.dataLayer || [];
	function gtag(){window.dataLayer.push(arguments);}

	function loadNecessaryScripts(){
		
		////////// Load the gtag.js script
		const gtagScript = document.createElement('script');
		gtagScript.async = true;
		gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-X3VMXZH2FC";
		document.head.appendChild(gtagScript);

		const statisticsConsent = localStorage.getItem('cookies_statistics_status') === 'true' ? 'granted' : 'denied';
		const marketingConsent = localStorage.getItem('cookies_marketing_status') === 'true' ? 'granted' : 'denied';

		gtag('consent', 'default', {
		  'analytics_storage': statisticsConsent,
		  'ad_storage': marketingConsent
		});

		gtag('js', new Date());
		gtag('config', 'G-X3VMXZH2FC');
	}

	function loadPreferenceScripts(){

	}

	function disablePreferenceScripts(){
		
	}

	function loadStatisticsScripts(){
		gtag('consent', 'update', {
			'analytics_storage': 'granted'
		});
	}

	function disableStatisticsScripts(){	
		gtag('consent', 'update', {
			'analytics_storage': 'denied'
		});		
	}

	function loadMarketingScripts(){
		gtag('consent', 'update', {
			'ad_storage': 'granted'
		});		
	}

	function disableMarketingScripts(){
		gtag('consent', 'update', {
			'ad_storage': 'denied'
		});	
	}


	function handlePreferenceChanges(oldPreferences, oldStatistics, oldMarketing) {
		const newPreferences = localStorage.getItem('cookies_preferences_status');
		const newStatistics = localStorage.getItem('cookies_statistics_status');
		const newMarketing = localStorage.getItem('cookies_marketing_status');
		
		if (oldPreferences !== newPreferences || 
			oldStatistics !== newStatistics || 
			oldMarketing !== newMarketing) {

			window.location.reload();
			return true;
		}
		
		return false;
	}

	function getStoredPreferences() {
		return {
			allowed: localStorage.getItem('cookies_accept_status'),
			necessary: localStorage.getItem('cookies_necessary_status'),
			preferences: localStorage.getItem('cookies_preferences_status'),
			statistics: localStorage.getItem('cookies_statistics_status'),
			marketing: localStorage.getItem('cookies_marketing_status')
		};
	}

	function acceptAllCookies() {
		
		const oldValues = getStoredPreferences();
		
		localStorage.setItem('cookies_accept_status', 'true');
		
		localStorage.setItem('cookies_necessary_status', 'true');
		localStorage.setItem('cookies_preferences_status', 'true');
		localStorage.setItem('cookies_statistics_status', 'true');
		localStorage.setItem('cookies_marketing_status', 'true');
		
		if (oldValues.allowed === null || oldValues.allowed === 'false') {
			loadPreferenceScripts();
			loadStatisticsScripts();
			loadMarketingScripts();
		}		
		
		closeCookieControls();
		
		if (oldValues.allowed){
			handlePreferenceChanges(oldValues.preferences, oldValues.statistics, oldValues.marketing);
		}
	}

	function acceptSelectedCookies() {
		
		const oldValues = getStoredPreferences();
		
		localStorage.setItem('cookies_accept_status', 'true');
		localStorage.setItem('cookies_necessary_status', 'true');
		
		const preferencesToggle = document.querySelector('#cookies-preferences');
		localStorage.setItem('cookies_preferences_status', preferencesToggle.classList.contains('cc-active') ? 'true' : 'false');
		
		if ((preferencesToggle.classList.contains('cc-active')) && 
			(oldValues.allowed === null || oldValues.allowed === 'false')) {
			loadPreferenceScripts();
		}
		
		const statisticsToggle = document.querySelector('#cookies-statistics');
		localStorage.setItem('cookies_statistics_status', statisticsToggle.classList.contains('cc-active') ? 'true' : 'false');
		
		if ((statisticsToggle.classList.contains('cc-active')) && 
			(oldValues.allowed === null || oldValues.allowed === 'false')) {
			loadStatisticsScripts();
		}	
		
		const marketingToggle = document.querySelector('#cookies-marketing');
		localStorage.setItem('cookies_marketing_status', marketingToggle.classList.contains('cc-active') ? 'true' : 'false');
		
		if ((marketingToggle.classList.contains('cc-active')) && 
			(oldValues.allowed === null || oldValues.allowed === 'false')) {
			loadMarketingScripts();
		}	
		
		const newPreferences = localStorage.getItem('cookies_preferences_status');
		const newStatistics = localStorage.getItem('cookies_statistics_status');
		const newMarketing = localStorage.getItem('cookies_marketing_status');		
		
		closeCookieControls();	
		
		if (oldValues.allowed){
			handlePreferenceChanges(oldValues.preferences, oldValues.statistics, oldValues.marketing);
		}
	}

	function acceptNecessaryCookies() {
		
		const oldValues = getStoredPreferences();
		
		localStorage.setItem('cookies_accept_status', 'true');
		
		localStorage.setItem('cookies_necessary_status', 'true');
		localStorage.setItem('cookies_preferences_status', 'false');
		localStorage.setItem('cookies_statistics_status', 'false');
		localStorage.setItem('cookies_marketing_status', 'false');
		
		closeCookieControls();
		
		if (oldValues.allowed){
			handlePreferenceChanges(oldValues.preferences, oldValues.statistics, oldValues.marketing);	
		}
	}

	function closeCookieControls() {
		document.querySelector('.cookie-container').classList.remove('cc-show');
	}

	function setupCookieDetailAccordions() {
		const detailBlocks = document.querySelectorAll('.cookie-details-block');
		
		detailBlocks.forEach(block => {
			const trigger = block.querySelector('.cookie-details-trigger');
			const body = block.querySelector('.cookie-details-body');
			
			if (trigger && body) {
				trigger.addEventListener('click', function(e) {
					e.preventDefault();
					body.classList.toggle('cc-expand');
					
					const icon = trigger.querySelector('.icon-component');
					if (icon) {
						if (body.classList.contains('cc-expand')) {
							icon.setAttribute('rotation', '0');
						} else {
							icon.setAttribute('rotation', '-90');
						}
					}				
					
				});
			}
		});
	}

	function setupCookieInfoAccordions() {
		const infoBlocks = document.querySelectorAll('.cookie-info-block');
		
		infoBlocks.forEach(block => {
			const trigger = block.querySelector('.cookie-info-block-header');
			
			if(trigger){
				trigger.addEventListener('click', function() {
					block.classList.toggle('cc-expand');
					
					const icon = trigger.querySelector('.icon-component');
					if (icon) {
						if (block.classList.contains('cc-expand')) {
							icon.setAttribute('rotation', '0');
						} else {
							icon.setAttribute('rotation', '-90');
						}
					}
				});			
			}
		});
	}

	function updateToggleState(toggleId, isActive) {
		const toggles = document.querySelectorAll('#' + toggleId);
		
		toggles.forEach(function(toggle) {
			// Update the toggle base
			if (isActive) {
				toggle.classList.add('cc-active');
			} else {
				toggle.classList.remove('cc-active');
			}
			
			// Update the toggle thumb
			const toggleThumb = toggle.querySelector('.toggle-thumb');
			if (toggleThumb) {
				if (isActive) {
					toggleThumb.classList.add('cc-active');
				} else {
					toggleThumb.classList.remove('cc-active');
				}
			}
		});
	}

	function initializeTogglesFromLocalStorage() {
		updateToggleState('cookies-necessary', true);
		
		const preferencesStatus = localStorage.getItem('cookies_preferences_status');
		updateToggleState('cookies-preferences', preferencesStatus === null ? true : preferencesStatus === 'true');
		
		const statisticsStatus = localStorage.getItem('cookies_statistics_status');
		updateToggleState('cookies-statistics', statisticsStatus === null ? true : statisticsStatus === 'true');
		
		const marketingStatus = localStorage.getItem('cookies_marketing_status');
		updateToggleState('cookies-marketing', marketingStatus === null ? true : marketingStatus === 'true');
	}

	function setupToggleSwitches() {
		const toggleCookies = document.querySelectorAll('.toggle-cookie');
		
		initializeTogglesFromLocalStorage();
		
		toggleCookies.forEach(function(toggleBase) {
			toggleBase.addEventListener('click', function() {

				if (this.id === 'cookies-necessary') {
					return;
				}
				
				const toggleId = this.id;
				const isActive = !this.classList.contains('cc-active'); // The new state after toggling
				
				const matchingToggles = document.querySelectorAll('#' + toggleId);
				
				matchingToggles.forEach(function(toggle) {
					if (isActive) {
						toggle.classList.add('cc-active');
					} else {
						toggle.classList.remove('cc-active');
					}
					
					const toggleThumb = toggle.querySelector('.toggle-thumb');
					if (toggleThumb) {
						if (isActive) {
							toggleThumb.classList.add('cc-active');
						} else {
							toggleThumb.classList.remove('cc-active');
						}
					}
				});            
			});
		});
	}


	function setupConsentOpeners() {
		const consentOpeners = document.querySelectorAll('[open-cookie-consent="true"]');
		const consentLinks = document.querySelectorAll('a[href="#openCookieConsent"]');
		
		consentOpeners.forEach(opener => {
			opener.addEventListener('click', openConsentModal);
		});
		
		consentLinks.forEach(link => {
			link.addEventListener('click', openConsentModal);
		});
	}

	function openConsentModal(e) {
		e.preventDefault();
		disableScroll()
		
		const consentModal = document.querySelector('.cookie-consent-modal');
		if (consentModal) {
			consentModal.classList.add('cc-show');
		}
		
		const cookieContainer = document.querySelector('.cookie-container');
		if (cookieContainer) {
			cookieContainer.classList.add('cc-show');
		}
		
		const cookieBanner = document.querySelector('.cookie-banner');
		if (cookieBanner) {
			cookieBanner.classList.add('cc-hide');
		}
	}

	function handleCloseConsent() {
		const consentGiven = localStorage.getItem('cookies_accept_status') === 'true';
		
		if (!consentGiven) {
			acceptNecessaryCookies();
		}
		
		closeCookieControls();
	}

	function closeCookieControls() {
		const consentModal = document.querySelector('.cookie-consent-modal');
		if (consentModal) {
			consentModal.classList.remove('cc-show');
		}
		
		const cookieBanner = document.querySelector('.cookie-banner');
		if (cookieBanner) {
			cookieBanner.classList.add('cc-hide');
		}

		setTimeout(() => {
			const cookieContainer = document.querySelector('.cookie-container');
			if(cookieContainer){ cookieContainer.classList.remove('cc-show');}	
		}, 200);
		
		enableScroll()
	}

	function initializeCookies() {
		const consentGiven = localStorage.getItem('cookies_accept_status');
		
		loadNecessaryScripts();
		
		if (consentGiven !== 'true') {
			// Show the banner if consent hasn't been given
			const cookieContainer = document.querySelector('.cookie-container');
			if(cookieContainer){ cookieContainer.classList.add('cc-show');}

			const cookieBanner = document.querySelector('.cookie-banner');
			if(cookieBanner){ cookieBanner.classList.remove('cc-hide');}
		} else {
			const consentNecessary = true;
			const consentPreference = localStorage.getItem('cookies_preferences_status');
			const consentStatistics = localStorage.getItem('cookies_statistics_status');
			const consentMarketing = localStorage.getItem('cookies_marketing_status');
			
			if(consentPreference === 'true'){
				loadPreferenceScripts();
			}
			
			if(consentPreference === 'false'){
				disablePreferenceScripts();
			}		
			
			if(consentStatistics === 'true'){
				loadStatisticsScripts();
			}
			
			if(consentStatistics === 'false'){
				disableStatisticsScripts();
			}		

			if(consentMarketing === 'true'){
				loadMarketingScripts();
			}

			if(consentMarketing === 'false'){
				disableMarketingScripts();
			}
		}
		
		setupCookieInfoAccordions();
		setupCookieDetailAccordions();
		setupToggleSwitches()
		setupConsentOpeners()

		document.querySelectorAll('#cookies-accept-all').forEach(button => {
			button.addEventListener('click', acceptAllCookies);
		});
		
		document.querySelectorAll('#cookies-accept-selection').forEach(button => {
			button.addEventListener('click', acceptSelectedCookies);
		});
		
		document.querySelectorAll('#cookies-accept-necessary').forEach(button => {
			button.addEventListener('click', acceptNecessaryCookies);
		});
		
		const closeButton = document.querySelector('#close-cookie-consent');
		if (closeButton) {
			closeButton.addEventListener('click', handleCloseConsent);
		}
	}
	
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Accordion	
	
	function initAccordions() {
		const accordionContainers = document.querySelectorAll('.accordion-container');

		accordionContainers.forEach(container => {
			const accordionItems = container.querySelectorAll('.accordion');
			const singleExpand = true; // Set to false to allow multiple accordions to be open at once

			accordionItems.forEach(item => {
				const header = item.querySelector('.accordion-header');
				const content = item.querySelector('.accordion-body');
				const contentInner = item.querySelector('.accordion-body-inner');

				header.addEventListener('click', () => {
					if (singleExpand && !item.classList.contains('cc-active')) {
						accordionItems.forEach(otherItem => {
							if (otherItem !== item && otherItem.classList.contains('cc-active')) {
								otherItem.classList.remove('cc-active');
								const icon = otherItem.querySelector('.icon-component');
								
								if (icon) {
									icon.setAttribute('rotation', '0');
								}
								
								const otherContent = otherItem.querySelector('.accordion-body');
								otherContent.style.height = '0';
							}
						});
					}

					item.classList.toggle('cc-active');
					const icon = item.querySelector('.icon-component');

					if (icon && item.classList.contains('cc-active')){
						icon.setAttribute('rotation', '90');
					} else {
						icon.setAttribute('rotation', '0');
					}

					if (item.classList.contains('cc-active')) {
						content.style.height = contentInner.offsetHeight + 'px';
					} else {
						content.style.height = '0';
					}
				});
			});
		});
	}
		
	
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Disclaimer Buttons

	function setupDisclaimerButtons() {
		const acceptButton = document.getElementById('acceptDisclaimer');
		if (acceptButton) {
			acceptButton.addEventListener('click', function() {
				localStorage.setItem('disclaimer_accepted', 'true');
				window.location.href = '/';
			});
		}

		const denyButton = document.getElementById('denyDisclaimer');
		if (denyButton) {
			denyButton.addEventListener('click', function() {
				if (document.referrer && !document.referrer.includes(window.location.hostname)) {
					window.location.href = document.referrer;
				} else {
					window.location.href = 'https://www.google.com';
				}
			});
		}
	}
	
	
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Section Border Radius Parse	
	
	function sectionBorderRadius() {
		const elements = document.querySelectorAll('[data-border-radius]');

		elements.forEach(element => {
			const radius = element.getAttribute('data-border-radius');
			element.style.setProperty('--border-radius', radius);
		});		
	}
	

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////// Initialize Feather

	function initializeFeather() {
		bindMobileNavEvents();
		sectionBorderRadius()
		initCustomLightBoxes();
		initModals();
		initToggles();
		setupDisclaimerButtons();
		initAccordions();
		
		if(allowCookies){
			initializeCookies();
		}	
	}

	function resizeFeather() {
		//adjustSectionPadding()
	}
	
	window.addEventListener('resize', resizeFeather);
  
    if (document.readyState !== 'loading') {
        initializeFeather();
    } else {
        document.addEventListener('DOMContentLoaded', initializeFeather);
    }
