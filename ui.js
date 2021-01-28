$(async function() {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $userProfile = $('#user-profile');
	const $favoritedArticles = $('#favorited-articles');
	const $myArticles = $('#my-articles');

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

	$loginForm.on('submit', async function(evt) {
		$allStoriesList.hide();
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();

		loginAndSubmitForm();
		location.reload();
	});

	/**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

	$createAccountForm.on('submit', async function(evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
   * Log Out Functionality
   */

	$navLogOut.on('click', function() {
		// empty out local storage
		localStorage.clear();
		// change top bar for logout style
		$('.bar').hide();
		$('#nav-welcome').hide();
		$('#favorites').hide();
		$('#submit-story').hide();
		$('#my-stories').hide();
		$('#user-profile').hide();
		// $('#user-profile').show();
		$navLogOut.hide();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
   * Event Handler for Clicking Login
   */

	$navLogin.on('click', function() {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
   * Event handler for Navigation to Homepage
   */

	$('body').on('click', '#nav-all', async function() {
		location.reload();
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
   * A rendering function to run to reset the forms and hide the login info
   */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
   * A function to render HTML for an individual Story instance
   */

	function generateStoryHTML(story, trash) {
		// check if should include a star or a trash icon and act accordingly
		let hostName = getHostName(story.url);

		let isInFavorites = null;
		try {
			isInFavorites = currentUser.favorites.some((fav) => {
				return fav.storyId === story.storyId;
			});
		} catch (e) {}
		const farOrFas = isInFavorites
			? '<i class="star fas fa-star"></i>'
			: isInFavorites === false ? '<i class="star far fa-star"></i>' : '';
		const showTrash = trash ? '<i class="trash fas fa-trash"></i>' : '';
		// render story markup
		const storyMarkup = $(`
      <li id="${story.storyId}">
       ${farOrFas}
       ${showTrash}
        <a class="article-link" href="${story.url}" target="a_blank">
        <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
			$myArticles,
			$favoritedArticles
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$('#nav-user-profile').text(currentUser.username);
		$navLogin.hide();
		$navLogOut.show();
		$('.bar').show();
		$('#nav-welcome').show();
		$('#favorites').show();
		$('#submit-story').show();
		$('#my-stories').show();
		$('#user-profile').hide();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	// event listener for submit story
	$('#submit-story').on('click', () => {
		hideElements();
		$('#submit-form').show();
	});

	// event listener for submitting the new story
	$('#submit-form').submit(async function() {
		const author = $('#author').val();
		const title = $('#title').val();
		const url = $('#url').val();
		const newStory = { author, title, url };
		await StoryList.addStory(currentUser, newStory);
		$('#submit-form').trigger('reset');
		location.reload();
	});

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}

	// go to the user profile section hiding all others
	$('#nav-user-profile').on('click', () => {
		hideElements();
		$('#user-profile').show();
	});

	// go to the favorites section hiding all others
	$('#favorites').on('click', () => {
		hideElements();
		generateFavorites();
		$favoritedArticles.show();
	});

	// go to the my stories section hiding all others
	$('#my-stories').on('click', () => {
		generateMyStories();
		hideElements();
		$myArticles.show();
	});

	// function that filters through stories generating the ones you favorited and adding them to the favorite section
	async function generateFavorites() {
		document.querySelector('#favorited-articles').innerHTML = '';
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();
		const filterredList = storyList.stories.filter(function(indStory) {
			return currentUser.favorites.some((value) => {
				return value.storyId === indStory.storyId;
			});
		});
		// loop through all of our stories and generate HTML for them
		for (let story of filterredList) {
			const result = generateStoryHTML(story);
			$favoritedArticles.append(result);
		}
	}

	// function that filters through storis, generating the ones you made and adding them to my stories section
	async function generateMyStories() {
		document.querySelector('#my-articles').innerHTML = '';
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();
		const filterredList = storyList.stories.filter(function(indStory) {
			return indStory.username === currentUser.username;
		});
		// loop through all of our stories and generate HTML for them
		for (let story of filterredList) {
			const result = generateStoryHTML(story, true);
			$myArticles.append(result);
		}
	}

	// event for star and trash click
	$('body').on('click', async (event) => {
		if ($(event.target).hasClass('star')) {
			// toggle far and fas, all editFavorites function, and (if you are in favorites section), remove from favorites
			await $(event.target).toggleClass('far');
			await $(event.target).toggleClass('fas');
			await currentUser.editFavorites($(event.target).parent().attr('id'));
			if (
				$(event.target).hasClass('far') &&
				$(event.target).parent().parent().attr('id') === 'favorited-articles'
			) {
				await $(event.target).parent().remove();
			}
		} else if ($(event.target).hasClass('trash')) {
			// remove the story from the dom and call trashStory function
			$(event.target).parent().remove();
			currentUser.trashStory($(event.target).parent().attr('id'));
		}
	});
});
