// =============================================================================
// DOM SELECTORS & STATE
// =============================================================================
console.log("This is version 1.0.1");

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const $id = (s) => document.getElementById(s);

const loader = $('.cp-loading-screen');
const screens = $$('.screen');
const screenButtons = $$('[id^="btn-screen-"]');
const footer = $('.cp-app-footer');
const footerButtons = $('.footer-btn-container');
const footerJobCode = $('.app-footer-job-code');
const footerSavedSessions = $('#btn-saved-sessions');
const header = $('.cp-app-header');
const headerButtons = $('.app-header-btn-container');
const headerLogo = $('.app-header-logo');
const headerSteps = $('.app-header-steps');
const headerStepIndicators = $$('.app-header-step');
const logoutButton = $('.app-header-btn-logout');
const homeWelcome = $('.cp-home-message');
const speechWelcome = $('.speech-bubble.cc-welcome');
const speechOffice = $('.speech-bubble.cc-office');
const speechFinal = $('.speech-bubble.cc-final');
const patientBubbles = $$('.speech-bubble-mini');
const patientBackgrounds = $$('.screen-bg-patient-img');
const patientOfficeBackgrounds = $$('.screen-bg-office-img');
const patientFinalBackgrounds = $$('.screen-bg-final-img');
const clipboards = $$('.cp-clipboard');
const clipboardCloseButtons = $$('.clipboard-close');
const patientSwitch = $('.cp-patient-switch');
const switchLeft = $('#switch-patient-left');
const switchRight = $('#switch-patient-right');
const switchLabel = $('#switch-patient-label');
const pages = $$('.page');
const pageNavPrev = $('#page-prev');
const pageNavNext = $('#page-next');
const questionSubtitles = $$('.question-subtitle');
const patientProfiles = $$('.cp-patient-profile');
const summaryContainer = $('.cp-summary');
const summaryClipboard = $('.summary-clipboard');

let patients = [];
let currentPatientIndex = 0;
let currentPageIndex = 0;
let currentCarouselInstance = null;
let isOnCarouselPage = false;
let diseaseStateSelected = false;
let currentChecklistItem = null;
let currentCustomGroupId = null;
let isEditMode = false;
const carouselPageIndex = 2;
let lastCarouselSlideIndex = 0;
let isRestoringSession = false;

// =============================================================================
// UTILITIES
// =============================================================================

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const toggleLoader = () => loader?.classList.add('cc-hide');
const logout = () => {
	// Remove all localStorage items
	localStorage.removeItem('user_id');
	localStorage.removeItem('user_email');
	localStorage.removeItem('active_session');
	localStorage.removeItem('saved_sessions');
	
	// Redirect to home/login screen
	window.location.href = '/';
};

function initializePatients() {
	patients = Array.from(patientBubbles).map(bubble => ({
		id: bubble.id,
		label: bubble.getAttribute('switch-label'),
		bubble: bubble
	}));
}

function buildUi() {
	setTimeout(() => {
		toggleLoader();
		setTimeout(() => {
			const session = getActiveSession();
			
			if (session && session.current_location) {
				let screenId = session.current_location;
				if (session.current_location.includes('_')) {
					screenId = session.current_location.split('_')[0];
				}
				
				updateUiVisibility(screenId);
				
				restoreSession(session);
			} else {
				updateUiVisibility('screen-home');
				homeWelcome?.classList.add('cc-active');
				footerJobCode?.classList.add('cc-active');
				updateFooterTerms();
			}
		}, 300);
	}, 1000);
}

function checkValidUser() {
	const userId = localStorage.getItem('user_id');
	if (!userId) {
		logout();
		return;
	}
	buildUi();
}

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

function createNewSession() {
	const userId = localStorage.getItem('user_id');
	const timestamp = Date.now();
	const newSession = {
		session_id: `${timestamp}_${userId}`,
		user_id: userId,
		patient: null,
		disease_state: null,
		selected_checklist_items: [],
		current_location: 'screen-home',
		created_date: timestamp,
		completed: false,
		notes: [],
		summary: { tier: '', summary_title: '' }
	};
	localStorage.setItem('active_session', JSON.stringify(newSession));
	return newSession;
}

function getActiveSession() {
	const stored = localStorage.getItem('active_session');
	return stored ? JSON.parse(stored) : null;
}

function updateActiveSession(updates) {
	const session = getActiveSession();
	if (!session) {
		console.error('No active session found');
		return null;
	}
	const updatedSession = { ...session, ...updates };
	localStorage.setItem('active_session', JSON.stringify(updatedSession));
	return updatedSession;
}

function updateSessionLocation(screenId, pageIndex = null) {
	const session = getActiveSession();
	if (!session) return; // Exit silently if no session exists yet
	
	const location = pageIndex !== null ? `${screenId}_${pageIndex}` : screenId;
	updateActiveSession({ current_location: location });
}

function completeSession() {
	updateActiveSession({ completed: true });
}

function setSummaryTier(tierNumber) {
	const session = getActiveSession();
	if (!session) return;
	updateActiveSession({
		summary: {
			...session.summary,
			tier: tierNumber
		}
	});
}

function addChecklistItemToSession(itemData) {
	const session = getActiveSession();
	if (!session) return;
	const items = session.selected_checklist_items || [];
	const existingIndex = items.findIndex(item => item.checklist_id === itemData.checklist_id);
	if (existingIndex !== -1) {
		items[existingIndex] = itemData;
	} else {
		items.push(itemData);
	}
	updateActiveSession({ selected_checklist_items: items });
}

function removeChecklistItemFromSession(checklistId) {
	const session = getActiveSession();
	if (!session) return;
	const items = session.selected_checklist_items || [];
	const filteredItems = items.filter(item => item.checklist_id !== checklistId);
	updateActiveSession({ selected_checklist_items: filteredItems });
}

function getChecklistItemFromSession(checklistId) {
	const session = getActiveSession();
	if (!session) return null;
	const items = session.selected_checklist_items || [];
	return items.find(item => item.checklist_id === checklistId) || null;
}

function restoreSession(session) {
	if (!session) return;
	restorePatientData(session);
	restoreDiseaseState(session);
	restoreChecklistItems(session);
	restoreSessionLocation(session);
}

function restorePatientData(session) {
	if (!session.patient) return;
	
	const patientId = session.patient.id;
	const patientIndex = patients.findIndex(p => p.id === patientId);
	
	if (patientIndex === -1) return;
	
	currentPatientIndex = patientIndex;
	
	patientProfiles.forEach(profile => profile.classList.remove('cc-active'));
	const selectedProfiles = $$(`#profile-${patientId}`);
	selectedProfiles.forEach(profile => profile.classList.add('cc-active'));
	
	const patientName = patientId.replace('patient-', '').charAt(0).toUpperCase() + 
	                     patientId.replace('patient-', '').slice(1);
	$$('.dynamic-patient-name').forEach(span => {
		span.textContent = patientName;
	});
}

function restoreDiseaseState(session) {
	if (!session.disease_state) return;
	
	const diseaseStateId = session.disease_state.disease_state_id;
	const diseaseStateTitle = session.disease_state.disease_state_title;
	const radio = $id(diseaseStateId);
	
	if (!radio) return;
	
	radio.checked = true;
	radio.previousElementSibling?.classList.add('w--redirected-checked');
	
	if (diseaseStateId === 'disease-state-other') {
		const otherInput = $id('disease-state-other-description');
		if (otherInput) {
			otherInput.value = diseaseStateTitle;
			otherInput.classList.remove('cc-disabled');
		}
	}
	
	diseaseStateSelected = true;
}

function restoreChecklistItems(session) {
	if (!session.selected_checklist_items || session.selected_checklist_items.length === 0) {
		return;
	}
	
	session.selected_checklist_items.forEach(itemData => {
		if (itemData.is_custom === 'true') {
			restoreCustomChecklistItem(itemData);
		} else {
			restoreStandardChecklistItem(itemData);
		}
	});
}

function restoreStandardChecklistItem(itemData) {
	const item = $(`[checklist_id="${itemData.checklist_id}"]`);
	
	if (!item) {
		console.warn(`Checklist item not found: ${itemData.checklist_id}`);
		return;
	}
	
	updateChecklistItemDOM(item, itemData.frequency_id, itemData.frequency_title);
}

function restoreCustomChecklistItem(itemData) {
	const existingItem = $(`[checklist_id="${itemData.checklist_id}"]`);
	
	if (existingItem) {
		updateChecklistItemDOM(existingItem, itemData.frequency_id, itemData.frequency_title);
		return;
	}
	
	const checklistId = itemData.checklist_id;
	const customIndex = checklistId.indexOf('_custom_');
	
	if (customIndex === -1) {
		console.warn(`Invalid custom checklist ID format: ${checklistId}`);
		return;
	}
	
	const groupId = checklistId.substring(0, customIndex);
	appendCustomChecklistItemToDOM(groupId, itemData);
}

function restoreSessionLocation(session) {
	const location = session.current_location;
	let screenId = location;
	let pageIndex = null;
	
	if (location.includes('_')) {
		const parts = location.split('_');
		screenId = parts[0];
		pageIndex = parseInt(parts[1]);
	}
	
	if (screenId === 'screen-questions' && pageIndex !== null) {
		isRestoringSession = true;
		currentPageIndex = pageIndex;
		showScreen(screenId);
		setTimeout(() => {
			showPage(pageIndex);
		}, 50);
	} else {
		showScreen(screenId);
		
		if (screenId === 'screen-office' && session.patient) {
			setTimeout(() => {
				showPatient(session.patient.id);
			}, 1100);
		}
		
		if (screenId === 'screen-summary' && session.summary?.tier) {
			setTimeout(() => {
				showSummaryTier();
			}, 1100);
		}
	}
}

function loadSavedSession(savedSessionData) {
	cleanupAllScreens();
	resetApplicationState();
	localStorage.setItem('active_session', JSON.stringify(savedSessionData));
	restoreSession(savedSessionData);
}

// =============================================================================
// NOTES MANAGEMENT
// =============================================================================

function addNoteToSession(noteText, screenName) {
	const session = getActiveSession();
	if (!session) return;
	
	const timestamp = Date.now();
	const note = {
		note_id: `note_${timestamp}`,
		text: noteText,
		screen_name: screenName,
		created_date: timestamp
	};
	
	const notes = session.notes || [];
	notes.push(note);
	
	updateActiveSession({ notes: notes });
}

function deleteNoteFromSession(noteId) {
	const session = getActiveSession();
	if (!session) return;
	
	const notes = session.notes || [];
	const filteredNotes = notes.filter(note => note.note_id !== noteId);
	
	updateActiveSession({ notes: filteredNotes });
}

function getCurrentScreenName() {
	const currentScreen = $('.screen.cc-active');
	if (!currentScreen) return 'Unknown';
	
	let screenName = currentScreen.getAttribute('name-label') || 'Unknown';
	
	if (currentScreen.id === 'screen-questions') {
		const currentPage = pages[currentPageIndex];
		const pageName = currentPage?.getAttribute('name-label') || '';
		if (pageName) {
			screenName = `${pageName} (${currentPageIndex + 1})`;
		} else {
			screenName = `${screenName} (${currentPageIndex + 1})`;
		}
	}
	
	return screenName;
}

// =============================================================================
// NOTES MODAL
// =============================================================================

function openNotesModal() {
	const modal = $id('modal-notes');
	if (!modal) return;
	
	populateNotesModal();
	
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
	
	setTimeout(() => {
		const textarea = $id('note');
		textarea?.focus();
		
		const notesOuter = $('#modal-notes .tab-content-outer');
		if (notesOuter) {
			notesOuter.scrollTo({
				top: notesOuter.scrollHeight,
				behavior: 'smooth'
			});
		}
	}, 100);
}

function populateNotesModal() {
	const session = getActiveSession();
	const notesContainer = $('#modal-notes .tab-content-inner.cc-notes');
	
	if (!notesContainer) return;
	
	const noteWrappers = notesContainer.querySelectorAll('.note-wrapper');
	noteWrappers.forEach(wrapper => wrapper.remove());
	
	const notes = session?.notes || [];
	
	if (notes.length === 0) {
		return;
	}
	
	const sortedNotes = [...notes].sort((a, b) => a.created_date - b.created_date);
	
	const form = notesContainer.querySelector('.w-form');
	
	sortedNotes.forEach(note => {
		const noteElement = createNoteElement(note);
		notesContainer.insertBefore(noteElement, form);
	});
}

function createNoteElement(note) {
	const noteWrapper = document.createElement('div');
	noteWrapper.className = 'note-wrapper';
	noteWrapper.setAttribute('data-note-id', note.note_id);
	
	const formattedDate = formatNoteDate(note.created_date);
	const formattedTime = formatTime(note.created_date);
	
	noteWrapper.innerHTML = `
		<div class="note-main">
			<div class="note-body">
				<p>${escapeHtml(note.text)}</p>
			</div>
			<div class="note-meta">
				<div class="note-date">
					<div>${formattedDate} &nbsp;| &nbsp;${formattedTime}</div>
				</div>
				<div class="note-location">
					<div>${escapeHtml(note.screen_name)}</div>
				</div>
			</div>
		</div>
		<div class="note-delete">
			<img src="https://cdn.prod.website-files.com/68e3c6899eef845930969d61/68f22bbed1beadfa9e96ef3d_icon-trash-2.svg" 
			     loading="lazy" alt="">
		</div>
	`;
	
	setTimeout(() => {
		const deleteBtn = noteWrapper.querySelector('.note-delete');
		deleteBtn?.addEventListener('click', () => {
			handleDeleteNote(note.note_id, noteWrapper);
		});
	}, 0);
	
	return noteWrapper;
}

function formatNoteDate(timestamp) {
	const date = new Date(timestamp);
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const year = date.getFullYear();
	return `${day}.${month}.${year}`;
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function handleAddNote() {
	const textarea = $id('note');
	const noteText = textarea?.value.trim();
	
	if (!noteText) {
		return;
	}
	
	const screenName = getCurrentScreenName();
	addNoteToSession(noteText, screenName);
	
	if (textarea) textarea.value = '';
	
	populateNotesModal();
	
	setTimeout(() => {
		const notesOuter = $('#modal-notes .tab-content-outer');
		if (notesOuter) {
			notesOuter.scrollTo({
				top: notesOuter.scrollHeight,
				behavior: 'smooth'
			});
		}
	}, 100);

	textarea?.focus();
}

function handleDeleteNote(noteId, noteElement) {
	deleteNoteFromSession(noteId);
	
	noteElement.style.opacity = '0';
	noteElement.style.transform = 'scale(0.95)';
	noteElement.style.transition = 'all 0.3s ease';
	
	setTimeout(() => {
		noteElement.remove();
	}, 300);
}

// =============================================================================
// SAVED SESSIONS MANAGEMENT
// =============================================================================

let sessionToDelete = null;
let sessionElementToDelete = null;

function getSavedSessions() {
	const stored = localStorage.getItem('saved_sessions');
	return stored ? JSON.parse(stored) : [];
}

function saveSessionToStorage(session) {
	const savedSessions = getSavedSessions();
	
	const existingIndex = savedSessions.findIndex(s => s.session_id === session.session_id);
	
	if (existingIndex !== -1) {
		savedSessions[existingIndex] = session;
	} else {
		savedSessions.push(session);
	}
	
	localStorage.setItem('saved_sessions', JSON.stringify(savedSessions));
}

function deleteSessionFromStorage(sessionId) {
	const savedSessions = getSavedSessions();
	const filteredSessions = savedSessions.filter(s => s.session_id !== sessionId);
	localStorage.setItem('saved_sessions', JSON.stringify(filteredSessions));
}

function getSessionById(sessionId) {
	const savedSessions = getSavedSessions();
	return savedSessions.find(s => s.session_id === sessionId) || null;
}

// =============================================================================
// MODAL POPULATION
// =============================================================================

function openSavedSessionsModal() {
	const modal = $id('modal-saved-sessions');
	if (!modal) return;
	
	populateSavedSessionsModal();
	
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
}

function populateSavedSessionsModal() {
	const savedSessions = getSavedSessions();
	
	const contentWrapper = $('#modal-saved-sessions .tab-content-inner');
	if (!contentWrapper) return;
	
	contentWrapper.innerHTML = '';
	
	if (savedSessions.length === 0) {
		contentWrapper.innerHTML = '<p class="paragraph-lg" style="text-align: center; padding: 2rem;">No saved sessions yet.</p>';
		return;
	}
	
	const sessionsByDate = groupSessionsByDate(savedSessions);
	
	Object.keys(sessionsByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
		const dateBlock = createDateBlock(date, sessionsByDate[date]);
		contentWrapper.appendChild(dateBlock);
	});
}

function groupSessionsByDate(sessions) {
	const grouped = {};
	
	sessions.forEach(session => {
		const date = new Date(session.created_date);
		const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
		
		if (!grouped[dateKey]) {
			grouped[dateKey] = [];
		}
		
		grouped[dateKey].push(session);
	});
	
	Object.keys(grouped).forEach(date => {
		grouped[date].sort((a, b) => a.created_date - b.created_date);
	});
	
	return grouped;
}

function formatDateHeader(dateString) {
	const date = new Date(dateString);
	const options = { month: 'long', day: 'numeric', year: 'numeric' };
	return date.toLocaleDateString('en-US', options).replace(',', '') + 'th'; // Add ordinal suffix
}

function formatTime(timestamp) {
	const date = new Date(timestamp);
	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12 || 12;
	return `${hours}:${minutes}${ampm}`;
}

function getSessionName(sessions, currentSession) {
	const index = sessions.findIndex(s => s.session_id === currentSession.session_id);
	return `Session ${index + 1}`;
}

function createDateBlock(dateKey, sessions) {
	const dateBlock = document.createElement('div');
	dateBlock.className = 'saved-sessions-date-block';
	
	const dateHeader = document.createElement('h3');
	dateHeader.className = 'saved-sessions-date';
	dateHeader.textContent = formatDateHeader(dateKey);
	
	const sessionsGrid = document.createElement('div');
	sessionsGrid.className = 'saved-sessions-grid';
	
	sessions.forEach(session => {
		const sessionElement = createSessionElement(session, sessions);
		sessionsGrid.appendChild(sessionElement);
	});
	
	dateBlock.appendChild(dateHeader);
	dateBlock.appendChild(sessionsGrid);
	
	return dateBlock;
}

function createSessionElement(session, allSessionsForDay) {
	const sessionDiv = document.createElement('div');
	sessionDiv.className = 'saved-session';
	sessionDiv.setAttribute('saved-session-id', session.session_id);
	
	const isComplete = session.completed;
	const sessionName = getSessionName(allSessionsForDay, session);
	const sessionTime = formatTime(session.created_date);
	
	sessionDiv.innerHTML = `
		<div class="saved-session-status ${isComplete ? '' : 'cc-in-progress'}">
			<div>${isComplete ? 'COMPLETE' : 'IN PROGRESS'}</div>
		</div>
		<div class="saved-session-details">
			<div class="saved-session-details-inner">
				<h3 class="u-text-xbold">${sessionName}</h3>
				<div class="break-line"></div>
				<p class="paragraph-lg">${sessionTime}</p>
			</div>
			<img src="https://cdn.prod.website-files.com/68e3c6899eef845930969d61/68f22bbed1beadfa9e96ef3d_icon-trash-2.svg" 
			     loading="lazy" alt="" class="delete-saved-session">
		</div>
		${createSessionButtons(isComplete)}
	`;
	
	setTimeout(() => {
		setupSessionEventListeners(sessionDiv, session);
	}, 0);
	
	return sessionDiv;
}

function createSessionButtons(isComplete) {
	if (isComplete) {
		return `
			<div data-wf--button-container--variant="xs" class="btn-container w-variant-bf4913d0-1b80-4d1a-c619-ee48ff19da8a">
				<div class="button-one">
					<div data-wf--button--size="auto" class="btn-size">
						<div data-wf--button-theme-helper--theme="theme-2" class="btn-theme w-variant-d36ffd50-dbd4-59e5-8a0c-90fa60ed3597">
							<a class="btn-saved-send-email btn w-inline-block" href="#">
								<div class="text-block">Send email</div>
							</a>
						</div>
					</div>
				</div>
				<div class="button-two">
					<div data-wf--button--size="auto" class="btn-size">
						<div data-wf--button-theme-helper--theme="theme-2" class="btn-theme w-variant-d36ffd50-dbd4-59e5-8a0c-90fa60ed3597">
							<a class="btn-saved-view-summary btn w-inline-block" href="#">
								<div class="text-block">View summary</div>
							</a>
						</div>
					</div>
				</div>
			</div>
		`;
	} else {
		return `
			<div data-wf--button-container--variant="xs" class="btn-container w-variant-bf4913d0-1b80-4d1a-c619-ee48ff19da8a">
				<div class="button-one">
					<div data-wf--button--size="auto" class="btn-size">
						<div data-wf--button-theme-helper--theme="theme-2" class="btn-theme w-variant-d36ffd50-dbd4-59e5-8a0c-90fa60ed3597">
							<a class="btn-saved-send-email btn w-inline-block" href="#">
								<div class="text-block">Send email</div>
							</a>
						</div>
					</div>
				</div>
				<div class="button-two">
					<div data-wf--button--size="auto" class="btn-size">
						<div data-wf--button-theme-helper--theme="theme-1" class="btn-theme w-variant-84b8c7b9-f437-ba5b-0e62-00c3b7095f1e">
							<a class="btn-saved-continue btn w-variant-efd05573-c351-58ce-1af0-8c190e7dc5ea w-inline-block" href="#">
								<div class="text-block w-variant-efd05573-c351-58ce-1af0-8c190e7dc5ea">Continue session</div>
							</a>
						</div>
					</div>
				</div>
			</div>
		`;
	}
}

function setupSessionEventListeners(sessionDiv, session) {
	const deleteBtn = sessionDiv.querySelector('.delete-saved-session');
	deleteBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		handleDeleteSession(session.session_id, sessionDiv);
	});
	
	const continueBtn = sessionDiv.querySelector('.btn-saved-continue');
	continueBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		handleContinueSession(session);
	});
	
	const viewSummaryBtn = sessionDiv.querySelector('.btn-saved-view-summary');
	viewSummaryBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		handleViewSummary(session);
	});
	
	const sendEmailBtn = sessionDiv.querySelector('.btn-saved-send-email');
	sendEmailBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		handleSendEmail(session);
	});
}

// =============================================================================
// SESSION ACTIONS
// =============================================================================

function handleDeleteSession(sessionId, sessionElement) {
	// Store references for later use
	sessionToDelete = sessionId;
	sessionElementToDelete = sessionElement;
	
	// Open the delete confirmation modal
	const deleteModal = $id('modal-session-delete');
	const sessionsModal = $id('modal-saved-sessions');	
	const modalOverlaySaved = $('.modal-overlay');
	
	deleteModal?.classList.add('cc-show');
	sessionsModal?.classList.add('cc-backwards');
	modalOverlaySaved?.classList.add('cc-no-pointer');
}

function cancelDeleteSession() {
	sessionToDelete = null;
	sessionElementToDelete = null;
	
	const deleteModal = $id('modal-session-delete');
	const sessionsModal = $id('modal-saved-sessions');	
	const modalOverlaySaved = $('.modal-overlay');
	
	deleteModal?.classList.remove('cc-show');
	sessionsModal?.classList.remove('cc-backwards');
	modalOverlaySaved?.classList.remove('cc-no-pointer');	
}

function confirmDeleteSession() {
	if (!sessionToDelete || !sessionElementToDelete) return;
	
	deleteSessionFromStorage(sessionToDelete);
	
	sessionElementToDelete.style.opacity = '0';
	sessionElementToDelete.style.transform = 'scale(0.95)';
	sessionElementToDelete.style.transition = 'all 0.3s ease';
	
	setTimeout(() => {
		const dateBlock = sessionElementToDelete.closest('.saved-sessions-date-block');
		const sessionsGrid = sessionElementToDelete.closest('.saved-sessions-grid');
		
		sessionElementToDelete.remove();
		
		if (sessionsGrid && sessionsGrid.children.length === 0) {
			dateBlock?.remove();
		}
		
		const contentWrapper = $('#modal-saved-sessions .tab-content-inner');
		if (contentWrapper && contentWrapper.children.length === 0) {
			contentWrapper.innerHTML = '<p class="paragraph-lg" style="text-align: center; padding: 2rem;">No saved sessions yet.</p>';
		}
		
		sessionToDelete = null;
		sessionElementToDelete = null;
		
		const deleteModal = $id('modal-session-delete');
		const sessionsModal = $id('modal-saved-sessions');
		const modalOverlaySaved = $('.modal-overlay');
		deleteModal?.classList.remove('cc-show');
		sessionsModal?.classList.remove('cc-backwards');
		modalOverlaySaved?.classList.remove('cc-no-pointer');
		
	}, 300);
}

function handleContinueSession(session) {
	closeAllModals();
	loadSavedSession(session);
}

function handleViewSummary(session) {
	closeAllModals();
	localStorage.setItem('active_session', JSON.stringify(session));
	restorePatientData(session);
	updateUiVisibility('screen-summary');
	
	screens.forEach(screen => screen.classList.remove('cc-active'));
	const summaryScreen = $('#screen-summary');
	summaryScreen?.classList.add('cc-active');
	
	if (session.patient) {
		patientFinalBackgrounds.forEach(bg => bg.classList.remove('cc-active'));
		$(`#bg-final-${session.patient.id}`)?.classList.add('cc-active');
	}
	
	setTimeout(() => {
		if (session.summary?.tier) {
			$$('.summary').forEach(summary => {
				summary.classList.remove('cc-active');
			});
			const selectedTier = $id(`summary-tier-${session.summary.tier}`);
			selectedTier?.classList.add('cc-active');
		}
		
		summaryContainer?.classList.add('cc-active');
		summaryClipboard?.classList.add('cc-active');
		speechFinal?.classList.add('cc-active');
	}, 1000);
}

function handleSendEmail(session = null) {
	openSendEmailModal(session);
}

function openSendEmailModal(session = null) {
	const modal = $id('modal-send-email');
	const emailInput = $id('send-email');
	const sendButton = $id('btn-send-email');
	const sessionsModal = $id('modal-saved-sessions');
	const modalOverlay = $('.modal-overlay');
	
	if (!modal) return;
	
	// Get stored email from localStorage
	const userEmail = localStorage.getItem('user_email') || '';
	
	// Populate email input if we have a stored email
	if (emailInput) {
		emailInput.value = userEmail;
	}
	
	// Enable/disable send button based on email validity
	validateEmailInput();
	
	// Store session reference if provided (from saved sessions modal)
	if (session) {
		modal.setAttribute('data-session-id', session.session_id);
		// Push saved sessions modal backwards
		sessionsModal?.classList.add('cc-backwards');
		modalOverlay?.classList.add('cc-no-pointer');
	} else {
		modal.removeAttribute('data-session-id');
	}
	
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
}

function validateEmailInput() {
	const emailInput = $id('send-email');
	const sendButton = $id('btn-send-email');
	
	if (!emailInput || !sendButton) return;
	
	const email = emailInput.value.trim();
	
	if (email && isValidEmail(email)) {
		sendButton.classList.remove('cc-disabled');
	} else {
		sendButton.classList.add('cc-disabled');
	}
}

function handleSendEmailSubmit() {
	const emailInput = $id('send-email');
	const modal = $id('modal-send-email');
	const email = emailInput?.value.trim();
	
	if (!email || !isValidEmail(email)) {
		alert('Please enter a valid email address');
		return;
	}
	
	// Get session - either from modal attribute or active session
	const sessionId = modal?.getAttribute('data-session-id');
	let session;
	
	if (sessionId) {
		session = getSessionById(sessionId);
	} else {
		session = getActiveSession();
	}
	
	if (!session) {
		alert('No session found');
		return;
	}
	
	// TODO: Implement actual email sending via API
	console.log('Sending email to:', email);
	console.log('Session data:', session);
	
	const sessionsModal = $id('modal-saved-sessions');
	const modalOverlay = $('.modal-overlay');
	
	// If opened from saved sessions, restore the saved sessions modal
	if (sessionId) {
		sessionsModal?.classList.remove('cc-backwards');
		modalOverlay?.classList.remove('cc-no-pointer');
		
		// Close send email modal only
		modal?.classList.remove('cc-show');
	} else {
		// Opened from header button - close everything
		closeAllModals();
	}
	
	// Show success message (temporary until API is implemented)
	alert(`Email will be sent to: ${email}\nSession ID: ${session.session_id}`);
}

// =============================================================================
// CHECKLIST STORAGE HELPERS
// =============================================================================

const getSelectedChecklistItems = () => getActiveSession()?.selected_checklist_items || [];
const saveSelectedChecklistItem = (itemData) => addChecklistItemToSession(itemData);
const removeSelectedChecklistItem = (checklistId) => removeChecklistItemFromSession(checklistId);
const getSelectedChecklistItem = (checklistId) => getChecklistItemFromSession(checklistId);

// =============================================================================
// DISEASE STATE
// =============================================================================

function saveDiseaseState(diseaseStateId, diseaseStateTitle) {
	updateActiveSession({
		disease_state: { disease_state_id: diseaseStateId, disease_state_title: diseaseStateTitle }
	});
}

const getDiseaseState = () => getActiveSession()?.disease_state || null;

function handleDiseaseStateSelection() {
	const diseaseStateRadios = $$('input[type="radio"][name="disease-state"]');
	diseaseStateRadios.forEach(radio => {
		radio.addEventListener('change', () => {
			if (radio.checked) {
				diseaseStateSelected = true;
				updatePageNavigationForDiseaseState();
			}
		});
	});
}

function updatePageNavigationForDiseaseState() {
	if (currentPageIndex === 0) {
		pageNavNext?.classList.toggle('cc-disabled', !diseaseStateSelected);
	}
}

function collectDiseaseStateData() {
	const diseaseStateRadios = $$('input[type="radio"][name="disease-state"]');
	const selectedRadio = Array.from(diseaseStateRadios).find(radio => radio.checked);
	if (!selectedRadio) return null;
	
	const diseaseStateId = selectedRadio.id;
	let diseaseStateTitle = '';
	
	if (diseaseStateId === 'disease-state-other') {
		const otherInput = $id('disease-state-other-description');
		diseaseStateTitle = otherInput?.value.trim() || '';
		if (!diseaseStateTitle) return null;
	} else {
		diseaseStateTitle = selectedRadio.getAttribute('disease-state-title') || '';
	}
	
	return { disease_state_id: diseaseStateId, disease_state_title: diseaseStateTitle };
}

function handleDiseaseStateToggle() {
	const diseaseState = $('.cp-disease-selector');
	diseaseState?.addEventListener('click', (e) => {
		if (e.target.closest('.disease-selector')) return;
		diseaseState.classList.toggle('cc-open');
	});
}

function handleDiseaseStateOther() {
	const diseaseStateOther = $('#disease-state-other');
	const diseaseStateOtherDescription = $('#disease-state-other-description');
	const allDiseaseRadios = $$('input[type="radio"][name="disease-state"]');
	
	diseaseStateOther?.addEventListener('change', () => {
		if (diseaseStateOther.checked) {
			diseaseStateOtherDescription?.classList.remove('cc-disabled');
			diseaseStateOtherDescription?.focus();
		}
	});
	
	diseaseStateOtherDescription?.addEventListener('click', () => {
		if (diseaseStateOther) {
			diseaseStateOther.checked = true;
			diseaseStateOtherDescription.classList.remove('cc-disabled');
			diseaseStateOtherDescription.focus();
		}
	});
	
	allDiseaseRadios?.forEach(radio => {
		if (radio.id !== 'disease-state-other') {
			radio.addEventListener('change', () => {
				if (radio.checked) diseaseStateOtherDescription?.classList.add('cc-disabled');
			});
		}
	});
}

// =============================================================================
// NAVIGATION & SCREEN MANAGEMENT
// =============================================================================

const UI_VISIBILITY_MAP = {
	'screen-home': {
		header: false,
		footer: true,
		headerButtons: false,
		headerLogo: false,
		headerSteps: false,
		footerButtons: false,
		footerSavedSessions: true,
		footerJobCode: true,
		logoutButton: true
	},
	'screen-welcome': {
		header: true,
		footer: true,
		headerButtons: false,
		headerLogo: false,		
		headerSteps: false,
		footerButtons: true,
		footerSavedSessions: true,
		footerJobCode: false,
		logoutButton: true
	},
	'screen-waiting-room': {
		header: true,
		footer: true,
		headerButtons: false,
		headerLogo: true,		
		headerSteps: false,
		footerButtons: true,
		footerSavedSessions: true,
		footerJobCode: false,
		logoutButton: false		
	},
	'screen-office': {
		header: true,
		footer: true,
		headerButtons: false,
		headerLogo: true,		
		headerSteps: false,
		footerButtons: true,
		footerSavedSessions: false,
		footerJobCode: false,
		logoutButton: false		
	},
	'screen-questions': {
		header: true,
		footer: true,
		headerButtons: true,
		headerLogo: true,		
		headerSteps: true,
		footerButtons: true,
		footerSavedSessions: false,
		footerJobCode: false,
		logoutButton: false		
	},
	'screen-summary': {
		header: true,
		footer: true,
		headerButtons: true,
		headerLogo: true,		
		headerSteps: false,
		footerButtons: true,
		footerSavedSessions: false,
		footerJobCode: false,
		logoutButton: false		
	}
};

const UI_ELEMENTS = {
	header: header,
	footer: footer,
	headerButtons: headerButtons,
	headerLogo: headerLogo,
	headerSteps: headerSteps,
	footerButtons: footerButtons,
	footerSavedSessions: footerSavedSessions,
	footerJobCode: footerJobCode,
	logoutButton: logoutButton 	
};

function updateUiVisibility(screenId) {
	const visibilityConfig = UI_VISIBILITY_MAP[screenId];
	
	if (!visibilityConfig) {
		console.warn(`No UI visibility config found for ${screenId}`);
		return;
	}
	
	Object.keys(visibilityConfig).forEach(elementName => {
		const element = UI_ELEMENTS[elementName];
		const shouldBeVisible = visibilityConfig[elementName];
		
		if (element) {
			if (shouldBeVisible) {
				if (elementName == "footerSavedSessions"){
					element.classList.remove('u-d-none');					
				} else	{			
					element.classList.add('cc-active');
				}	
			} else {
				if (elementName == "footerSavedSessions"){
					element.classList.add('u-d-none');					
				} else	{			
					element.classList.remove('cc-active');
				}					
			}
		}
	});
}

const screenHandlers = {
	'screen-home': { 
		leave: async () => { 
			homeWelcome?.classList.remove('cc-active'); 
			await wait(1000); 
		},
		enter: async () => { 
			await wait(1000); 
			homeWelcome?.classList.add('cc-active'); 
		}
	},
	'screen-welcome': { 
		leave: async () => { 
			speechWelcome?.classList.remove('cc-active'); 
			await wait(1000); 
		},
		enter: async () => { 
			await wait(1000);
			speechWelcome?.classList.add('cc-active');
		}
	},
	'screen-waiting-room': { 
		leave: async () => { 
			clipboards.forEach(cb => cb.classList.remove('cc-active')); 
			await wait(1000); 
		},
		enter: async () => { 
			await wait(1000);
			const bubbles = [
				$('.speech-bubble-mini.cc-amina'),
				$('.speech-bubble-mini.cc-daniel'),
				$('.speech-bubble-mini.cc-olivia'),
				$('.speech-bubble-mini.cc-luis')
			];
			for (const bubble of bubbles) {
				bubble?.classList.add('cc-active');
				await wait(50);
			}
		}
	},
	'screen-office': { 
		leave: async () => {},
		enter: async () => { 
			await wait(1000); 
			speechOffice?.classList.add('cc-active'); 
		}
	},
	'screen-questions': { 
		leave: async () => {},
		enter: async () => { 
			await wait(1000);
			
			if (!isRestoringSession) {
				currentPageIndex = 0;
				showPage(0);
			} else {
				showPage(currentPageIndex);
				isRestoringSession = false;
			}
		}
	},
	'screen-summary': { 
		leave: async () => {},
		enter: async () => { 
			await wait(1000);
			speechFinal?.classList.add('cc-active');
		}
	}
};
async function showScreen(screenId) {
	const currentScreen = $('.screen.cc-active');
	
	if (currentScreen && screenHandlers[currentScreen.id]) {
		await screenHandlers[currentScreen.id].leave();
	}
	
	screens.forEach(screen => screen.classList.remove('cc-active'));
	closeAllModals();
	
	const targetScreen = $(`#${screenId}`);
	targetScreen?.classList.add('cc-active');
	updateSessionLocation(screenId);
	
	updateUiVisibility(screenId);
	
	if (screenHandlers[screenId]) {
		await screenHandlers[screenId].enter();
	}
	
	updateFooterTerms();
}

function showPage(pageIndex) {
	pages.forEach(page => page.classList.remove('cc-active'));
	if (pages[pageIndex]) {
		pages[pageIndex].classList.add('cc-active');
		currentPageIndex = pageIndex;
	}
	updatePageNavigation();
	updateStepIndicators();
	checkForCarousel();
	updateSessionLocation('screen-questions', pageIndex);
	if (pageIndex === 0) updatePageNavigationForDiseaseState();
	
	updateFooterTerms();
}

function updatePageNavigation() {
	pageNavPrev?.classList.toggle('cc-disabled', currentPageIndex === 0);
	pageNavNext?.classList.remove('cc-disabled');
}

function updateStepIndicators() {
	headerStepIndicators.forEach((step, index) => {
		step.classList.remove('cc-active', 'cc-visited');
		if (index < currentPageIndex) {
			step.classList.add('cc-visited');
		} else if (index === currentPageIndex) {
			step.classList.add('cc-active');
		}
	});
}

function goToNextPage() {
	if (currentPageIndex === 0) {
		const diseaseStateData = collectDiseaseStateData();
		if (diseaseStateData) {
			saveDiseaseState(diseaseStateData.disease_state_id, diseaseStateData.disease_state_title);
		} else {
			alert('Please select a disease state or enter a custom description');
			return;
		}
	}
	
	if (isOnCarouselPage && currentCarouselInstance) {
		const currentSlide = currentCarouselInstance.index;
		const totalSlides = currentCarouselInstance.length;
		if (currentSlide === totalSlides - 1) {
			showPage(currentPageIndex + 1);
		} else {
			updateCarouselSubtitles(currentSlide + 1);
			currentCarouselInstance.go('+1');
			resetChecklistScroll();
		}
		return;
	}
	
	if (currentPageIndex === pages.length - 1) {
		openFinishSessionModal();
	} else {
		showPage(currentPageIndex + 1);
	}
}

function goToPreviousPage() {
	if (isOnCarouselPage && currentCarouselInstance) {
		const currentSlide = currentCarouselInstance.index;
		if (currentSlide === 0) {
			showPage(currentPageIndex - 1);
		} else {
			updateCarouselSubtitles(currentSlide - 1);
			currentCarouselInstance.go('-1');
			resetChecklistScroll();
		}
		return;
	}
	
	if (currentPageIndex === 0) {
		showScreen('screen-office');
	} else {
		showPage(currentPageIndex - 1);
	}
}

function checkForCarousel() {
	const currentPage = pages[currentPageIndex];
	const carousel = currentPage?.querySelector('.splide');
	
	if (carousel && currentPageIndex === carouselPageIndex) {
		isOnCarouselPage = true;
		currentCarouselInstance = carousel.splide;
		updateCarouselNavigation();
		updateCarouselSubtitles(lastCarouselSlideIndex);
		if (currentCarouselInstance) currentCarouselInstance.go(lastCarouselSlideIndex);
	} else {
		isOnCarouselPage = false;
		currentCarouselInstance = null;
	}
}

function updateCarouselNavigation() {
	if (!currentCarouselInstance) return;
	pageNavPrev?.classList.remove('cc-disabled');
	pageNavNext?.classList.remove('cc-disabled');
}

function resetChecklistScroll() {
	const checklistBodies = $$('.checklist-body');
	setTimeout(() => {
		checklistBodies.forEach(checklist => checklist.scrollTo({ top: 0, behavior: 'smooth' }));
	}, 600);
}

function updateCarouselSubtitles(slideIndex) {
	questionSubtitles.forEach(subtitle => subtitle.classList.remove('cc-active'));
	if (questionSubtitles[slideIndex]) {
		questionSubtitles[slideIndex].classList.add('cc-active');
	}
	lastCarouselSlideIndex = slideIndex;
	
	updateFooterTerms();
}

function updateFooterTerms() {
	$$('.app-footer-terms-item').forEach(i => i.classList.remove('cc-active'));
	
	let tid = null;
	const s = getActiveSession();
	const pid = s?.patient?.id;
	
	// Priority 0: Check if a summary tier is active (on summary screen)
	const activeSummary = $('.summary.cc-active');
	if (activeSummary) {
		tid = activeSummary.getAttribute('terms-id');
	}
	
	// Priority 1: Check if a patient clipboard is active (highest priority on office screen)
	if (!tid) {
		const activeClipboard = $('.cp-clipboard.cc-active');
		if (activeClipboard) {
			tid = activeClipboard.getAttribute('terms-id');
		}
	}
	
	// Priority 2: Check if on carousel page and get current slide terms-id
	// ONLY check if we're actually on the questions screen
	if (!tid && isOnCarouselPage && currentCarouselInstance && $('.screen.cc-active')?.id === 'screen-questions') {
		// Get all slides in the carousel
		const allSlides = $$('.splide__slide[terms-id]');
		// Use lastCarouselSlideIndex to get the correct slide
		const currentSlide = allSlides[lastCarouselSlideIndex];
		
		if (currentSlide) {
			tid = currentSlide.getAttribute('terms-id');
			
			if (tid && pid) {
				const patientSpecificTerms = $(`#footer-terms-${tid}-${pid}`);
				if (patientSpecificTerms) {
					tid = `${tid}-${pid}`;
				}
			}
		}
	}
	
	// Priority 3: Check current page - ONLY if on questions screen
	if (!tid && pages[currentPageIndex] && $('.screen.cc-active')?.id === 'screen-questions') {
		tid = pages[currentPageIndex].getAttribute('terms-id');
		
		if (tid && pid) {
			const patientSpecificTerms = $(`#footer-terms-${tid}-${pid}`);
			if (patientSpecificTerms) {
				tid = `${tid}-${pid}`;
			}
		}
	}
	
	// Priority 4: Check current screen
	if (!tid) {
		const currentScreen = $('.screen.cc-active');
		tid = currentScreen?.getAttribute('terms-id');
		
		if (tid && pid) {
			const patientSpecificTerms = $(`#footer-terms-${tid}-${pid}`);
			if (patientSpecificTerms) {
				tid = `${tid}-${pid}`;
			}
		}
	}
	
	if (tid) {
		const termsItem = $(`#footer-terms-${tid}`);
		termsItem?.classList.add('cc-active');
	}
}

// =============================================================================
// PATIENT MANAGEMENT
// =============================================================================

function choosePatient() {
	const currentPatient = patients[currentPatientIndex];
	if (!currentPatient) return;
	
	updateActiveSession({
		patient: { id: currentPatient.id, label: currentPatient.label }
	});
	
	patientProfiles.forEach(profile => profile.classList.remove('cc-active'));
	const selectedProfiles = $$(`#profile-${currentPatient.id}`);
	selectedProfiles.forEach(profile => profile.classList.add('cc-active'));
	
	const patientName = currentPatient.id.replace('patient-', '').charAt(0).toUpperCase() + 
	                     currentPatient.id.replace('patient-', '').slice(1);
	$$('.dynamic-patient-name').forEach(span => span.textContent = patientName);
}

function showPatient(patientId) {
	clipboards.forEach(cb => cb.classList.remove('cc-active'));
	patientBackgrounds.forEach(bg => bg.classList.remove('cc-active'));
	patientOfficeBackgrounds.forEach(bg => bg.classList.remove('cc-active'));
	patientFinalBackgrounds.forEach(bg => bg.classList.remove('cc-active'));	
	patientBubbles.forEach(pb => pb.classList.remove('cc-active'));
	
	$(`#bg-${patientId}`)?.classList.add('cc-active');
	$(`#bg-office-${patientId}`)?.classList.add('cc-active');
	$(`#bg-final-${patientId}`)?.classList.add('cc-active');	
	$(`#clipboard-${patientId}`)?.classList.add('cc-active');
	
	const patient = patients.find(p => p.id === patientId);
	if (patient && switchLabel) switchLabel.textContent = patient.label;
	patientSwitch?.classList.add('cc-active');
	
	updateFooterTerms();
}

const switchToNextPatient = () => {
	currentPatientIndex = (currentPatientIndex + 1) % patients.length;
	showPatient(patients[currentPatientIndex].id);
};

const switchToPreviousPatient = () => {
	currentPatientIndex = (currentPatientIndex - 1 + patients.length) % patients.length;
	showPatient(patients[currentPatientIndex].id);
};

// =============================================================================
// CHECKLIST ITEM HANDLERS
// =============================================================================

function handleChecklistItemClick() {
	$$('.checklist-item').forEach(item => {
		setupEditIconHandler(item);
		setupChecklistItemHandler(item);
	});
}

function setupEditIconHandler(item) {
	const editIcon = item.querySelector('.icon-edit');
	editIcon?.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		const checklistId = item.getAttribute('checklist_id');
		const title = item.getAttribute('title');
		const isCustom = item.getAttribute('is_custom');
		const existingData = getSelectedChecklistItem(checklistId);
		currentChecklistItem = item;
		isEditMode = true;
		if (isCustom === 'true') {
			openCustomChecklistModalForEdit(title, existingData);
		} else {
			openChecklistModal(title, existingData);
		}
	});
}

function setupChecklistItemHandler(item) {
	item.addEventListener('click', (e) => {
		e.preventDefault();
		const checklistId = item.getAttribute('checklist_id');
		const title = item.getAttribute('title');
		const isSelected = item.classList.contains('cc-selected');
		const isCustom = item.getAttribute('is_custom');
		const existingData = getSelectedChecklistItem(checklistId);
		
		if (isSelected) {
			deselectChecklistItem(item);
		} else if (existingData) {
			currentChecklistItem = item;
			isEditMode = true;
			if (isCustom === 'true') {
				openCustomChecklistModalForEdit(title, existingData);
			} else {
				openChecklistModal(title, existingData);
			}
		} else {
			currentChecklistItem = item;
			isEditMode = false;
			if (isCustom === 'true') {
				openCustomChecklistModalForEdit(title, null);
			} else {
				openChecklistModal(title, null);
			}
		}
	});
}

function saveChecklistItem(frequencyId, frequencyTitle) {
	if (!currentChecklistItem) return;
	const checklistId = currentChecklistItem.getAttribute('checklist_id');
	const title = currentChecklistItem.getAttribute('title');
	const isCustom = currentChecklistItem.getAttribute('is_custom');
	const itemData = {
		checklist_id: checklistId,
		title: title,
		is_custom: isCustom,
		frequency_id: frequencyId,
		frequency_title: frequencyTitle
	};
	saveSelectedChecklistItem(itemData);
	updateChecklistItemDOM(currentChecklistItem, frequencyId, frequencyTitle);
	closeAllModals();
	currentChecklistItem = null;
	isEditMode = false;
}

function deselectChecklistItem(item) {
	const checklistId = item.getAttribute('checklist_id');
	removeSelectedChecklistItem(checklistId);
	item.classList.remove('cc-selected');
	item.setAttribute('frequency_id', '');
	item.setAttribute('frequency_title', '');
	const checkbox = item.querySelector('input[type="checkbox"]');
	if (checkbox) {
		checkbox.checked = false;
		const visualDiv = checkbox.previousElementSibling;
		visualDiv?.classList.remove('w--redirected-checked');
	}
	const dynamicFrequency = item.querySelector('.dynamic-frequency');
	if (dynamicFrequency) dynamicFrequency.textContent = '';
}

function updateChecklistItemDOM(item, frequencyId, frequencyTitle) {
	item.setAttribute('frequency_id', frequencyId);
	item.setAttribute('frequency_title', frequencyTitle);
	item.classList.add('cc-selected');
	const checkbox = item.querySelector('input[type="checkbox"]');
	if (checkbox) {
		checkbox.checked = true;
		checkbox.previousElementSibling?.classList.add('w--redirected-checked');
	}
	const dynamicFrequency = item.querySelector('.dynamic-frequency');
	if (dynamicFrequency) dynamicFrequency.textContent = frequencyTitle;
}

// =============================================================================
// MODAL - SIMPLE CHECKLIST
// =============================================================================

function openChecklistModal(toolTitle, existingData = null) {
	const modal = $id('modal-checklist-simple');
	const toolNameElement = $id('tool-name');
	if (!modal) return;
	if (toolNameElement) toolNameElement.textContent = toolTitle;
	populateChecklistModal(existingData);
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
	setTimeout(() => handleFrequencyOtherToggle(), 100);
}

function populateChecklistModal(existingData) {
	const modal = $id('modal-checklist-simple');
	const radioButtons = modal?.querySelectorAll('input[type="radio"][name="monitoring-frequency"]');
	const customFrequencyInput = $id('tool-custom-frequency');
	const customFrequencyGroup = $id('input-group-custom-frequency');
	clearModalForm(radioButtons, customFrequencyInput, customFrequencyGroup);
	if (existingData?.frequency_id && existingData.frequency_id !== '' && existingData.frequency_id !== 'skipped') {
		setTimeout(() => populateModalWithData(existingData, radioButtons, customFrequencyInput, customFrequencyGroup), 10);
	}
}

function clearModalForm(radioButtons, customFrequencyInput, customFrequencyGroup) {
	radioButtons?.forEach(radio => {
		radio.checked = false;
		radio.removeAttribute('checked');
		radio.previousElementSibling?.classList.remove('w--redirected-checked');
	});
	if (customFrequencyInput) customFrequencyInput.value = '';
	customFrequencyGroup?.classList.add('cc-disabled');
}

function populateModalWithData(existingData, radioButtons, customFrequencyInput, customFrequencyGroup) {
	const frequencyId = existingData.frequency_id;
	if (frequencyId === 'other') {
		const otherRadio = Array.from(radioButtons).find(radio => radio.value === 'other');
		if (otherRadio) {
			checkRadioButton(otherRadio);
			customFrequencyGroup?.classList.remove('cc-disabled');
			if (customFrequencyInput) customFrequencyInput.value = existingData.frequency_title || '';
		}
	} else {
		const matchingRadio = Array.from(radioButtons).find(radio => radio.value === frequencyId);
		if (matchingRadio) checkRadioButton(matchingRadio);
	}
}

function checkRadioButton(radio) {
	radio.checked = true;
	radio.previousElementSibling?.classList.add('w--redirected-checked');
}

// =============================================================================
// FREQUENCY TOGGLE HANDLERS
// =============================================================================

function handleFrequencyOtherToggle() {
	const otherRadio = $id('freq-other');
	const customFrequencyInput = $id('tool-custom-frequency');
	const customFrequencyGroup = $id('input-group-custom-frequency');
	if (!otherRadio) return;
	setupOtherRadioHandler(otherRadio, customFrequencyInput, customFrequencyGroup);
	setupCustomInputHandler(otherRadio, customFrequencyInput, customFrequencyGroup);
	setupStandardFrequencyHandlers(customFrequencyInput, customFrequencyGroup);
}

function setupOtherRadioHandler(otherRadio, customFrequencyInput, customFrequencyGroup) {
	const otherLabel = otherRadio.closest('label');
	otherLabel?.addEventListener('click', () => {
		setTimeout(() => {
			if (otherRadio.checked) {
				customFrequencyGroup?.classList.remove('cc-disabled');
				customFrequencyInput?.focus();
			}
		}, 50);
	}, true);
}

function setupCustomInputHandler(otherRadio, customFrequencyInput, customFrequencyGroup) {
	customFrequencyInput?.addEventListener('click', () => {
		const modal = $id('modal-checklist-simple');
		const allRadios = modal?.querySelectorAll('input[type="radio"][name="monitoring-frequency"]');
		allRadios?.forEach(radio => {
			radio.checked = false;
			radio.previousElementSibling?.classList.remove('w--redirected-checked');
		});
		otherRadio.checked = true;
		otherRadio.previousElementSibling?.classList.add('w--redirected-checked');
		customFrequencyGroup?.classList.remove('cc-disabled');
		customFrequencyInput.focus();
	});
}

function setupStandardFrequencyHandlers(customFrequencyInput, customFrequencyGroup) {
	['freq-3-months', 'freq-6-months', 'freq-12-months', 'freq-none']
		.map(id => $id(id))
		.filter(radio => radio !== null)
		.forEach(radio => {
			radio.closest('label')?.addEventListener('click', () => {
				setTimeout(() => {
					if (radio.checked) {
						customFrequencyGroup?.classList.add('cc-disabled');
						if (customFrequencyInput) customFrequencyInput.value = '';
					}
				}, 50);
			}, true);
		});
}

// =============================================================================
// FORM SUBMISSION HANDLERS
// =============================================================================

function handleChecklistConfirm() {
	const modal = $id('modal-checklist-simple');
	const confirmButton = modal?.querySelector('#save-tool');
	if (!confirmButton) return;
	confirmButton.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		if (!currentChecklistItem) return;
		const { frequencyId, frequencyTitle } = getFormValues(modal);
		saveChecklistItem(frequencyId, frequencyTitle);
	});
}

function getFormValues(modal) {
	const radioButtons = modal.querySelectorAll('input[type="radio"][name="monitoring-frequency"]');
	const customFrequencyInput = $id('tool-custom-frequency');
	const selectedRadio = Array.from(radioButtons).find(radio => radio.checked);
	if (!selectedRadio) return { frequencyId: '', frequencyTitle: 'skipped' };
	const frequencyId = selectedRadio.value;
	if (frequencyId === 'other') {
		const customTitle = customFrequencyInput?.value.trim() || '';
		return customTitle ? { frequencyId: 'other', frequencyTitle: customTitle } : { frequencyId: '', frequencyTitle: 'skipped' };
	}
	if (frequencyId === 'none') return { frequencyId: 'none', frequencyTitle: 'None' };
	const frequencyTitle = selectedRadio.getAttribute('title') || '';
	return { frequencyId, frequencyTitle };
}

function handleSkipFrequency() {
	const skipLink = $id('skip-frequency');
	skipLink?.addEventListener('click', (e) => {
		e.preventDefault();
		if (!currentChecklistItem) return;
		saveChecklistItem('', 'skipped');
	});
}

// =============================================================================
// CUSTOM CHECKLIST ITEMS
// =============================================================================

function handleAddCustomChecklistItem() {
	$$('[id^="add-checklist-item-"]').forEach(button => {
		button.addEventListener('click', (e) => {
			e.preventDefault();
			currentCustomGroupId = button.id.replace('add-checklist-item-', '');
			openCustomChecklistModal();
		});
	});
}

function openCustomChecklistModal() {
	const modal = $id('modal-checklist-custom');
	const toolNameInput = $id('custom-tool-name');
	const deleteButton = $id('delete-tool');
	if (!modal) return;
	clearCustomModalForm();
	if (deleteButton) deleteButton.style.display = 'none';
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
	setTimeout(() => {
		toolNameInput?.focus();
		handleCustomFrequencyOtherToggle();
	}, 100);
}

function openCustomChecklistModalForEdit(toolName, existingData) {
	const modal = $id('modal-checklist-custom');
	const toolNameInput = $id('custom-tool-name');
	const deleteButton = $id('delete-tool');
	if (!modal) return;
	clearCustomModalForm();
	if (toolNameInput) toolNameInput.value = toolName;
	if (existingData?.frequency_id && existingData.frequency_id !== '' && existingData.frequency_id !== 'skipped') {
		setTimeout(() => populateCustomModalWithData(existingData), 10);
	}
	if (deleteButton) deleteButton.style.display = 'block';
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
modal.classList.add('cc-show');
	setTimeout(() => handleCustomFrequencyOtherToggle(), 100);
}

function clearCustomModalForm() {
	const modal = $id('modal-checklist-custom');
	const toolNameInput = $id('custom-tool-name');
	const radioButtons = modal?.querySelectorAll('input[type="radio"][name="custom-monitoring-frequency"]');
	const customFrequencyInput = $id('custom-tool-custom-frequency');
	const customFrequencyGroup = $id('input-group-custom-frequency');
	if (toolNameInput) toolNameInput.value = '';
	radioButtons?.forEach(radio => {
		radio.checked = false;
		radio.removeAttribute('checked');
		radio.previousElementSibling?.classList.remove('w--redirected-checked');
	});
	if (customFrequencyInput) customFrequencyInput.value = '';
	customFrequencyGroup?.classList.add('cc-disabled');
}

function populateCustomModalWithData(existingData) {
	const modal = $id('modal-checklist-custom');
	const radioButtons = modal?.querySelectorAll('input[type="radio"][name="custom-monitoring-frequency"]');
	const customFrequencyInput = $id('custom-tool-custom-frequency');
	const customFrequencyGroup = $id('input-group-custom-frequency');
	const frequencyId = existingData.frequency_id;
	if (frequencyId === 'other') {
		const otherRadio = Array.from(radioButtons).find(radio => radio.value === 'other');
		if (otherRadio) {
			checkRadioButton(otherRadio);
			customFrequencyGroup?.classList.remove('cc-disabled');
			if (customFrequencyInput) customFrequencyInput.value = existingData.frequency_title || '';
		}
	} else {
		const matchingRadio = Array.from(radioButtons).find(radio => radio.value === frequencyId);
		if (matchingRadio) checkRadioButton(matchingRadio);
	}
}

function handleCustomFrequencyOtherToggle() {
	const otherRadio = $id('custom-freq-other');
	const customFrequencyInput = $id('custom-tool-custom-frequency');
	const customFrequencyGroup = $id('input-group-custom-frequency');
	if (!otherRadio) return;
	
	const otherLabel = otherRadio.closest('label');
	otherLabel?.addEventListener('click', () => {
		setTimeout(() => {
			if (otherRadio.checked) {
				customFrequencyGroup?.classList.remove('cc-disabled');
				customFrequencyInput?.focus();
			}
		}, 50);
	}, true);
	
	customFrequencyInput?.addEventListener('click', () => {
		const modal = $id('modal-checklist-custom');
		const allRadios = modal?.querySelectorAll('input[type="radio"][name="custom-monitoring-frequency"]');
		allRadios?.forEach(radio => {
			radio.checked = false;
			radio.previousElementSibling?.classList.remove('w--redirected-checked');
		});
		otherRadio.checked = true;
		otherRadio.previousElementSibling?.classList.add('w--redirected-checked');
		customFrequencyGroup?.classList.remove('cc-disabled');
		customFrequencyInput.focus();
	});
	
	['3_months', '6_months', '12_months', 'none']
		.map(id => $id(id))
		.filter(radio => radio !== null)
		.forEach(radio => {
			radio.closest('label')?.addEventListener('click', () => {
				setTimeout(() => {
					if (radio.checked) {
						customFrequencyGroup?.classList.add('cc-disabled');
						if (customFrequencyInput) customFrequencyInput.value = '';
					}
				}, 50);
			}, true);
		});
}

function handleCustomChecklistConfirm() {
	const modal = $id('modal-checklist-custom');
	const confirmButton = modal?.querySelector('#save-custom-tool');
	if (!confirmButton) return;
	confirmButton.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		const { toolName, frequencyId, frequencyTitle } = getCustomFormValues(modal);
		if (!toolName || toolName.trim() === '') {
			alert('Please enter a tool name');
			return;
		}
		if (currentChecklistItem) {
			updateCustomChecklistItem(toolName, frequencyId, frequencyTitle);
		} else if (currentCustomGroupId) {
			createCustomChecklistItem(currentCustomGroupId, toolName, frequencyId, frequencyTitle);
		}
	});
}

function getCustomFormValues(modal) {
	const toolNameInput = $id('custom-tool-name');
	const radioButtons = modal.querySelectorAll('input[type="radio"][name="custom-monitoring-frequency"]');
	const customFrequencyInput = $id('custom-tool-custom-frequency');
	const selectedRadio = Array.from(radioButtons).find(radio => radio.checked);
	const toolName = toolNameInput?.value.trim() || '';
	if (!selectedRadio) return { toolName, frequencyId: '', frequencyTitle: 'skipped' };
	const frequencyId = selectedRadio.value;
	if (frequencyId === 'other') {
		const customTitle = customFrequencyInput?.value.trim() || '';
		return { toolName, frequencyId: customTitle ? 'other' : '', frequencyTitle: customTitle || 'skipped' };
	}
	if (frequencyId === 'none') return { toolName, frequencyId: 'none', frequencyTitle: 'None' };
	const frequencyTitle = selectedRadio.getAttribute('title') || '';
	return { toolName, frequencyId, frequencyTitle };
}

function createCustomChecklistItem(groupId, toolName, frequencyId, frequencyTitle) {
	const timestamp = Date.now();
	const checklistId = `${groupId}_custom_${timestamp}`;
	const itemData = {
		checklist_id: checklistId,
		title: toolName,
		is_custom: 'true',
		frequency_id: frequencyId,
		frequency_title: frequencyTitle
	};
	saveSelectedChecklistItem(itemData);
	appendCustomChecklistItemToDOM(groupId, itemData);
	closeAllModals();
	currentCustomGroupId = null;
}

function updateCustomChecklistItem(toolName, frequencyId, frequencyTitle) {
	if (!currentChecklistItem) return;
	const checklistId = currentChecklistItem.getAttribute('checklist_id');
	const isCustom = currentChecklistItem.getAttribute('is_custom');
	const itemData = {
		checklist_id: checklistId,
		title: toolName,
		is_custom: isCustom,
		frequency_id: frequencyId,
		frequency_title: frequencyTitle
	};
	saveSelectedChecklistItem(itemData);
	currentChecklistItem.setAttribute('title', toolName);
	currentChecklistItem.setAttribute('frequency_id', frequencyId);
	currentChecklistItem.setAttribute('frequency_title', frequencyTitle);
	currentChecklistItem.classList.add('cc-selected');
	const checkbox = currentChecklistItem.querySelector('input[type="checkbox"]');
	if (checkbox) {
		checkbox.checked = true;
		checkbox.previousElementSibling?.classList.add('w--redirected-checked');
	}
	currentChecklistItem.querySelectorAll('.input-label.cc-static.cc-toggle').forEach(el => el.textContent = toolName);
	const dynamicFrequency = currentChecklistItem.querySelector('.dynamic-frequency');
	if (dynamicFrequency) dynamicFrequency.textContent = frequencyTitle;
	closeAllModals();
	currentChecklistItem = null;
	isEditMode = false;
}

function appendCustomChecklistItemToDOM(groupId, itemData) {
	const customToolsContainer = $id(`custom-tools-${groupId}`);
	if (!customToolsContainer) return;
	const checklistItemHTML = `
		<div frequency_title="${itemData.frequency_title}" 
		     checklist_id="${itemData.checklist_id}" 
		     title="${itemData.title}" 
		     is_custom="${itemData.is_custom}" 
		     frequency_id="${itemData.frequency_id}" 
		     class="checklist-item cc-selected">
			<label class="w-checkbox input-group cc-toggle cc-mini cc-pointer-none">
				<div class="w-checkbox-input w-checkbox-input--inputType-custom input-radio w--redirected-checked"></div>
				<input type="checkbox" id="checkbox" name="checkbox" data-name="Checkbox" checked style="opacity:0;position:absolute;z-index:-1">
				<span class="input-label cc-static cc-toggle u-d-none w-form-label" for="checkbox">${itemData.title}</span>
			</label>
			<div class="input-label-group">
				<div class="u-d-flex-vert cc-gap-xxs">
					<p class="input-label cc-static cc-toggle">${itemData.title}</p>
					<p class="input-label-small cc-custom">(Custom tool)</p>
				</div>
				<p class="input-label cc-frequency">Frequency: <span class="dynamic-frequency">${itemData.frequency_title}</span></p>
			</div>
			<img src="https://cdn.prod.website-files.com/68e3c6899eef845930969d61/68ed24614952847209b97b49_icon-edit-3.svg" loading="lazy" alt="" class="icon-edit">
		</div>
	`;
	customToolsContainer.insertAdjacentHTML('beforeend', checklistItemHTML);
	customToolsContainer.classList.add('cc-active');
	const newItem = customToolsContainer.lastElementChild;
	setupEditIconHandler(newItem);
	setupChecklistItemHandler(newItem);
}

function handleSkipCustomFrequency() {
	const skipLink = $id('skip-frequency-custom');
	skipLink?.addEventListener('click', (e) => {
		e.preventDefault();
		if (!currentCustomGroupId && !isEditMode) return;
		const toolNameInput = $id('custom-tool-name');
		const toolName = toolNameInput?.value.trim() || '';
		if (!toolName) {
			alert('Please enter a tool name');
			return;
		}
		if (isEditMode && currentChecklistItem) {
			updateCustomChecklistItem(toolName, '', 'skipped');
		} else if (currentCustomGroupId) {
			createCustomChecklistItem(currentCustomGroupId, toolName, '', 'skipped');
		}
	});
}

function handleDeleteCustomTool() {
	const deleteButton = $id('delete-tool');
	deleteButton?.addEventListener('click', (e) => {
		e.preventDefault();
		if (!currentChecklistItem) return;
		if (confirm('Are you sure you want to delete this custom tool?')) {
			deleteCustomChecklistItem(currentChecklistItem);
		}
	});
}

function deleteCustomChecklistItem(item) {
	const checklistId = item.getAttribute('checklist_id');
	const customToolsContainer = item.closest('[id^="custom-tools-"]');
	removeSelectedChecklistItem(checklistId);
	item.remove();
	if (customToolsContainer) {
		const remainingItems = customToolsContainer.querySelectorAll('.checklist-item');
		if (remainingItems.length === 0) {
			customToolsContainer.classList.remove('cc-active');
		}
	}
	closeAllModals();
	currentChecklistItem = null;
	isEditMode = false;
}


// =============================================================================
// FINISH SESSION MODAL & SUMMARY
// =============================================================================

function openFinishSessionModal() {
	const modal = $id('modal-questions-finish-session');
	if (!modal) {
		console.error('Modal #modal-questions-finish-session not found');
		return;
	}
	$('.page-modals')?.classList.add('cc-show');
	$('.modal-overlay')?.classList.add('cc-show');
	modal.classList.add('cc-show');
}


function cleanupQuestionsScreen() {
	pages.forEach(page => page.classList.remove('cc-active'));
	currentPageIndex = 0;
	isOnCarouselPage = false;
	currentCarouselInstance = null;
	lastCarouselSlideIndex = 0;
}

function calculateSummaryTier() {
	// TODO: Add logic to calculate tier based on session data
	completeSession();
	return 2;
}

function showSummaryTier() {
	$$('.summary').forEach(summary => {
		summary.classList.remove('cc-active');
	});
	const tierNumber = calculateSummaryTier();
	setSummaryTier(tierNumber);
	const selectedTier = $id(`summary-tier-${tierNumber}`);
	selectedTier?.classList.add('cc-active');
	
	updateFooterTerms();
}

function handleFinishSessionButton() {
	const finishButton = $id('btn-screen-summary');
	if (!finishButton) return;
	finishButton.addEventListener('click', (e) => {
		e.preventDefault();
		cleanupQuestionsScreen();
		showSummaryTier();
		showScreen('screen-summary');
	});
}

function handleShowSummaryButton() {
	const showSummaryButton = $id('btn-show-summary');
	if (!showSummaryButton) return;
	showSummaryButton.addEventListener('click', (e) => {
		e.preventDefault();
		summaryContainer?.classList.add('cc-active');
		summaryClipboard?.classList.add('cc-active');
	});
}

// =============================================================================
// COMPLETE SESSION & CLEANUP
// =============================================================================

function resetDiseaseStateForm() {
	const diseaseStateRadios = $$('input[type="radio"][name="disease-state"]');
	diseaseStateRadios.forEach(radio => {
		radio.checked = false;
		radio.removeAttribute('checked');
		radio.previousElementSibling?.classList.remove('w--redirected-checked');
	});
	const diseaseStateOtherDescription = $id('disease-state-other-description');
	if (diseaseStateOtherDescription) {
		diseaseStateOtherDescription.value = '';
		diseaseStateOtherDescription.classList.add('cc-disabled');
	}
	$('.cp-disease-selector')?.classList.remove('cc-open');
}

function resetChecklistModals() {
	const resetModalRadios = (modalId, radioName) => {
		const modal = $id(modalId);
		if (!modal) return;
		modal.querySelectorAll(`input[type="radio"][name="${radioName}"]`).forEach(radio => {
			radio.checked = false;
			radio.removeAttribute('checked');
			radio.previousElementSibling?.classList.remove('w--redirected-checked');
		});
	};
	
	resetModalRadios('modal-checklist-simple', 'monitoring-frequency');
	resetModalRadios('modal-checklist-custom', 'custom-monitoring-frequency');
	
	const inputs = [
		'tool-custom-frequency',
		'custom-tool-name',
		'custom-tool-custom-frequency'
	];
	inputs.forEach(id => {
		const input = $id(id);
		if (input) input.value = '';
	});
	
	$$('#input-group-custom-frequency').forEach(group => {
		group.classList.add('cc-disabled');
	});
}

function resetChecklistItems() {
	$$('.checklist-item').forEach(item => {
		item.classList.remove('cc-selected');
		item.setAttribute('frequency_id', '');
		item.setAttribute('frequency_title', '');
		const checkbox = item.querySelector('input[type="checkbox"]');
		if (checkbox) {
			checkbox.checked = false;
			checkbox.previousElementSibling?.classList.remove('w--redirected-checked');
		}
		const dynamicFrequency = item.querySelector('.dynamic-frequency');
		if (dynamicFrequency) dynamicFrequency.textContent = '';
	});
	
	$$('[id^="custom-tools-"]').forEach(container => {
		container.querySelectorAll('.checklist-item').forEach(item => item.remove());
		container.classList.remove('cc-active');
	});
}

function cleanupAllScreens() {
	pages.forEach(page => page.classList.remove('cc-active'));
	$$('.summary').forEach(summary => summary.classList.remove('cc-active'));
	
	const elementsToHide = [
		headerButtons, headerSteps, patientSwitch, speechOffice, 
		speechFinal, summaryContainer, summaryClipboard
	];
	elementsToHide.forEach(el => el?.classList.remove('cc-active'));
	
	[patientProfiles, patientBackgrounds, patientOfficeBackgrounds, 
	 patientFinalBackgrounds, patientBubbles].forEach(collection => {
		collection.forEach(item => item.classList.remove('cc-active'));
	});
	
	resetDiseaseStateForm();
	resetChecklistModals();
	resetChecklistItems();
	closeAllModals();
	
	lastCarouselSlideIndex = 0;
	if (currentCarouselInstance) {
		currentCarouselInstance.go(0);
	}	
}

function resetApplicationState() {
	currentPageIndex = 0;
	currentPatientIndex = 0;
	isOnCarouselPage = false;
	currentCarouselInstance = null;
	diseaseStateSelected = false;
	currentChecklistItem = null;
	currentCustomGroupId = null;
	isEditMode = false;
	isRestoringSession = false;
}

function refreshSessions() {
	const session = getActiveSession();
	
	if (session) {
		// Save the active session to saved_sessions before removing it
		saveSessionToStorage(session);
	}	
	
	// TODO: Part (a) - Send complete active session to API endpoint
	localStorage.removeItem('active_session');
}

function handleCompleteSessionButtons() {
	const completeButtons = $$('[id="btn-complete-session"]');
	completeButtons.forEach(button => {
		button.addEventListener('click', (e) => {
			e.preventDefault();
			endSessionAndReturnHome();
		});
	});
}

function endSessionAndReturnHome() {
	cleanupAllScreens();
	resetApplicationState();
	refreshSessions();
	showScreen('screen-welcome');
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function handleScreenButtons() {
	screenButtons.forEach(button => {
		button.addEventListener('click', (e) => {
			e.preventDefault();
			const buttonId = button.id;
			const screenId = buttonId.replace('btn-', '');
			if (buttonId === 'btn-screen-waiting-room') createNewSession();
			if (buttonId === 'btn-screen-office') choosePatient();
			showScreen(screenId);
		});
	});
}

function handlePatientSelection() {
	patientBubbles.forEach((bubble, index) => {
		bubble.addEventListener('click', (e) => {
			e.preventDefault();
			currentPatientIndex = index;
			showPatient(bubble.id);
		});
	});
}

function handleClipboardClose() {
	clipboardCloseButtons.forEach(closeBtn => {
		closeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			clipboards.forEach(cb => cb.classList.remove('cc-active'));
			patientBackgrounds.forEach(bg => bg.classList.remove('cc-active'));
			patientSwitch?.classList.remove('cc-active');
			patientBubbles.forEach(pb => pb.classList.add('cc-active'));
			
			updateFooterTerms();
		});
	});
}

function handlePatientSwitch() {
	switchLeft?.addEventListener('click', (e) => {
		e.preventDefault();
		switchToPreviousPatient();
	});
	switchRight?.addEventListener('click', (e) => {
		e.preventDefault();
		switchToNextPatient();
	});
}

function handlePageNavigation() {
	pageNavPrev?.addEventListener('click', (e) => {
		e.preventDefault();
		if (pageNavPrev.classList.contains('cc-disabled')) return;
		goToPreviousPage();
	});
	pageNavNext?.addEventListener('click', (e) => {
		e.preventDefault();
		if (pageNavNext.classList.contains('cc-disabled')) return;
		goToNextPage();
	});
}

function handleSavedSessionsButton() {
	const savedSessionsBtns = $$('#btn-saved-sessions');
	savedSessionsBtns.forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			openSavedSessionsModal();
		});
	});
}

function handleDeleteSessionConfirm() {
	const deleteBtn = $id('delete-saved-session');
	deleteBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		confirmDeleteSession();
	});
}

function handleDeleteSessionCancel() {
	const deleteBtn = $id('close-delete-saved-session');
	deleteBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		cancelDeleteSession();
	});
}

function handleNotesButton() {
	const notesBtn = $id('btn-notes');
	notesBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		openNotesModal();
	});
}

function handleAddNoteButton() {
	const addNoteBtn = $id('btn-add-note');
	addNoteBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		handleAddNote();
	});
	
	const textarea = $id('note');
	textarea?.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAddNote();
		}
	});
}

function handleSendEmailButtons() {
	// Handle header send email button
	const headerSendEmailBtn = $id('btn-modal-send-email');
	headerSendEmailBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		handleSendEmail();
	});
}

function handleSendEmailInput() {
	const emailInput = $id('send-email');
	emailInput?.addEventListener('input', () => {
		validateEmailInput();
	});
}

function handleSendEmailSubmitButton() {
	const sendButton = $id('btn-send-email');
	sendButton?.addEventListener('click', (e) => {
		e.preventDefault();
		if (!sendButton.classList.contains('cc-disabled')) {
			handleSendEmailSubmit();
		}
	});
}

function handleCloseSendEmailModal() {
	const sendEmailModal = $id('modal-send-email');
	const cancelButton = $id('close-send-email');
	
	// Handle cancel button click
	cancelButton?.addEventListener('click', (e) => {
		e.preventDefault();
		closeSendEmailModal();
	});
	
	// Handle close button (X) click - find within the send email modal
	const closeButton = sendEmailModal?.querySelector('.modal-close');
	closeButton?.addEventListener('click', (e) => {
		e.preventDefault();
		closeSendEmailModal();
	});
}

function closeSendEmailModal() {
	const sendEmailModal = $id('modal-send-email');
	const sessionsModal = $id('modal-saved-sessions');
	const modalOverlay = $('.modal-overlay');
	
	if (!sendEmailModal) return;
	
	// Check if we came from saved sessions modal
	const sessionId = sendEmailModal.getAttribute('data-session-id');
	
	if (sessionId) {
		// Restore saved sessions modal
		sessionsModal?.classList.remove('cc-backwards');
		modalOverlay?.classList.remove('cc-no-pointer');
		
		// Close send email modal
		sendEmailModal.classList.remove('cc-show');
	} else {
		// Not from saved sessions, close everything
		closeAllModals();
	}
}

function handleLogoutButton() {
	const logoutBtn = $id('btn-logout');
	logoutBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		
		logout();
	});
}


function addEventListeners() {
	handleScreenButtons();
	handlePatientSelection();
	handleClipboardClose();
	handlePatientSwitch();
	handleDiseaseStateToggle();
	handleDiseaseStateOther();
	handleDiseaseStateSelection();
	handlePageNavigation();
	handleChecklistItemClick();
	handleChecklistConfirm();
	handleFrequencyOtherToggle();
	handleSkipFrequency();
	handleAddCustomChecklistItem();
	handleCustomChecklistConfirm();
	handleSkipCustomFrequency();
	handleDeleteCustomTool();
	handleFinishSessionButton();
	handleCompleteSessionButtons();
	handleShowSummaryButton();
	handleSavedSessionsButton();
	handleDeleteSessionConfirm();
	handleDeleteSessionCancel();
	handleNotesButton();
	handleAddNoteButton();
	handleSendEmailButtons();
	handleSendEmailInput();
	handleSendEmailSubmitButton();
	handleCloseSendEmailModal();
	handleLogoutButton(); 
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
	initializePatients();
	checkValidUser();
	checkAndInitCarousels();
	addEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
