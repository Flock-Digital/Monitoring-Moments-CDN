const loginFormContainer = document.querySelector('.cp-login-form');
const loginForm = document.querySelector('#loginForm');
const loadingIcon = document.querySelector('.cp-loading-icon');
const btnLogin = document.querySelector('#btnLogin');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');

///////////////////////////////////////////////////////////
// Utilities

function toggleLoginForm(){
	if (loginFormContainer) {
		loginFormContainer.classList.toggle('cc-hide');
	}	
}

function toggleLoaderIcon(){
	if (loadingIcon) {
		loadingIcon.classList.toggle('cc-hide');
	}
}

function buildUi() {  
	setTimeout(() => {
		toggleLoginForm();
	}, 1000);
}

function disableFormSubmissionWithEnter() {
	if (loginForm) {
		loginForm.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
			}
		});
	}
}

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function validateForm() {
	const email = emailInput ? emailInput.value.trim() : '';
	const password = passwordInput ? passwordInput.value : '';
	
	const isValid = isValidEmail(email) && password.length > 0;
	
	if (btnLogin) {
		if (isValid) {
			btnLogin.classList.remove('cc-disabled');
		} else {
			btnLogin.classList.add('cc-disabled');
		}
	}
}

///////////////////////////////////////////////////////////
// API functions

function submitLoginCreds() {
	
	// HARRY: Add API call to SSO	
	
	// ** Test values
	const response = 200;
	const userId = "123456789-123456789"
	const userEmail = emailInput ? emailInput.value.trim() : '';
	// If SSO returns email, use this instead: const userEmail = ssoResponse.email || '';
	// ** End test values
	
	if(response == 200){
		localStorage.setItem('user_id', userId);
		localStorage.setItem('user_email', userEmail);

		setTimeout(() => {
			toggleLoginForm();
			setTimeout(() => {
				// Give time for the user to see the loading animation
				
				// HARRY: This is where we will render the private "application" page
				window.location.href = '/application';
			}, 1000);	
		}, 600);
	} else {
		// GUY: To do: show error response to user.
	}
		
}

///////////////////////////////////////////////////////////
// Events

function handleLoginClick() {
	if (btnLogin) {
		btnLogin.addEventListener('click', (e) => {
			e.preventDefault();
			
			const email = emailInput ? emailInput.value.trim() : '';
			const password = passwordInput ? passwordInput.value.trim() : '';
			
			if (!email || !password) {
				alert('Email or password missing');
				return;
			}
			
			submitLoginCreds();
		});
	}
}

function handleInputValidation() {
	if (emailInput) {
		emailInput.addEventListener('input', validateForm);
	}
	if (passwordInput) {
		passwordInput.addEventListener('input', validateForm);
	}
}

function addEventListeners() {
	disableFormSubmissionWithEnter();
	handleLoginClick();
	handleInputValidation();
}

///////////////////////////////////////////////////////////
// Init

function init() {
	buildUi();
	addEventListeners();
	validateForm();
}

if (document.readyState !== 'loading') {
	init();
} else {
	document.addEventListener('DOMContentLoaded', init);
}
